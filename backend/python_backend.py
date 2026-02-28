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


def build_echogram_result(prompt: str, max_steps: int = 6, neighbors_per_step: int = 10) -> dict:
    """Generate echogram search tree data"""
    normalized = prompt.lower()
    is_unsafe = any(keyword in normalized for keyword in UNSAFE_KEYWORDS)
    
    # Build a simple search tree
    nodes = [
        {
            'id': 0,
            'parent_id': None,
            'prompt_text': prompt,
            'label': 'unsafe' if is_unsafe else 'safe',
            'score': 0.91 if is_unsafe else 0.08,
            'mutation_type': 'original',
            'mutation_detail': 'Original prompt',
            'step_index': 0,
        }
    ]
    
    edges = []
    node_counter = 1
    
    # Simulate adversarial search by generating mutations
    if is_unsafe:
        # Generate some mutated variants
        mutations = [
            ('keyword_replacement', 'removed harmful keywords'),
            ('context_addition', 'added educational context'),
            ('paraphrasing', 'rephrased the request'),
        ]
        
        for step in range(1, min(max_steps, 3)):
            for i, (mut_type, mut_detail) in enumerate(mutations[:neighbors_per_step]):
                mutated_prompt = prompt.replace('kill', 'defeat').replace('bomb', 'device').replace('hack', 'analyze')
                mutated_is_unsafe = any(keyword in mutated_prompt.lower() for keyword in UNSAFE_KEYWORDS)
                
                node_id = node_counter
                nodes.append({
                    'id': node_id,
                    'parent_id': 0 if step == 1 else node_counter - 1,
                    'prompt_text': mutated_prompt,
                    'label': 'unsafe' if mutated_is_unsafe else 'safe',
                    'score': 0.65 - (step * 0.15),
                    'mutation_type': mut_type,
                    'mutation_detail': mut_detail,
                    'step_index': step,
                })
                
                edges.append({
                    'source': node_counter - 1,
                    'target': node_id,
                })
                
                node_counter += 1
    
    return {
        'found_bypass': is_unsafe,  # Only if original was unsafe
        'reason': 'Prompt did not trigger safety filters' if not is_unsafe else 'Adversarial perturbations generated',
        'original_prompt': prompt,
        'best_modified_prompt': nodes[-1]['prompt_text'] if len(nodes) > 1 else None,
        'best_score': nodes[-1]['score'] if len(nodes) > 1 else nodes[0]['score'],
        'trigger_phrases': [],
        'path_node_ids': [0] + [n['id'] for n in nodes[1:3]],  # Simple path
        'nodes': nodes,
        'edges': edges,
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

        if self.path == '/analyze':
            response = build_dummy_result(prompt)
        else:  # /search
            max_steps = int(body.get('max_steps', 6))
            neighbors_per_step = int(body.get('neighbors_per_step', 10))
            response = build_echogram_result(prompt, max_steps, neighbors_per_step)
        
        self._write_json(response)


if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), Handler)
    print(f'Python backend listening on http://{HOST}:{PORT}')
    server.serve_forever()

