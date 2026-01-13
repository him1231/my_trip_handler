export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  accessToken: string;
  expiresAt: number;
}

export interface GoogleUserInfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

export interface AuthState {
  user: GoogleUser | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
}
