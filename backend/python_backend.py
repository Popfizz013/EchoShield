from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import time

from echogram_engine import EchogramSearch, PromptMutator
from query import GuardrailModels, create_safety_evaluator

HOST = '0.0.0.0'
PORT = 8000

DEFAULT_MODEL_ID = GuardrailModels.GRANITE_GUARDIAN_3_0_2B.model_id
_EVALUATOR_CACHE: dict[str, callable] = {}


def _resolve_model_id(raw_model_id: str | None) -> str:
    model_id = (raw_model_id or '').strip() or DEFAULT_MODEL_ID
    if GuardrailModels.get_model_by_id(model_id) is None:
        return DEFAULT_MODEL_ID
    return model_id


def _get_evaluator(model_id: str):
    if model_id in _EVALUATOR_CACHE:
        return _EVALUATOR_CACHE[model_id]

    evaluator = create_safety_evaluator(model_id)
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
    evaluator = _get_evaluator(model_id)
    search = EchogramSearch(
        safety_eval=evaluator,
        mutator=PromptMutator(seed=42),
        max_steps=max_steps,
        neighbors_per_step=neighbors_per_step,
    )
    result = search.run(prompt)
    result['model_id'] = model_id
    return result


class Handler(BaseHTTPRequestHandler):
    def _write_json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

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
            if self.path == '/analyze':
                response = build_analyze_result(prompt, model_id)
            else:
                max_steps = int(body.get('max_steps', 6))
                neighbors_per_step = int(body.get('neighbors_per_step', 10))
                response = build_echogram_result(prompt, model_id, max_steps, neighbors_per_step)

            response['elapsed_ms'] = int((time.perf_counter() - started_at) * 1000)
            self._write_json(response)
        except Exception as exc:
            self._write_json(
                {
                    'error': 'backend_inference_failed',
                    'message': str(exc),
                    'model_id': model_id,
                },
                status=500,
            )


if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), Handler)
    print(f'Python backend listening on http://{HOST}:{PORT}')
    server.serve_forever()

