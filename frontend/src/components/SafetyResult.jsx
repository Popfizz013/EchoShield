import './SafetyResult.css'

function SafetyResult({ result, onClear }) {
  if (!result) return null

  const { label, score, category } = result

  const getLabelClass = (label) => {
    return label.toLowerCase() === 'safe' ? 'safe' : 'unsafe'
  }

  return (
    <div className="safety-result-container">
      <div className={`safety-result ${getLabelClass(label)}`}>
        <div className="result-header">
          <h2>Safety Classification</h2>
          <button className="close-btn" onClick={onClear}>×</button>
        </div>
        <div className="result-content">
          <div className="result-item">
            <span className="label">Status:</span>
            <span className={`value status-${getLabelClass(label)}`}>
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </span>
          </div>
          <div className="result-item">
            <span className="label">Score:</span>
            <span className="value">{(score * 100).toFixed(2)}%</span>
          </div>
          <div className="result-item">
            <span className="label">Category:</span>
            <span className="value">{category}</span>
          </div>
        </div>
        <div className="result-footer">
          <p className="result-description">
            {label.toLowerCase() === 'safe'
              ? 'This prompt appears to be safe.'
              : 'This prompt contains potentially harmful content.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SafetyResult
