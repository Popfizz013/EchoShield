from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import time
import os
import sys
import io
import logging
import threading
import requests
from contextlib import contextmanager
import math

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, PreTrainedTokenizerBase, BatchEncoding

from echogram_engine import EchogramSearch, PromptMutator
from query import GuardrailModels, create_safety_evaluator

HOST = '0.0.0.0'
PORT = 8000

DEFAULT_MODEL_ID = GuardrailModels.GRANITE_GUARDIAN_3_0_2B.model_id
_EVALUATOR_CACHE: dict[str, callable] = {}

# Model constants (from PoC)
GRANITE_MODEL = "ibm-granite/granite-guardian-3.0-2b"
SAFE_TOKEN = "No"
UNSAFE_TOKEN = "Yes"
NLOGPROBS = 20

# Global model and tokenizer cache
_MODEL_CACHE = None
_TOKENIZER_CACHE = None


class LogCapture:
    """Captures both print() calls and logging output"""
    def __init__(self):
        self.logs = []
        self.original_stdout = None
        self.original_stderr = None
        self.handler = None
        
    def start(self):
        self.logs = []
        self.original_stdout = sys.stdout
        self.original_stderr = sys.stderr
        
        # Capture print() calls
        sys.stdout = io.StringIO()
        sys.stderr = io.StringIO()
        
        # Capture logging
        logger = logging.getLogger()
        self.handler = logging.StreamHandler(self)
        self.handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
        logger.addHandler(self.handler)
        
    def write(self, message: str):
        """Called by logging handler"""
        if message.strip():
            self.logs.append(message.rstrip('\n'))
            
    def flush(self):
        """Called by logging handler"""
        pass
    
    def end(self):
        # Restore stdout/stderr
        if self.original_stdout:
            captured_stdout = sys.stdout.getvalue()
            captured_stderr = sys.stderr.getvalue()
            
            sys.stdout = self.original_stdout
            sys.stderr = self.original_stderr
            
            # Add captured output to logs
            if captured_stdout.strip():
                self.logs.extend([l for l in captured_stdout.split('\n') if l.strip()])
            if captured_stderr.strip():
                self.logs.extend([l for l in captured_stderr.split('\n') if l.strip()])
        
        # Remove logging handler
        if self.handler:
            logger = logging.getLogger()
            logger.removeHandler(self.handler)
    
    def get_logs(self):
        return self.logs


def _load_local_model():
    """Load Granite Guardian 3.0 2B model locally (from PoC)"""
    global _MODEL_CACHE, _TOKENIZER_CACHE
    
    if _MODEL_CACHE is not None and _TOKENIZER_CACHE is not None:
        return _TOKENIZER_CACHE, _MODEL_CACHE
    
    try:
        print(f"[MODEL] Loading Granite Guardian 3.0 2B from HuggingFace...")
        tokenizer = AutoTokenizer.from_pretrained(GRANITE_MODEL)
        model = AutoModelForCausalLM.from_pretrained(
            GRANITE_MODEL,
            device_map="auto",
            dtype=torch.bfloat16,
            trust_remote_code=True,
        )
        model.eval()
        _MODEL_CACHE = model
        _TOKENIZER_CACHE = tokenizer
        print(f"[MODEL] Model loaded successfully. Device: {model.device}")
        return tokenizer, model
    except Exception as e:
        print(f"[MODEL] Error loading model: {e}")
        raise


def _get_risk_probability_from_logprobs(logprobs_per_step: list, tok: PreTrainedTokenizerBase) -> tuple[float, float]:
    """Extract safe/unsafe probabilities from logprobs (from PoC)"""
    safe_prob = 1e-50
    unsafe_prob = 1e-50

    for step_logprobs in logprobs_per_step:
        for idx, logprob in zip(step_logprobs.indices[0], step_logprobs.values[0]):
            token_str = tok.decode(int(idx)).strip()
            if token_str.lower() == SAFE_TOKEN.lower():
                safe_prob = math.exp(logprob.item())
            elif token_str.lower() == UNSAFE_TOKEN.lower():
                unsafe_prob = math.exp(logprob.item())

    total = safe_prob + unsafe_prob
    return safe_prob / total, unsafe_prob / total


def _classify_prompt_local(prompt: str, tokenizer: PreTrainedTokenizerBase, model) -> dict:
    """Classify a prompt using local Granite Guardian model (from PoC)"""
    messages = [{"role": "user", "content": prompt}]
    guardian_config = {"risk_name": "harm"}

    try:
        formatted = tokenizer.apply_chat_template(
            messages,
            guardian_config=guardian_config,
            add_generation_prompt=True,
            tokenize=False,
        )
        encoded = tokenizer(
            formatted,
            return_tensors="pt",
            return_attention_mask=True,
        )
        input_ids = encoded.input_ids.to(model.device)
        attention_mask = encoded.attention_mask.to(model.device)
        input_len = input_ids.shape[1]

        with torch.no_grad():
            output = model.generate(
                input_ids,
                attention_mask=attention_mask,
                do_sample=False,
                max_new_tokens=20,
                return_dict_in_generate=True,
                output_scores=True,
            )

        logprobs_per_step = [
            torch.topk(scores, k=NLOGPROBS, largest=True, sorted=True)
            for scores in list(output.scores)[:-1]
        ]
        safe_prob, unsafe_prob = _get_risk_probability_from_logprobs(logprobs_per_step, tokenizer)

        generated = str(tokenizer.decode(
            output.sequences[:, input_len:][0],
            skip_special_tokens=True
        )).strip()

        if generated.lower() == UNSAFE_TOKEN.lower():
            label = UNSAFE_TOKEN
        elif generated.lower() == SAFE_TOKEN.lower():
            label = SAFE_TOKEN
        else:
            label = "Failed"

        return {
            "label": label,
            "score": round(unsafe_prob, 4),
            "category": "harmful_content" if unsafe_prob >= 0.5 else "safe"
        }
    except Exception as e:
        print(f"[CLASSIFY] Error during classification: {e}")
        # Return safe by default on error
        return {
            "label": SAFE_TOKEN,
            "score": 0.0,
            "category": "safe"
        }


@contextmanager
def capture_execution():
    """Context manager to capture logs during execution"""
    capture = LogCapture()
    capture.start()
    try:
        yield capture
    finally:
        capture.end()



def _create_fallback_evaluator():
    """Create a simple fallback evaluator based on keyword detection"""
    def evaluate(prompt: str) -> dict:
        prompt_lower = (prompt or '').lower()
        
        # High-confidence harmful keywords
        high_risk_keywords = {
            'hack': 0.95, 'exploit': 0.95, 'malware': 0.95, 'ransomware': 0.95,
            'payload': 0.90, 'shellcode': 0.90, 'ddos': 0.90, 'botnet': 0.90,
            'phishing': 0.90, 'spyware': 0.90, 'keylogger': 0.90, 'trojan': 0.90,
            'jailbreak': 0.85, 'bypass': 0.85, 'circumvent': 0.85, 'evade': 0.85,
            'steal': 0.85, 'breach': 0.85, 'crack': 0.85, 'infiltrate': 0.85,
            'assassinate': 0.95, 'bomb': 0.95, 'weapon': 0.90, 'poison': 0.90,
            'drug': 0.70, 'illegal': 0.70, 'unlawful': 0.70, 'fraud': 0.75,
            'blackmail': 0.85, 'extort': 0.85, 'kidnap': 0.90, 'human traffic': 0.95,
        }
        
        # Contextual risk patterns
        risk_patterns = [
            (r'how\s+to\s+(make|build|create|manufacture)\s+(bomb|weapon)', 0.95),
            (r'instructions?\s+for\s+(hacking|exploiting|attacking)', 0.90),
            (r'step[\s-]by[\s-]step\s+(guide|instructions?)\s+to\s+(hack|exploit)', 0.90),
            (r'bypass.*security', 0.80),
            (r'without\s+being\s+(detected|caught|traced)', 0.75),
            (r'cover[ing]?\s+(tracks|evidence)', 0.75),
        ]
        
        import re
        score = 0.05  # Base score (slight default risk)
        
        # Check for harmful keywords
        matched_keywords = []
        for keyword, weight in high_risk_keywords.items():
            if keyword in prompt_lower:
                score = max(score, weight)
                matched_keywords.append(keyword)
        
        # Check for risk patterns
        for pattern, weight in risk_patterns:
            if re.search(pattern, prompt_lower):
                score = max(score, weight)
        
        # Boost score if multiple suspicious words appear
        if len(matched_keywords) > 1:
            score = min(0.99, score + 0.05 * len(matched_keywords))
        
        # Check for questioning + procedure (often indicates intent to learn harmful techniques)
        if '?' in prompt_lower and ('how' in prompt_lower or 'what' in prompt_lower or 'steps' in prompt_lower):
            if any(kw for kw in ['hack', 'exploit', 'attack', 'make', 'create', 'build'] if kw in prompt_lower):
                score = min(0.99, score + 0.15)
        
        is_unsafe = score >= 0.5
        
        return {
            'label': 'unsafe' if is_unsafe else 'safe',
            'score': round(score, 3),
            'category': 'harmful_content' if is_unsafe else 'safe'
        }
    return evaluate


def _create_local_granite_evaluator():
    """Fallback: load the hardcoded Granite Guardian 3.0-2B model locally."""
    print(f"[EVALUATOR] Loading local Granite Guardian 3.0-2B as fallback...")
    try:
        tokenizer, model = _load_local_model()

        def _eval(prompt: str) -> dict:
            try:
                result = _classify_prompt_local(prompt, tokenizer, model)
                print(f"[EVALUATOR] Local Granite result: {result}")
                return result
            except Exception as e:
                print(f"[EVALUATOR] Local Granite error: {e} — using keyword fallback")
                return _create_fallback_evaluator()(prompt)

        return _eval
    except Exception as e:
        print(f"[EVALUATOR] Failed to load local Granite model: {e} — using keyword fallback")
        return _create_fallback_evaluator()


def _create_robust_evaluator(model_id: str):
    """
    Create a safety evaluator that uses the correct model specified by model_id.

    Priority:
      1. query.py's HuggingFaceGuardrailQuery — honours model_id, uses the right
         architecture (sequence classifier vs causal LM) and the correct response parser.
      2. Local Granite Guardian 3.0-2B — only for IBM/Granite models when query.py fails.
      3. Keyword-based fallback — last resort for any model when everything else fails.
    """
    print(f"[EVALUATOR] Creating evaluator for model: {model_id}")

    # 1. Try the unified query.py interface which properly dispatches per model.
    try:
        qpy_eval = create_safety_evaluator(model_id)
        print(f"[EVALUATOR] Using query.py evaluator for model: {model_id}")

        def query_py_evaluator(prompt: str) -> dict:
            try:
                result = qpy_eval(prompt)
                print(f"[EVALUATOR] query.py classification: label={result.get('label')}, "
                      f"score={result.get('score')}, category={result.get('category')}")
                return result
            except Exception as exc:
                print(f"[EVALUATOR] query.py call failed ({exc}); trying local Granite fallback")
                return _create_local_granite_evaluator()(prompt)

        return query_py_evaluator

    except Exception as e:
        print(f"[EVALUATOR] Could not initialise query.py evaluator: {e}")

    # 2. Local Granite fallback (covers IBM/Granite models if token is missing, etc.)
    if "granite" in model_id.lower():
        print(f"[EVALUATOR] Falling back to local Granite Guardian for model: {model_id}")
        return _create_local_granite_evaluator()

    # 3. Keyword-based last-resort fallback.
    print(f"[EVALUATOR] Falling back to keyword evaluator for model: {model_id}")
    return _create_fallback_evaluator()


def _resolve_model_id(raw_model_id: str | None) -> str:
    model_id = (raw_model_id or '').strip() or DEFAULT_MODEL_ID
    if GuardrailModels.get_model_by_id(model_id) is None:
        return DEFAULT_MODEL_ID
    return model_id


def _get_evaluator(model_id: str):
    if model_id in _EVALUATOR_CACHE:
        return _EVALUATOR_CACHE[model_id]

    evaluator = _create_robust_evaluator(model_id)
    _EVALUATOR_CACHE[model_id] = evaluator
    return evaluator


def build_analyze_result(prompt: str, model_id: str) -> dict:
    print(f'[ANALYZE] Evaluating prompt: {prompt[:100]}')
    evaluator = _get_evaluator(model_id)
    result = evaluator(prompt)
    print(f'[ANALYZE] Result: label={result.get("label")}, score={result.get("score")}, category={result.get("category")}')
    return {
        'label': str(result.get('label', 'unknown')).lower(),
        'score': float(result.get('score', 0.5)),
        'category': str(result.get('category', 'unknown')),
        'echo': prompt,
        'model_id': model_id,
    }


def build_echogram_result(prompt: str, model_id: str, max_steps: int = 6, neighbors_per_step: int = 10) -> dict:
    print(f'[ECHOGRAM] Starting echogram search')
    print(f'[ECHOGRAM] Prompt: {prompt[:100]}...' if len(prompt) > 100 else f'[ECHOGRAM] Prompt: {prompt}')
    print(f'[ECHOGRAM] Model: {model_id}')
    print(f'[ECHOGRAM] Max steps: {max_steps}, Neighbors per step: {neighbors_per_step}')
    
    print(f'[ECHOGRAM] Initializing safety evaluator...')
    evaluator = _get_evaluator(model_id)
    
    print(f'[ECHOGRAM] Initializing EchogramSearch engine...')
    search = EchogramSearch(
        safety_eval=evaluator,
        mutator=PromptMutator(seed=42),
        max_steps=max_steps,
        neighbors_per_step=neighbors_per_step,
    )
    
    print(f'[ECHOGRAM] Running search algorithm...')
    result = search.run(prompt)
    
    print(f'[ECHOGRAM] Search complete. Found bypass: {result.get("found_bypass", False)}')
    print(f'[ECHOGRAM] Result nodes count: {len(result.get("nodes", []))}')
    print(f'[ECHOGRAM] Result edges count: {len(result.get("edges", []))}')
    print(f'[ECHOGRAM] Result keys: {list(result.keys())}')
    result['model_id'] = model_id
    return result


class Handler(BaseHTTPRequestHandler):
    def _write_json(self, payload: dict, status: int = 200) -> None:
        try:
            body = json.dumps(payload).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError):
            # Client disconnected before we could send response - this is normal
            pass

    def do_GET(self):
        if self.path == '/health':
            self._write_json({'message': 'Python backend is alive'})
            return

        self._write_json({'error': 'Not found'}, status=404)

    def do_POST(self):
        if self.path not in ('/analyze', '/search'):
            self._write_json({'error': 'Not found'}, status=404)
            return

        content_length = int(self.headers.get('Content-Length', 0))
        raw_body = self.rfile.read(content_length) if content_length > 0 else b'{}'

        try:
            body = json.loads(raw_body.decode('utf-8'))
        except json.JSONDecodeError:
            self._write_json({'error': 'Invalid JSON body'}, status=400)
            return

        prompt = str(body.get('prompt', '')).strip()
        if not prompt:
            self._write_json({'error': 'prompt is required'}, status=400)
            return

        model_id = _resolve_model_id(str(body.get('model_id', '')).strip())
        started_at = time.perf_counter()

        try:
            with capture_execution() as log_capture:
                print(f'[REQUEST] Processing {self.path} endpoint')
                print(f'[REQUEST] Model: {model_id}')
                
                if self.path == '/analyze':
                    response = build_analyze_result(prompt, model_id)
                else:
                    max_steps = int(body.get('max_steps', 6))
                    neighbors_per_step = int(body.get('neighbors_per_step', 10))
                    response = build_echogram_result(prompt, model_id, max_steps, neighbors_per_step)
                
                print(f'[RESPONSE] Processing complete')
                print(f'[RESPONSE] Response keys: {list(response.keys())}')
                if 'nodes' in response:
                    print(f'[RESPONSE] Nodes count: {len(response["nodes"])}')
                if 'edges' in response:
                    print(f'[RESPONSE] Edges count: {len(response["edges"])}')
                
            response['elapsed_ms'] = int((time.perf_counter() - started_at) * 1000)
            response['logs'] = log_capture.get_logs()
            
            # Also print to actual stdout for debugging
            print(f'[LOG] Query completed in {response["elapsed_ms"]}ms')
            print(f'[LOG] Final response keys: {list(response.keys())}')
            
            self._write_json(response)
        except Exception as exc:
            error_response = {
                'error': 'backend_inference_failed',
                'message': str(exc),
                'model_id': model_id,
                'elapsed_ms': int((time.perf_counter() - started_at) * 1000),
                'logs': [],
            }
            print(f'[ERROR] {str(exc)}', file=sys.stderr)
            self._write_json(error_response, status=500)


if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), Handler)
    print(f'Python backend listening on http://{HOST}:{PORT}')
    server.serve_forever()

