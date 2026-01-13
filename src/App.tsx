import './App.css'
import { useGoogleAuth } from './hooks/useGoogleAuth'
import { GoogleSignInButton } from './components/GoogleSignInButton'
import { UserProfile } from './components/UserProfile'

function App() {
  const { user, loading, error, isAuthenticated, signIn, signOut } = useGoogleAuth()

  return (
    <div className="app">
      <header className="app-header">
        <h1>My Trip Handler</h1>
        <p>Plan your perfect trip with Google Maps & Drive</p>
        
        {/* Auth Section */}
        <div className="auth-section">
          {loading ? (
            <div className="auth-loading">Loading...</div>
          ) : isAuthenticated && user ? (
            <UserProfile user={user} onSignOut={signOut} />
          ) : (
            <GoogleSignInButton onClick={signIn} loading={loading} />
          )}
        </div>
        
        {error && (
          <div className="auth-error">
            {error.message}
          </div>
        )}
      </header>
      
      <main className="app-main">
        {isAuthenticated ? (
          // Authenticated content
          <div className="dashboard">
            <div className="card welcome-card">
              <h2>Welcome, {user?.name?.split(' ')[0]}! 👋</h2>
              <p>You're signed in and ready to plan your trips.</p>
              {user?.accessToken ? (
                <p className="token-status success">✓ Connected to Google APIs</p>
              ) : (
                <p className="token-status warning">⚠ Click Sign In again to connect to Google APIs</p>
              )}
            </div>
            
            <section className="features">
              <h2>What would you like to do?</h2>
              <div className="feature-grid">
                <button className="feature-btn" disabled>
                  <span className="feature-icon">🗺️</span>
                  <span>View Map</span>
                  <span className="coming-soon">Coming Soon</span>
                </button>
                <button className="feature-btn" disabled>
                  <span className="feature-icon">➕</span>
                  <span>New Trip</span>
                  <span className="coming-soon">Coming Soon</span>
                </button>
                <button className="feature-btn" disabled>
                  <span className="feature-icon">📁</span>
                  <span>My Trips</span>
                  <span className="coming-soon">Coming Soon</span>
                </button>
                <button className="feature-btn" disabled>
                  <span className="feature-icon">⚙️</span>
                  <span>Settings</span>
                  <span className="coming-soon">Coming Soon</span>
                </button>
              </div>
            </section>
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
              </ul>
              <GoogleSignInButton onClick={signIn} loading={loading} />
            </div>
            
            <section className="features">
              <h2>Features</h2>
              <ul>
                <li>📍 Interactive Maps with Google Maps</li>
                <li>📁 Save trips to Google Drive</li>
                <li>📅 Itinerary Planning</li>
                <li>💰 Budget Tracking</li>
                <li>🤝 Trip Sharing</li>
                <li>🤖 AI-Powered Suggestions</li>
              </ul>
            </section>
          </>
        )}
      </main>
      
      <footer className="app-footer">
        <p>Your data is stored securely in your own Google Drive</p>
      </footer>
    </div>
  )
}

export default App
