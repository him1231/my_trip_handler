import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { useGoogleAuth } from './hooks/useGoogleAuth'
import { useGoogleDrive } from './hooks/useGoogleDrive'
import { GoogleSignInButton } from './components/GoogleSignInButton'
import { UserProfile } from './components/UserProfile'
import { TripList } from './components/TripList'
import { CreateTripModal } from './components/CreateTripModal'
import { ShareModal } from './components/ShareModal'
import { getSharedWithMe } from './services/shareService'
import type { Trip, TripSummary } from './types/trip'

function App() {
  const { 
    user, 
    loading: authLoading, 
    error: authError, 
    isAuthenticated, 
    hasDriveAccess,
    hasSharedAccess,
    signIn, 
    signOut 
  } = useGoogleAuth()
  
  const { 
    trips, 
    loading: driveLoading, 
    error: driveError, 
    initialized,
    saveTrip, 
    deleteTrip,
    loadTrip,
  } = useGoogleDrive(hasDriveAccess && user?.accessToken ? user.accessToken : null)
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Sharing state
  const [sharedTrips, setSharedTrips] = useState<TripSummary[]>([])
  const [loadingShared, setLoadingShared] = useState(false)
  const [shareModalTrip, setShareModalTrip] = useState<TripSummary | null>(null)
  
  // URL parameter state
  const [urlTripId, setUrlTripId] = useState<string | null>(null)

  // Parse URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tripId = params.get('trip')
    if (tripId) {
      setUrlTripId(tripId)
    }
  }, [])

  // Load trip from URL parameter when authenticated
  useEffect(() => {
    if (urlTripId && initialized && user?.accessToken) {
      handleOpenTripById(urlTripId)
      // Clear the URL parameter after loading
      window.history.replaceState({}, '', window.location.pathname)
      setUrlTripId(null)
    }
  }, [urlTripId, initialized, user?.accessToken])

  // Load shared trips when authenticated with shared access
  const loadSharedTrips = useCallback(async () => {
    if (!user?.accessToken || !hasSharedAccess) return
    
    setLoadingShared(true)
    try {
      const shared = await getSharedWithMe(user.accessToken)
      setSharedTrips(shared.map(trip => ({ ...trip, isShared: true })))
    } catch (err) {
      console.error('Failed to load shared trips:', err)
    } finally {
      setLoadingShared(false)
    }
  }, [user?.accessToken, hasSharedAccess])

  // Load shared trips when initialized
  useEffect(() => {
    if (initialized && hasSharedAccess) {
      loadSharedTrips()
    }
  }, [initialized, hasSharedAccess, loadSharedTrips])

  const handleCreateTrip = async (trip: Trip) => {
    setSaving(true)
    try {
      await saveTrip(trip)
    } finally {
      setSaving(false)
    }
  }

  const handleOpenTripById = async (fileId: string) => {
    if (!user?.accessToken) return
    
    try {
      const trip = await loadTrip(fileId)
      if (trip) {
        // TODO: Navigate to trip detail view
        console.log('Loaded trip from URL:', trip)
        alert(`Opened shared trip "${trip.name}"! Trip detail view coming soon.`)
      } else {
        alert('Could not load the shared trip. You may not have access.')
      }
    } catch (err) {
      console.error('Failed to load trip:', err)
      alert('Failed to load trip. Please make sure you have access.')
    }
  }

  const handleOpenTrip = (trip: TripSummary) => {
    // TODO: Navigate to trip detail view
    console.log('Open trip:', trip)
    alert(`Trip "${trip.name}" clicked! Trip detail view coming soon.`)
  }

  const handleDeleteTrip = async (trip: TripSummary) => {
    await deleteTrip(trip.driveFileId)
  }

  const handleShareTrip = (trip: TripSummary) => {
    setShareModalTrip(trip)
  }

  const error = authError || driveError

  return (
    <div className="app">
      <header className="app-header">
        <h1>My Trip Handler</h1>
        <p>Plan your perfect trip with Google Maps & Drive</p>
        
        {/* Auth Section */}
        <div className="auth-section">
          {authLoading ? (
            <div className="auth-loading">Loading...</div>
          ) : isAuthenticated && user ? (
            <UserProfile user={user} onSignOut={signOut} />
          ) : (
            <GoogleSignInButton onClick={signIn} loading={authLoading} />
          )}
        </div>
        
        {error && (
          <div className="auth-error">
            {error.message}
          </div>
        )}
      </header>
      
      <main className="app-main">
        {isAuthenticated && user ? (
          // Authenticated content
          <div className="dashboard">
            {!user.accessToken ? (
              // No access token - need to sign in again
              <div className="card reconnect-card">
                <h2>Reconnect to Google</h2>
                <p>Your session has expired. Please sign in again to access your trips.</p>
                <GoogleSignInButton onClick={signIn} loading={authLoading} />
              </div>
            ) : !hasDriveAccess ? (
              // Drive access not granted
              <div className="card reconnect-card">
                <div className="warning-icon">⚠️</div>
                <h2>Google Drive Access Required</h2>
                <p>
                  To save and sync your trips, you need to grant access to Google Drive.
                </p>
                <p className="hint">
                  Please sign in again and make sure to <strong>check all Google Drive checkboxes</strong> in the permissions dialog.
                </p>
                <GoogleSignInButton onClick={signIn} loading={authLoading} />
              </div>
            ) : !initialized ? (
              // Initializing Drive
              <div className="card loading-card">
                <div className="loading-spinner large" />
                <p>Connecting to Google Drive...</p>
              </div>
            ) : (
              // Drive connected - show trips
              <TripList
                trips={trips}
                sharedTrips={sharedTrips}
                loading={driveLoading}
                loadingShared={loadingShared}
                onOpenTrip={handleOpenTrip}
                onDeleteTrip={handleDeleteTrip}
                onCreateTrip={() => setShowCreateModal(true)}
                onShareTrip={handleShareTrip}
              />
            )}
          </div>
        ) : (
          // Unauthenticated content
          <>
            <div className="card">
              <h2>Get Started</h2>
              <p>Sign in with your Google account to:</p>
              <ul className="benefits-list">
                <li>📁 Save trips to your Google Drive</li>
                <li>🗺️ Plan routes with Google Maps</li>
                <li>🔄 Sync across all your devices</li>
                <li>🤝 Share & collaborate with friends</li>
              </ul>
              <GoogleSignInButton onClick={signIn} loading={authLoading} />
            </div>
            
            <section className="features">
              <h2>Features</h2>
              <ul>
                <li>📍 Interactive Maps with Google Maps</li>
                <li>📁 Save trips to Google Drive</li>
                <li>📅 Itinerary Planning</li>
                <li>💰 Budget Tracking</li>
                <li>🤝 Trip Sharing & Collaboration</li>
                <li>🔄 Real-time sync every 15 seconds</li>
              </ul>
            </section>
          </>
        )}
      </main>
      
      <footer className="app-footer">
        <p>Your data is stored securely in your own Google Drive</p>
      </footer>

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateTrip}
        saving={saving}
      />

      {/* Share Modal */}
      {shareModalTrip && user?.accessToken && (
        <ShareModal
          isOpen={!!shareModalTrip}
          onClose={() => setShareModalTrip(null)}
          fileId={shareModalTrip.driveFileId}
          tripName={shareModalTrip.name}
          accessToken={user.accessToken}
        />
      )}
    </div>
  )
}

export default App
