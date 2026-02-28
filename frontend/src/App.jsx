import { useState } from 'react'
import PromptForm from './components/PromptForm'
import SafetyResult from './components/SafetyResult'
import './App.css'

function App() {
  const [result, setResult] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handlePromptSubmit = async (prompt) => {
    setIsLoading(true)
    try {
      // Your team member will handle the API integration here
      // The form will call this handler with the user's prompt
      console.log('Prompt submitted:', prompt)
      
      // Placeholder: Replace with actual API call to backend
      // const response = await fetch('/api/check', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ prompt })
      // })
      // const data = await response.json()
      // setResult(data)
    } catch (error) {
      console.error('Error checking safety:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearResult = () => {
    setResult(null)
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
          <SafetyResult result={result} onClear={handleClearResult} />
        </main>
      </div>
    </div>
  )
}

export default App
