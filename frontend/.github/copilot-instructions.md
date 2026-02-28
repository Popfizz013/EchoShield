# EchoShield Frontend - Development Guidelines

## Project Overview
React frontend for EchoShield AI Security Visualization tool using Vite for fast development and builds.

## Architecture
- React components for prompt submission and safety analysis UI
- Axios or Fetch API for communication with Node.js backend
- Responsive design for prompt input and results display

## Key Components
- **PromptForm**: Main input form with text area for user prompts and "Check safety" button
- **SafetyResult**: Displays safety classification (label, score, category)
- **App**: Root component managing state and API calls

## Development Guidelines
- Use functional components with React hooks (useState, useEffect)
- Modal or card-style result display for safety classifications
- Keep component structure flat and manageable for Milestone 1
- Prepare for WebSocket integration for real-time echogram updates (Milestone 5)

## API Integration (Backend Ready)
- POST `/api/check` - Submit prompt for safety evaluation
- POST `/api/echogram` - Trigger adversarial search with real-time updates
- Response format: `{ label: "safe|unsafe", score: float, category: string }`

## Styling
- Using Vite's CSS modules for component scoping
- Basic responsive layout
- Clean, minimal design for focus on functionality

## Build & Deploy
- Development: `npm run dev`
- Production: `npm run build`
- Preview: `npm run preview`
