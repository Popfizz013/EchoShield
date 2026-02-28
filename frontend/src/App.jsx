import { useState } from 'react'
import PromptForm from './components/PromptForm'
import SafetyResult from './components/SafetyResult'
import './App.css'

function App() {
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePromptSubmit = async (prompt) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error('Error checking safety:', err)
      setResult(null)
      setError('Unable to reach backend. Make sure Node and Python services are running.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearResult = () => {
    setResult(null)
    setError('')
  }

  return (
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <h1>EchoShield</h1>
          <p className="app-subtitle">AI Security Visualization Tool</p>
          <p className="app-description">
            Submit a prompt to check its safety classification
          </p>
        </header>

        <main className="app-main">
          <PromptForm onSubmit={handlePromptSubmit} isLoading={isLoading} />
          {error && <p className="error-text">{error}</p>}
          <SafetyResult result={result} onClear={handleClearResult} />
        </main>
      </div>
    </div>
  )
}

export default App
