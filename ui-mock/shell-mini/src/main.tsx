import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/app.css';
import './shell/shell.css';
// timeline.css is imported by the Timeline component itself

// R18: the XTransformPort query-redirect shim that lived here was removed —
// the full Storybook dev server owns :3000 (the public surface), so there is
// no query-URL path left to rescue. This app is the localhost dev surface on
// :3001 (scripts/dev3000.py).

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
