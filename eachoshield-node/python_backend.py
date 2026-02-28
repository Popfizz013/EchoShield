from http.server import BaseHTTPRequestHandler, HTTPServer
import json

HOST = '0.0.0.0'
PORT = 8000

UNSAFE_KEYWORDS = {
    'bomb',
    'kill',
    'weapon',
    'hack',
    'malware',
    'exploit',
    'attack',
}


def build_dummy_result(prompt: str) -> dict:
    normalized = prompt.lower()
    is_unsafe = any(keyword in normalized for keyword in UNSAFE_KEYWORDS)

    if is_unsafe:
        return {
            'label': 'unsafe',
            'score': 0.91,
            'category': 'potentially_harmful',
            'echo': prompt,
        }

    return {
        'label': 'safe',
        'score': 0.08,
        'category': 'general',
        'echo': prompt,
    }


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

        response = build_dummy_result(prompt)
        self._write_json(response)


if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), Handler)
    print(f'Python backend listening on http://{HOST}:{PORT}')
    server.serve_forever()
