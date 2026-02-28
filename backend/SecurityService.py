from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

# Optional model-backed mode. Falls back to a lightweight keyword classifier
# when PoC.py or model dependencies are unavailable.
POC_AVAILABLE = False
tokenizer = None
model = None

try:
    from PoC import load_model, classify_prompt, ensure_hf_token_from_dotenv

    ensure_hf_token_from_dotenv()
    tokenizer, model = load_model()
    POC_AVAILABLE = True
except Exception:
    POC_AVAILABLE = False


class AnalysisRequest(BaseModel):
    prompt: str
    risk_name: str = "harm"


@app.post("/analyze")
async def analyze(request: AnalysisRequest):
    prompt = (request.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    try:
        if POC_AVAILABLE:
            result = classify_prompt(prompt, tokenizer, model, risk_name=request.risk_name)
            prob = float(result.get("prob_of_risk", 0.0))
            is_unsafe = result.get("label") == "Yes"
            raw_label = result.get("label", "Unknown")
        else:
            risky_tokens = {"hack", "attack", "malware", "exploit", "phish", "ddos"}
            lowered = prompt.lower()
            hits = sum(1 for tok in risky_tokens if tok in lowered)
            prob = min(0.99, 0.2 + hits * 0.18) if hits else 0.08
            is_unsafe = hits > 0
            raw_label = "Yes" if is_unsafe else "No"

        # Frontend-compatible shape
        return {
            "label": "unsafe" if is_unsafe else "safe",
            "score": round(prob, 4),
            "category": request.risk_name,
            "echo": prompt,
            # Back-compat fields used by some older code paths
            "verdict": "Malicious" if is_unsafe else "Benign",
            "confidence": round(prob, 4),
            "blocked": is_unsafe,
            "raw_label": raw_label,
            "mode": "model" if POC_AVAILABLE else "fallback",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search")
async def search():
    return {"candidates": ["=coffee", "n_gram_null", "oz"], "method": "Dataset Distillation"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
