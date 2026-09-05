import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyPreviewRedirect } from './lib/previewRedirect';
import './styles/app.css';
import './shell/shell.css';
// timeline.css is imported by the Timeline component itself

// Platform-plumbing shim: a mis-cased ?xtransformport=6007 falls through
// Caddy to this app (query keys are case-sensitive) — bounce it to the
// working public storybook mount instead of silently showing the app.
applyPreviewRedirect(window.location);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
