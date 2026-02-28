from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import time
import os
import sys
import io
import logging
from contextlib import contextmanager

from echogram_engine import EchogramSearch, PromptMutator
from query import GuardrailModels, create_safety_evaluator

HOST = '0.0.0.0'
PORT = 8000

DEFAULT_MODEL_ID = GuardrailModels.GRANITE_GUARDIAN_3_0_2B.model_id
_EVALUATOR_CACHE: dict[str, callable] = {}


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
        harmful_keywords = ['hack', 'exploit', 'attack', 'malware', 'steal', 'bypass', 'kill', 'destroy', 'crack', 'breach', 'bypass', 'jailbreak']
        is_harmful = any(keyword in prompt_lower for keyword in harmful_keywords)
        return {
            'label': 'unsafe' if is_harmful else 'safe',
            'score': 0.8 if is_harmful else 0.2,
            'category': 'harmful_content' if is_harmful else 'safe'
        }
    return evaluate


def _create_robust_evaluator(model_id: str):
    """Create an evaluator that falls back to keyword-based detection if HF is unavailable"""
    try:
        evaluator = create_safety_evaluator(model_id)
        
        # Wrap the evaluator to handle HuggingFace errors
        def safe_evaluator(prompt: str) -> dict:
            try:
                return evaluator(prompt)
            except Exception as hf_error:
                # Fall back to keyword-based evaluation if HF fails
                print(f'HuggingFace evaluation failed: {hf_error}. Using fallback evaluator.')
                fallback = _create_fallback_evaluator()
                return fallback(prompt)
        
        return safe_evaluator
    except Exception as e:
        # If we can't even initialize the HF evaluator, use fallback
        print(f'Warning: Could not initialize HuggingFace evaluator: {e}. Using fallback keyword-based evaluator.')
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
    evaluator = _get_evaluator(model_id)
    result = evaluator(prompt)
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
                
            response['elapsed_ms'] = int((time.perf_counter() - started_at) * 1000)
            response['logs'] = log_capture.get_logs()
            
            # Also print to actual stdout for debugging
            print(f'[LOG] Query completed in {response["elapsed_ms"]}ms')
            
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

