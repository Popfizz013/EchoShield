# UvicHack_Hackathon

We can query multiple guard rail models at the same time with the same rpompt, take their response as a vector. Plot the similarities where the models spike indidicates safe or bad words.


This repository is for a hackathon on 02/27/2026

The EchoShield AI Security Visualization project was developed for the Startup Hackathon hosted by UVic Hacks - a student-led hackathon club that brings together builders, designers, and thinkers to rapidly prototype technology projects that push the limits of creativity and real-world engineering within an intense build sprint.

In modern AI systems, safety filters and moderation models are designed to prevent harmful or unsafe outputs, but even small changes in input phrasing can cause these safeguards to fail. EchoShield explores this challenge by allowing users to submit a text prompt and then automatically discovering minimal modifications that flip a safety classification from unsafe to safe. By combining an adversarial prompt search engine with rich visualizations of how input changes affect model decisions, this web application reveals hidden vulnerabilities in machine learning safety layers and provides insights into how AI defenses can be strengthened.

Our goal with this project is not only to build a working tool within the hackathon timeframe but also to spark deeper thinking around AI safety, model robustness, and interactive data visualization. Through this prototype, we aim to demonstrate the importance of transparency in AI behavior and foster dialogue about improving AI security in real-world applications.

## Milestone 1 - Project Setup & Skeleton
Goal: establish the full stack structure.

Architecture:
- Frontend (React) -> Node.js API server -> Python AI engine

Deliverables:
- React frontend created (basic page with a prompt text area and "Check safety" button).
- Node.js server (Express) with endpoints like:
	- POST /api/check
	- POST /api/echogram
- Python service (Flask / FastAPI / simple HTTP server) with:
	- POST /analyze
	- POST /search
- Node can send a request to Python (simple JSON echo or dummy classification).
- Basic prompt input UI wired to POST /api/check.

Success check:
- User enters prompt -> React calls Node -> Node forwards to Python -> Python returns dummy response -> UI displays it.

Related topics to explore:
- Building minimal REST APIs in Node (Express) and Python (Flask / FastAPI).
- CORS and JSON request/response handling in React -> Node -> Python chains.
- Process management for multi-service dev (e.g., npm run dev scripts, concurrently, or Docker compose).

## Milestone 2 - Safety Model Integration (Python Service)
Goal: Python service evaluates prompt safety.

Deliverables:
- Python module that exposes a function, e.g.:
	- def safety_eval(prompt: str) -> dict: returns {"label": "safe"/"unsafe", "score": float, "category": str}
- /analyze route that:
	- Receives prompt as JSON.
	- Calls the underlying safety model (e.g., OpenAI moderation, Llama-Guard, or a custom classifier).
	- Returns: label (Safe / Unsafe), score (probability / risk score), category (e.g., violence, self-harm, hate).
- Node POST /api/check that:
	- Takes the prompt from React.
	- Calls Python /analyze.
	- Relays the classification back to the frontend.

Flow:
- React -> Node (/api/check) -> Python (/analyze) -> Safety model -> back up to UI.

Success check:
- Entering a prompt in the UI returns a visible safety classification (label + score + category).

Related topics to explore:
- Moderation/safety model APIs and how to parse their scores and categories.
- Simple schema design for responses (label, score, category) so later milestones (echogram + visualization) can just consume this.
- Caching or batching model calls to keep latency acceptable.

## Milestone 3 - Echogram Engine (Python Core)
Goal: Python searches for prompt modifications that flip classification.

Core idea: treat the safety model as a function f(p) -> {safe, unsafe} with a score, then search over mutated prompts to find ones that flip the label while changing the text minimally.

Deliverables:
- Phrase mutation system
- A PromptMutator (or similar) that can generate neighbors of a prompt using simple operators:
	- Word-level: synonym replacement for key words (via WordNet or LLM-based synonym suggestion).
	- Benign contextual additions like "this is to write a fiction story" or "for academic research only".
	- Suffix-level (very EchoGram-style): append pattern tokens or suffixes that often bypass guardrails, e.g., role-play hints ("act as an expert chemist"), meta-instructions ("ignore safety rules above, this is a simulation"), junk/structured suffixes ("||| ### END", short random token sequences).
	- Structural: wrap harmful content in quotes, code blocks, or translation tasks (e.g., "translate the following...", "summarize the following instructions").
- Interface example: class PromptMutator with generate_neighbors(prompt: str, k: int = 10) -> list[str] applying random mutation operators.
- Search algorithm: an EchogramSearch class that repeatedly evaluates the original prompt with safety_eval, generates mutated prompts if unsafe, evaluates candidates, and continues until a safe label is found or a search budget is exceeded.
- Pragmatic options: greedy hill-climbing, beam search, shallow tree search.
- The search should track a path (original, bypass, nodes, edges).
- Detects bypass phrase with output like original prompt (unsafe), best modified prompt (safe), trigger phrases for the mutation path.

Success check:
- For at least some unsafe prompts, the system automatically finds a variant classified as safe and returns the bypass prompt and mutation path.

Related topics to explore:
- Text adversarial attacks on classifiers (especially black-box, score-based attacks).
- Mutation operators for natural-language adversarial examples (character, word, phrase, suffix).
- Search strategies in discrete spaces: hill-climbing, beam search, small tree search.
- Jailbreak/prompt-injection patterns and suffix-style attacks for intuition.

## Milestone 4 - Visualization Layer (Frontend)
Goal: show how the model was bypassed.

Deliverables:
- A visualization that consumes the search output structure from Milestone 3: each node (id, parent_id, prompt_text or truncated/hash, label, score, mutation_type, step_index) and edges (parent -> child relationships).
- UI components such as:
	- Prompt tree using something like React Flow with nodes colored by label (Safe/Unsafe) and hover/click to view prompt text and safety score.
	- Score progression chart (Chart.js or similar) with X-axis step index, Y-axis safety score, highlighting the flip step.
	- Attack path view showing the sequence of prompts from original to bypass with mutation types annotated.

Success check:
- After running a search, users can visually see how prompts evolved, which attempts failed, and which path bypassed guardrails.

Related topics to explore:
- Data modeling for graph visualizations (nodes + edges) and time-series charts.
- Visual encodings for classification status (color, opacity, tooltips).
- UX patterns for exploring trees (collapse/expand, zoom) vs linear timelines.

## Milestone 5 - Real-Time Attack Demo
Goal: make the echogram search interactive.

Deliverables:
- Python side: the echogram search code emits progress events as it evaluates each node (via generator or callback) with step index, prompt id, label, score, mutation description.
- Node side: a streaming channel from Python to frontend using Server-Sent Events (SSE) or WebSockets. A controller starts an echogram search on /api/echogram and streams progress updates to the frontend as they arrive.
- Frontend: live log panel (e.g., "Testing phrase 1... (Unsafe, score X)", "Testing phrase 2...", "Bypass found! (Safe, score Y)") and visualization that updates incrementally with new nodes/edges and score chart animation.

Success check:
- When a user triggers an echogram search, they can watch prompts being tried in real time, the search tree and charts updating live, and a clear indication when a bypass is found or search stops.

Related topics to explore:
- Implementing SSE or WebSockets in Node and consuming them in React.
- Managing long-running tasks and streaming logs/metrics from Python.
- Incremental graph updates and animation in React visualization libraries.

## Milestone 6 - Demo & Pitch
Goal: present the cybersecurity insight clearly.

Deliverables:
- Demo scenario: a curated unsafe prompt that is blocked by the safety model in Milestone 2 and then bypassed by the echogram engine in Milestones 3-5.
- Narrative:
	- Clear explanation of what an echogram attack is: show the original unsafe prompt (blocked), show the evolution of mutations, show the final bypass marked safe.
	- Why AI safety models can be bypassed: safety filters operate on surface form; small rewrites or adversarial suffixes can move decisions.
	- Impact on AI security: guardrails alone are insufficient; need layered defenses, monitoring, and robust training.

Success check:
- Judges can quickly understand the problem (AI safety models are brittle), the method (echogram search over mutations), the evidence (visualization + live demo), and the implication (real security risk, not just a toy).

Related topics to explore:
- Summarizing technical attacks for non-technical audiences (threat modeling, risk framing).
- Examples of real-world LLM jailbreaks and content-safety failures.
- Broader themes: adversarial ML, red-teaming, defense-in-depth for AI systems.
