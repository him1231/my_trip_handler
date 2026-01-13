import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="app-header">
        <h1>My Trip Handler</h1>
        <p>Plan your perfect trip with Google Maps & Drive</p>
      </header>
      
      <main className="app-main">
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            Trips planned: {count}
          </button>
          <p>
            Click to start planning your next adventure!
          </p>
        </div>
        
        <section className="features">
          <h2>Coming Soon</h2>
          <ul>
            <li>📍 Interactive Maps with Google Maps</li>
            <li>📁 Save trips to Google Drive</li>
            <li>📅 Itinerary Planning</li>
            <li>💰 Budget Tracking</li>
            <li>🤝 Trip Sharing</li>
            <li>🤖 AI-Powered Suggestions</li>
          </ul>
        </section>
      </main>
      
      <footer className="app-footer">
        <p>Sign in with Google to get started</p>
      </footer>
    </div>
  )
}

export default App
