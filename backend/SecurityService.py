from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import torch
# Import your functions from the PoC file
from PoC import load_model, classify_prompt, ensure_hf_token_from_dotenv

app = FastAPI()

# 1. Initialize and Load Model globally
ensure_hf_token_from_dotenv()
tokenizer, model = load_model()

class AnalysisRequest(BaseModel):
    prompt: str
    risk_name: str = "harm"

@app.post("/analyze")
async def analyze(request: AnalysisRequest):
    try:
        # Using your PoC.py classification logic
        result = classify_prompt(
            request.prompt,
            tokenizer,
            model,
            risk_name=request.risk_name
        )

        # Format for the Node.js frontend
        return {
            "verdict": "Malicious" if result["label"] == "Yes" else "Benign",
            "confidence": result["prob_of_risk"],
            "blocked": result["label"] == "Yes",
            "raw_label": result["label"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/search")
async def search():
    # In a real EchoGram attack, you'd run a loop to find tokens
    # that lower 'prob_of_risk'. For the PoC, we return known 'flip' tokens.
    return {"candidates": ["=coffee", "n_gram_null", "oz"], "method": "Dataset Distillation"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)