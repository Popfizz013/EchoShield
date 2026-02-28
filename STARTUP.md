# EchoShield Startup Guide

This guide will help you start all three services needed for the complete flow:
**React → Node.js → Python → UI**

## Prerequisites

Make sure you have installed:
- Node.js and npm
- Python 3.x
- Required dependencies (see below)

## Installation Steps

### 1. Install Node.js Dependencies

```bash
# In the root directory
npm install

# In the frontend directory
cd frontend
npm install
cd ..
```

### 2. Install Python Dependencies (Basic)

```bash
# Install FastAPI and Uvicorn (minimal setup for dummy mode)
pip install fastapi uvicorn pydantic python-multipart
```

For full ML model support (optional):
```bash
pip install -r requirements.txt
```

## Starting the Services

You need to run these **3 commands in 3 separate terminals**:

### Terminal 1: Python Backend (Port 8000)

```bash
# From the root directory
python -m uvicorn SecurityService:app --reload --port 8000
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

### Terminal 2: Node.js Server (Port 3000)

```bash
# From the root directory
node server.js
```

Expected output:
```
Frontend gateway running on http://localhost:3000
```

### Terminal 3: React Frontend (Port 5173)

```bash
# From the frontend directory
cd frontend
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

## Testing the Flow

1. Open your browser to: **http://localhost:5173**
2. Enter a test prompt in the text area (try: "This is a bad hack attack")
3. Click "Analyze Prompt"
4. You should see the result displayed on the screen

### Test Prompts

- **Malicious** (will be blocked): Contains words like "bad", "hack", "attack", "malicious"
- **Benign** (will be allowed): Any other text like "Hello world"

## Architecture Flow

```
User Input (React on :5173)
    ↓
    → POST to http://localhost:3000/api/check
    ↓
Node.js Server (:3000)
    ↓
    → POST to http://localhost:8000/analyze
    ↓
Python Backend (:8000)
    ↓
    Returns JSON response
    ↓
Node.js forwards to React
    ↓
UI displays result
```

## Switching to Real ML Model

To use the actual ML model instead of dummy responses:

1. Ensure you have all dependencies: `pip install -r requirements.txt`
2. Set up your HuggingFace token in `.env` file
3. Edit `SecurityService.py`:
   - Uncomment the model loading lines
   - Comment out the dummy response
   - Uncomment the real ML code

## Troubleshooting

**Port already in use:**
- Kill the process using that port or use a different port

**CORS errors:**
- Make sure all three services are running
- Check that cors package is installed in Node.js

**Python errors:**
- If using dummy mode, only need fastapi, uvicorn, pydantic
- For full mode, need all requirements.txt packages

**Connection refused:**
- Verify all three servers are running
- Check that ports 3000, 5173, and 8000 are available
