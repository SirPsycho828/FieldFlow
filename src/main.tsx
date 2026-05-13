import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Console branding
console.log(
  '%c' + [
    '┌─────────────────────────────┐',
    '│  ╔═╗ ╦ ╔═╗ ╦   ╔╦╗        │',
    '│  ╠╣  ║ ║╣  ║    ║║        │',
    '│  ╚   ╩ ╚═╝ ╩═╝ ═╩╝  FLOW  │',
    '└─────────────────────────────┘',
  ].join('\n'),
  'color: #37704D; font-family: monospace; font-size: 13px; line-height: 1.4;'
);
console.log(
  '%cEvery great landscape starts with a single lead.',
  'color: #C16A3A; font-size: 12px; font-style: italic;'
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
