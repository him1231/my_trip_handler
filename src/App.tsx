import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { useGoogleAuth } from './hooks/useGoogleAuth'
import { useGoogleDrive } from './hooks/useGoogleDrive'
import { GoogleSignInButton } from './components/GoogleSignInButton'
import { UserProfile } from './components/UserProfile'
import { TripList } from './components/TripList'
import { CreateTripModal } from './components/CreateTripModal'
import { ShareModal } from './components/ShareModal'
import { TripDetailView } from './components/TripDetailView'
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
    refreshTrips,
  } = useGoogleDrive(hasDriveAccess && user?.accessToken ? user.accessToken : null)
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // Sharing state
  const [sharedTrips, setSharedTrips] = useState<TripSummary[]>([])
  const [loadingShared, setLoadingShared] = useState(false)
  const [shareModalTrip, setShareModalTrip] = useState<TripSummary | null>(null)
  
  // Trip detail view state
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [detailSaving, setDetailSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // URL parameter state
  const [urlTripId, setUrlTripId] = useState<string | null>(() => {
    // Parse URL parameters on initial render
    const params = new URLSearchParams(window.location.search)
    return params.get('trip')
  })
  const [urlTripProcessed, setUrlTripProcessed] = useState(false)

  // Load trip from URL parameter when authenticated
  useEffect(() => {
    const openTripFromUrl = async () => {
      if (!urlTripId || urlTripProcessed || !initialized || !user?.accessToken) return
      
      setUrlTripProcessed(true)
      console.log('Opening trip from URL:', urlTripId)
      
      try {
        const trip = await loadTrip(urlTripId)
        if (trip) {
          console.log('Loaded trip from URL:', trip)
          setSelectedTrip(trip)
        } else {
          alert('Could not load the shared trip. You may not have access.')
        }
      } catch (err) {
        console.error('Failed to load trip:', err)
        alert('Failed to load trip. Please make sure you have access.')
      }
      
      // Clear the URL parameter after loading
      const basePath = import.meta.env.BASE_URL || '/'
      window.history.replaceState({}, '', basePath)
      setUrlTripId(null)
    }
    
    openTripFromUrl()
  }, [urlTripId, urlTripProcessed, initialized, user?.accessToken, loadTrip])

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

  const handleOpenTrip = async (tripSummary: TripSummary) => {
    // Load full trip data
    try {
      const trip = await loadTrip(tripSummary.driveFileId)
      if (trip) {
        setSelectedTrip(trip)
      } else {
        alert('Could not load trip data.')
      }
    } catch (err) {
      console.error('Failed to load trip:', err)
      alert('Failed to load trip.')
    }
  }

  const handleCloseDetail = () => {
    setSelectedTrip(null)
    setLastSaved(null)
    // Refresh trips list to get any updates
    refreshTrips()
  }

  const handleSaveTrip = async (trip: Trip) => {
    setDetailSaving(true)
    try {
      await saveTrip(trip)
      setLastSaved(new Date())
      // Update the selected trip with latest data
      setSelectedTrip(trip)
    } catch (err) {
      console.error('Failed to save trip:', err)
    } finally {
      setDetailSaving(false)
    }
  }

  const handleShareFromDetail = () => {
    if (selectedTrip?.driveFileId) {
      setShareModalTrip({
        id: selectedTrip.id,
        name: selectedTrip.name,
        driveFileId: selectedTrip.driveFileId,
        startDate: selectedTrip.startDate,
        endDate: selectedTrip.endDate,
        destinationCount: selectedTrip.destinations.length,
      })
    }
  }

  const handleDeleteTrip = async (trip: TripSummary) => {
    await deleteTrip(trip.driveFileId)
  }

  const handleShareTrip = (trip: TripSummary) => {
    setShareModalTrip(trip)
  }

  const error = authError || driveError

  return (
    <>
      {/* Show trip detail view if a trip is selected */}
      {selectedTrip ? (
        <>
          <TripDetailView
            trip={selectedTrip}
            onClose={handleCloseDetail}
            onSave={handleSaveTrip}
            onShare={selectedTrip.driveFileId ? handleShareFromDetail : undefined}
            isSaving={detailSaving}
            lastSaved={lastSaved}
          />
        </>
      ) : (
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
      )}
      
      {/* Share Modal (available from both views) */}
      {shareModalTrip && user?.accessToken && (
        <ShareModal
          isOpen={!!shareModalTrip}
          onClose={() => setShareModalTrip(null)}
          fileId={shareModalTrip.driveFileId}
          tripName={shareModalTrip.name}
          accessToken={user.accessToken}
        />
      )}
    </>
  )
}

export default App
