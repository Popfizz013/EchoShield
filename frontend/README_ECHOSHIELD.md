# EchoShield Frontend

A React-based frontend for the EchoShield AI Security Visualization tool built with Vite.

## Project Structure

```
src/
├── components/
│   ├── PromptForm.jsx      # Main form component for prompt input
│   ├── PromptForm.css      # Styling for the prompt form
│   ├── SafetyResult.jsx    # Component to display safety classification results
│   └── SafetyResult.css    # Styling for the safety result display
├── App.jsx                 # Root component managing form and result state
├── App.css                 # App layout and styling
├── main.jsx                # Entry point
├── index.css               # Global styles
└── assets/                 # Static assets
```

## Features

- **Prompt Input Form**: Text area for users to enter prompts for safety evaluation
- **Check Safety Button**: Submit button to trigger safety classification
- **Results Display**: Card-based display showing:
  - Safety status (Safe/Unsafe)
  - Risk score (0-100%)
  - Category of concern
- **Responsive Design**: Works on desktop and mobile devices
- **Loading States**: Visual feedback during API calls

## Development

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173/` (or next available port)

### Production Build

```bash
npm run build
```

### Preview Build

```bash
npm run preview
```

## API Integration

The frontend is ready for backend integration. The `handlePromptSubmit` function in `App.jsx` has placeholder comments for the API endpoint:

- **Endpoint**: `POST /api/check`
- **Request**: `{ prompt: string }`
- **Response**: `{ label: "safe"|"unsafe", score: float, category: string }`

Your team member can complete the integration by uncommenting the fetch call and connecting to the Node.js backend.

## Component Details

### PromptForm
- Accepts user input in a textarea
- Validates that the prompt is not empty
- Disables input during API calls
- Shows loading state on the button

### SafetyResult
- Displays classification results in a card format
- Color-coded status (green for safe, red for unsafe)
- Shows confidence score and category
- Includes a close button to dismiss results

## Styling

- **Component Scoping**: Each component has its own CSS file for style organization
- **Colors**: 
  - Safe: Green (#22c55e) 
  - Unsafe: Red (#ef4444)
  - Primary: Blue (#4a7fd7)
- **Responsive**: Mobile-first design approach

## Next Steps

1. Backend Integration: Connect to Node.js API at `/api/check`
2. Add real safety classification responses
3. Display actual results from the backend
4. Implement WebSocket for real-time echogram updates (Milestone 5)
