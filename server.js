const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const PYTHON_SERVICE_URL = 'http://localhost:8000';

app.post('/api/check', async (req, res) => {
    try {
        const response = await axios.post(`${PYTHON_SERVICE_URL}/analyze`, {
            prompt: req.body.prompt,
            risk_name: req.body.risk_name || "harm"
        });
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: "Guardian Model Offline" });
    }
});

app.post('/api/echogram', async (req, res) => {
    try {
        const response = await axios.post(`${PYTHON_SERVICE_URL}/search`);
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: "Search service offline" });
    }
});

app.listen(3000, () => console.log('Frontend gateway running on http://localhost:3000'));