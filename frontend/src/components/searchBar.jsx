import { useRef, useEffect } from "react";

export default function SearchBar({
  query        = "",
  loading      = false,
  onQueryChange,
  onSubmit,
  onClear,
  placeholder  = "Search anime titles, genres...",
}) {
  const inputRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Ctrl+K to focus, Escape to clear
  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        onClear?.();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClear]);

  function handleSubmit(e) {
    e.preventDefault();
    if (query.trim().length >= 2) onSubmit?.();
  }

  return (
    <div style={styles.wrap}>

      {/* ── Input row ────────────────────────────────────────────────────── */}
      <form style={styles.inputRow} onSubmit={handleSubmit}>

        {/* Search icon / spinner */}
        <span style={styles.searchIcon}>
          {loading ? <Spinner /> : "⌕"}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          placeholder={placeholder}
          style={styles.input}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Clear */}
        {query.length > 0 && (
          <button
            type="button"
            style={styles.clearBtn}
            onClick={() => { onClear?.(); inputRef.current?.focus(); }}
          >
            ✕
          </button>
        )}

        {/* Submit */}
        <button
          type="submit"
          style={{
            ...styles.submitBtn,
            opacity: query.trim().length >= 2 ? 1 : 0.4,
          }}
          disabled={query.trim().length < 2}
        >
          Search
        </button>
      </form>

      {/* ── Hint row ─────────────────────────────────────────────────────── */}
      <div style={styles.hints}>
        <span style={styles.hint}>
          🎌 Powered by AniList — click any result to stream instantly
        </span>
        <span style={styles.shortcut}>
          <kbd style={styles.kbd}>Ctrl</kbd>
          <kbd style={styles.kbd}>K</kbd>
          <span style={{ color: "#3a3a52" }}> to focus</span>
        </span>
      </div>
    </div>
  );
}

// ── Mini spinner ──────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <>
      <div style={spinnerStyle} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

const spinnerStyle = {
  width:        "16px",
  height:       "16px",
  borderRadius: "50%",
  border:       "2px solid rgba(232,93,93,0.2)",
  borderTopColor: "#e85d5d",
  animation:    "spin 0.7s linear infinite",
  flexShrink:   0,
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    display:       "flex",
    flexDirection: "column",
    gap:           "0",
    width:         "100%",
    maxWidth:      "680px",
    margin:        "0 auto",
  },
  inputRow: {
    display:      "flex",
    alignItems:   "center",
    background:   "#1a1a24",
    border:       "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    padding:      "0 12px",
    gap:          "8px",
    transition:   "border-color 0.2s",
  },
  searchIcon: {
    fontSize:  "1.3rem",
    color:     "#5a5a7a",
    display:   "flex",
    alignItems:"center",
    flexShrink: 0,
    userSelect:"none",
  },
  input: {
    flex:       1,
    background: "transparent",
    color:      "#fff",
    fontSize:   "1rem",
    padding:    "14px 0",
    caretColor: "#e85d5d",
    minWidth:   0,
  },
  clearBtn: {
    background:   "transparent",
    color:        "#5a5a7a",
    fontSize:     "0.8rem",
    padding:      "4px 8px",
    borderRadius: "4px",
    flexShrink:   0,
  },
  submitBtn: {
    background:    "#e85d5d",
    color:         "#fff",
    fontSize:      "0.85rem",
    fontWeight:    700,
    padding:       "8px 18px",
    borderRadius:  "7px",
    flexShrink:    0,
    letterSpacing: "0.03em",
    transition:    "opacity 0.15s",
  },
  hints: {
    display:        "flex",
    justifyContent: "space-between",
    alignItems:     "center",
    padding:        "8px 2px 0",
    flexWrap:       "wrap",
    gap:            "4px",
  },
  hint: {
    fontSize: "0.75rem",
    color:    "#3a3a52",
  },
  shortcut: {
    display:    "flex",
    alignItems: "center",
    gap:        "3px",
    fontSize:   "0.75rem",
  },
  kbd: {
    background:   "#1a1a24",
    border:       "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px",
    padding:      "1px 5px",
    fontSize:     "0.7rem",
    color:        "#5a5a7a",
    fontFamily:   "inherit",
  },
};