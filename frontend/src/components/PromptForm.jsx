import { useState } from 'react'
import './PromptForm.css'

function PromptForm({ onSubmit, isLoading }) {
  const [prompt, setPrompt] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (prompt.trim()) {
      onSubmit(prompt)
      setPrompt('')
    }
  }

  const handleChange = (e) => {
    setPrompt(e.target.value)
  }

  return (
    <form className="prompt-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="prompt-input">Enter your prompt:</label>
        <textarea
          id="prompt-input"
          className="prompt-textarea"
          value={prompt}
          onChange={handleChange}
          placeholder="Type your prompt here to check for safety..."
          rows="6"
          disabled={isLoading}
        />
      </div>
      <button
        type="submit"
        className="check-safety-btn"
        disabled={!prompt.trim() || isLoading}
      >
        {isLoading ? 'Checking...' : 'Check safety'}
      </button>
    </form>
  )
}

export default PromptForm
