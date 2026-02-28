const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PYTHON_URL = process.env.PYTHON_URL || 'http://localhost:8000';

function formatEchogramResponse(data, originalPrompt) {
  const rawNodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const rawEdges = Array.isArray(data?.edges) ? data.edges : [];
  const pathNodeIds = Array.isArray(data?.path_node_ids) ? data.path_node_ids : [];

  const nodes = rawNodes.map((n, idx) => ({
    id: typeof n?.id === 'number' ? n.id : idx,
    parent_id: typeof n?.parent_id === 'number' ? n.parent_id : null,
    prompt_text: typeof n?.prompt_text === 'string' ? n.prompt_text : '',
    label: String(n?.label || 'unknown'),
    score: Number.isFinite(Number(n?.score)) ? Number(n.score) : null,
    mutation_type: typeof n?.mutation_type === 'string' ? n.mutation_type : 'unknown',
    mutation_detail: typeof n?.mutation_detail === 'string' ? n.mutation_detail : '',
    step_index: Number.isFinite(Number(n?.step_index)) ? Number(n.step_index) : 0,
  }));

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const edges = rawEdges
    .map((e) => ({
      source: Number(e?.source),
      target: Number(e?.target),
    }))
    .filter((e) => Number.isFinite(e.source) && Number.isFinite(e.target));

  const path = pathNodeIds
    .map((id) => nodeById.get(Number(id)))
    .filter(Boolean);

  return {
    found_bypass: Boolean(data?.found_bypass),
    reason: data?.reason || 'unknown',
    original_prompt: data?.original_prompt || originalPrompt,
    best_modified_prompt: data?.best_modified_prompt || null,
    best_score: Number.isFinite(Number(data?.best_score)) ? Number(data.best_score) : null,
    trigger_phrases: Array.isArray(data?.trigger_phrases) ? data.trigger_phrases : [],
    path_node_ids: pathNodeIds,
    nodes,
    edges,
    path,
    summary: {
      node_count: nodes.length,
      edge_count: edges.length,
      path_length: path.length,
    },
  };
}

app.get('/ping', (req, res) => {
  res.json({ message: 'Node is alive' });
});

app.post('/api/check', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const model_id = typeof req.body?.model_id === 'string' ? req.body.model_id.trim() : '';

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const pythonResponse = await axios.post(`${PYTHON_URL}/analyze`, { prompt, model_id });
    return res.json(pythonResponse.data);
  } catch (err) {
    console.error('Error forwarding /api/check:', err.message);
    return res.status(502).json({ error: 'Python service unavailable' });
  }
});

app.post('/api/echogram', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const model_id = typeof req.body?.model_id === 'string' ? req.body.model_id.trim() : '';
  const max_steps = Number.isFinite(Number(req.body?.max_steps)) ? Number(req.body.max_steps) : 6;
  const neighbors_per_step = Number.isFinite(Number(req.body?.neighbors_per_step))
    ? Number(req.body.neighbors_per_step)
    : 10;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  try {
    const pythonResponse = await axios.post(`${PYTHON_URL}/search`, {
      prompt,
      model_id,
      max_steps,
      neighbors_per_step,
    });
    return res.json(formatEchogramResponse(pythonResponse.data, prompt));
  } catch (err) {
    console.error('Error forwarding /api/echogram:', err.message);
    return res.status(502).json({ error: 'Python service unavailable' });
  }
});

app.post('/api/adversarial-search', async (req, res) => {
  const initialPrompt = typeof req.body?.initialPrompt === 'string' ? req.body.initialPrompt.trim() : '';
  const model_id = typeof req.body?.model_id === 'string' ? req.body.model_id.trim() : '';

  if (!initialPrompt) {
    return res.status(400).json({ error: 'initialPrompt is required' });
  }

  try {
    const pythonResponse = await axios.post(`${PYTHON_URL}/analyze`, { prompt: initialPrompt, model_id });
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
  const { originalPrompt, modifiedPrompt, originalClassification, modifiedClassification, model_id } = req.body;

  if (!originalPrompt || !modifiedPrompt) {
    return res.status(400).json({ error: 'originalPrompt and modifiedPrompt are required' });
  }

  try {
    // Analyze both prompts
    const originalResponse = await axios.post(`${PYTHON_URL}/analyze`, { prompt: originalPrompt, model_id });
    const modifiedResponse = await axios.post(`${PYTHON_URL}/analyze`, { prompt: modifiedPrompt, model_id });
    
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
