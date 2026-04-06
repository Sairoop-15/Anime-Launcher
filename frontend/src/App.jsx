import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home.jsx";
import AnimeDetail from "./pages/animeDetail.jsx";

// ── Global styles ─────────────────────────────────────────────────────────────
const styles = `
  :root {
    --bg-primary:    #0f0f13;
    --bg-secondary:  #1a1a24;
    --bg-card:       #22222e;
    --bg-hover:      #2a2a38;
    --accent:        #e85d5d;
    --accent-hover:  #ff7070;
    --accent-dim:    rgba(232, 93, 93, 0.15);
    --text-primary:  #ffffff;
    --text-secondary:#a0a0b8;
    --text-muted:    #5a5a7a;
    --border:        rgba(255,255,255,0.06);
    --radius-sm:     6px;
    --radius-md:     10px;
    --radius-lg:     16px;
    --shadow:        0 4px 24px rgba(0,0,0,0.4);
    --transition:    all 0.2s ease;
  }

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh;
    line-height: 1.5;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    cursor: pointer;
    border: none;
    outline: none;
    font-family: inherit;
  }

  input {
    font-family: inherit;
    outline: none;
    border: none;
  }

  img {
    display: block;
    max-width: 100%;
  }

  /* Page layout wrapper */
  .page {
    max-width: 1400px;
    margin: 0 auto;
    padding: 24px 20px 60px;
  }

  /* Anime card grid */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 16px;
  }

  /* Utility badges */
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .badge-accent {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .badge-green {
    background: rgba(52, 211, 153, 0.15);
    color: #34d399;
  }

  .badge-blue {
    background: rgba(96, 165, 250, 0.15);
    color: #60a5fa;
  }

  .badge-yellow {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }

  /* Divider */
  .divider {
    height: 1px;
    background: var(--border);
    margin: 24px 0;
  }

  /* Error message */
  .error-msg {
    color: var(--accent);
    background: var(--accent-dim);
    border: 1px solid rgba(232,93,93,0.2);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    font-size: 0.9rem;
    margin: 16px 0;
    display: flex;
    align-items: center;
  }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-muted);
  }

  .empty-state h3 {
    font-size: 1.1rem;
    margin-bottom: 8px;
    color: var(--text-secondary);
  }

  .empty-state p {
    font-size: 0.9rem;
  }

  /* Scrollbar */
  ::-webkit-scrollbar       { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg-secondary); }
  ::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--accent-hover); }
`;

export default function App() {
  return (
    <>
      <style>{styles}</style>

      <BrowserRouter>
        <Routes>
          {/* Home — search + trending */}
          <Route path="/"           element={<Home />}        />

          {/* Anime detail — MegaPlay stream + episode grid */}
          <Route path="/anime/:id"  element={<AnimeDetail />} />

          {/* Catch-all */}
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}