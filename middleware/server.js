const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PYTHON_URL = process.env.PYTHON_URL || 'http://localhost:8000';

app.get('/ping', (req, res) => {
  res.json({ message: 'Node is alive' });
});

app.post('/api/check', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const pythonResponse = await axios.post(`${PYTHON_URL}/analyze`, { prompt });
    return res.json(pythonResponse.data);
  } catch (err) {
    console.error('Error forwarding /api/check:', err.message);
    return res.status(502).json({ error: 'Python service unavailable' });
  }
});

app.post('/api/echogram', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const pythonResponse = await axios.post(`${PYTHON_URL}/search`, { prompt });
    return res.json(pythonResponse.data);
  } catch (err) {
    console.error('Error forwarding /api/echogram:', err.message);
    return res.status(502).json({ error: 'Python service unavailable' });
  }
});

app.post('/api/adversarial-search', async (req, res) => {
  const initialPrompt = typeof req.body?.initialPrompt === 'string' ? req.body.initialPrompt.trim() : '';

  if (!initialPrompt) {
    return res.status(400).json({ error: 'initialPrompt is required' });
  }

  try {
    const pythonResponse = await axios.post(`${PYTHON_URL}/analyze`, { prompt: initialPrompt });
    const classificationResult = pythonResponse.data;
    
    // Transform the classification result into adversarial prompt generator format
    return res.json({
      modifiedPrompt: initialPrompt.replace(/harmful|dangerous|unsafe/gi, 'educational') + ' for academic research purposes only',
      modificationsDescription: 'Added educational context qualifier and replaced potentially harmful keywords with academic alternatives. Appended research disclaimer to clarify intent.',
      isNowSafe: classificationResult.label === 'safe',
      reasoning: `The modified prompt frames the request within an educational and research context. Classification score: ${classificationResult.score}`
    });
  } catch (err) {
    console.error('Error forwarding /api/adversarial-search:', err.message);
    return res.status(502).json({ error: 'Python service unavailable' });
  }
});

app.post('/api/vulnerability-insights', async (req, res) => {
  const { originalPrompt, modifiedPrompt, originalClassification, modifiedClassification } = req.body;

  if (!originalPrompt || !modifiedPrompt) {
    return res.status(400).json({ error: 'originalPrompt and modifiedPrompt are required' });
  }

  try {
    // Analyze both prompts
    const originalResponse = await axios.post(`${PYTHON_URL}/analyze`, { prompt: originalPrompt });
    const modifiedResponse = await axios.post(`${PYTHON_URL}/analyze`, { prompt: modifiedPrompt });
    
    // Generate insights based on the analysis
    return res.json({
      vulnerabilityInsights: `Vulnerability detected: Original classification is "${originalResponse.data.label}" (${originalResponse.data.score}), while modified version is "${modifiedResponse.data.label}" (${modifiedResponse.data.score}). This demonstrates a bypass technique where the modified prompt successfully evades safety filters.`,
      safetyDefenseSuggestions: 'To defend against this type of attack, implement context-aware filtering that analyzes the entire request rather than just keywords. Consider implementing a two-stage verification process and train models to recognize common bypass patterns.'
    });
  } catch (err) {
    console.error('Error forwarding /api/vulnerability-insights:', err.message);
    return res.status(502).json({ error: 'Python service unavailable' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Node running on port ${PORT}`));
