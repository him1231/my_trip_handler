import { useState, useCallback, useEffect, useRef } from 'react';
import type { GoogleUser, GoogleUserInfo } from '../types/auth';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Scopes: drive.file for own files, drive.readonly for shared files
const SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const STORAGE_KEY = 'gauth_user';

interface UseGoogleAuthReturn {
  user: GoogleUser | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  hasDriveAccess: boolean;
  hasSharedAccess: boolean;
  signIn: () => void;
  signOut: () => void;
}

export const useGoogleAuth = (): UseGoogleAuthReturn => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasDriveAccess, setHasDriveAccess] = useState(false);
  const [hasSharedAccess, setHasSharedAccess] = useState(false);
  const tokenClientRef = useRef<google.accounts.oauth2.TokenClient | null>(null);
  const isInitializedRef = useRef(false);
  const silentRefreshAttemptedRef = useRef(false);

  // Fetch user info from Google
  const fetchUserInfo = useCallback(async (accessToken: string, expiresIn: number, grantedScopes: string) => {
    try {
      // Check which scopes were granted
      const driveFileGranted = grantedScopes.includes(DRIVE_FILE_SCOPE);
      const driveReadonlyGranted = grantedScopes.includes(DRIVE_READONLY_SCOPE);
      
      setHasDriveAccess(driveFileGranted);
      setHasSharedAccess(driveReadonlyGranted);

      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userInfo: GoogleUserInfo = await response.json();
      
      const googleUser: GoogleUser = {
        id: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        accessToken,
        expiresAt: Date.now() + expiresIn * 1000,
      };

      setUser(googleUser);
      
      // Set error message if Drive access was not granted (but still sign them in)
      if (!driveFileGranted) {
        setError(new Error('Google Drive access not granted. Please sign in again and check all Google Drive checkboxes to use all features.'));
      } else {
        setError(null);
      }
      
      // Store user info in localStorage for persistent login
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        hasDriveAccess: driveFileGranted,
        hasSharedAccess: driveReadonlyGranted,
      }));
      
      return googleUser;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user info');
      setError(error);
      throw error;
    }
  }, []);

  // Try silent token refresh (no popup)
  const trySilentRefresh = useCallback(() => {
    if (!tokenClientRef.current || silentRefreshAttemptedRef.current) return;
    
    silentRefreshAttemptedRef.current = true;
    console.log('Attempting silent token refresh...');
    
    // Request token without prompt - will succeed if user previously consented
    tokenClientRef.current.requestAccessToken({ prompt: '' });
  }, []);

  // Initialize the token client
  const initializeClient = useCallback(() => {
    if (!window.google || isInitializedRef.current) return;

    try {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
          if (response.error) {
            // Silent refresh failed - this is expected if user hasn't consented before
            // or if the session expired
            console.log('Token request failed:', response.error);
            
            // Clear cached user if silent refresh failed
            if (silentRefreshAttemptedRef.current) {
              // Don't show error for silent refresh failures
              setLoading(false);
              return;
            }
            
            setError(new Error(response.error_description || response.error));
            setLoading(false);
            return;
          }

          try {
            // Pass the granted scopes to verify Drive access
            await fetchUserInfo(response.access_token, response.expires_in, response.scope);
            console.log('Token refresh successful');
          } catch {
            // Error already set in fetchUserInfo
          } finally {
            setLoading(false);
          }
        },
        error_callback: (err) => {
          console.log('OAuth error:', err.message);
          // Don't show error for silent refresh failures
          if (!silentRefreshAttemptedRef.current) {
            setError(new Error(err.message || 'OAuth error'));
          }
          setLoading(false);
        },
      });

      isInitializedRef.current = true;
      
      // Check for cached user and attempt silent refresh
      const cachedUser = localStorage.getItem(STORAGE_KEY);
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          // Set user info immediately for better UX (shows profile while refreshing)
          setUser({
            ...parsed,
            accessToken: '',
            expiresAt: 0,
          });
          setHasDriveAccess(parsed.hasDriveAccess || false);
          setHasSharedAccess(parsed.hasSharedAccess || false);
          
          // Try to silently refresh the token
          trySilentRefresh();
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize Google Auth'));
      setLoading(false);
    }
  }, [fetchUserInfo, trySilentRefresh]);

  // Wait for Google Identity Services to load
  useEffect(() => {
    const checkGoogle = () => {
      if (window.google?.accounts?.oauth2) {
        initializeClient();
      } else {
        // Retry after a short delay
        setTimeout(checkGoogle, 100);
      }
    };

    checkGoogle();
  }, [initializeClient]);

  const signIn = useCallback(() => {
    if (!tokenClientRef.current) {
      setError(new Error('Google Auth not initialized'));
      return;
    }

    setLoading(true);
    setError(null);
    silentRefreshAttemptedRef.current = false; // Reset for explicit sign in
    
    // Request access token - this opens the Google sign-in popup
    // Using 'consent' to always show the consent screen so user can grant permissions
    tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
  }, []);

  const signOut = useCallback(() => {
    if (user?.accessToken) {
      // Revoke the token
      window.google?.accounts.oauth2.revoke(user.accessToken, () => {
        console.log('Token revoked');
      });
    }

    setUser(null);
    setError(null);
    setHasDriveAccess(false);
    setHasSharedAccess(false);
    silentRefreshAttemptedRef.current = false;
    localStorage.removeItem(STORAGE_KEY);
  }, [user?.accessToken]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    hasDriveAccess,
    hasSharedAccess,
    signIn,
    signOut,
  };
};
