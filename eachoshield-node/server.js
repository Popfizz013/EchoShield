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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Node running on port ${PORT}`));
