import { useState, useEffect, useRef, useCallback } from "react";

// ── MegaPlay postMessage event types ─────────────────────────────────────────
const EVENTS = {
  TIME:     "time",
  COMPLETE: "complete",
  LOG:      "watching-log",
};

export default function VideoPlayer({
  anilistId,
  episodeNumber,
  episodeTitle  = "",
  animeTitle    = "",
  onComplete,           // fired when episode finishes
  onProgress,           // fired on time updates { time, duration, percent }
  onNext,               // fired for auto-next
  autoPlay    = true,
}) {
  const [language,    setLanguage]    = useState("sub");  // "sub" | "dub"
  const [embedUrl,    setEmbedUrl]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [progress,    setProgress]    = useState(0);      // 0-100
  const [completed,   setCompleted]   = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);  // post-complete overlay
  const [iframeKey,   setIframeKey]   = useState(0);      // force remount on ep change

  const iframeRef    = useRef(null);
  const progressRef  = useRef(0);
  const completedRef = useRef(false);

  // ── Build embed URL whenever anilistId / episode / language changes ─────────
  useEffect(() => {
    if (!anilistId || !episodeNumber) return;

    setLoading(true);
    setError(null);
    setCompleted(false);
    setShowOverlay(false);
    setProgress(0);
    progressRef.current  = 0;
    completedRef.current = false;

    const url = buildEmbedUrl(anilistId, episodeNumber, language);
    setEmbedUrl(url);
    setIframeKey((k) => k + 1); // remount iframe cleanly
  }, [anilistId, episodeNumber, language]);

  // ── Listen to postMessage events from MegaPlay iframe ─────────────────────
  useEffect(() => {
    function handleMessage(event) {
      let data = event.data;

      // Parse if stringified
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return; }
      }

      // Only handle MegaPlay events
      if (data?.channel !== "megacloud" && data?.type !== EVENTS.LOG) {
        if (!data?.event) return;
      }

      // ── Time progress ──────────────────────────────────────────────────────
      if (data.event === EVENTS.TIME || data.type === EVENTS.LOG) {
        const time     = data.time     || data.currentTime || 0;
        const duration = data.duration || 1;
        const percent  = data.percent  || Math.round((time / duration) * 100);

        progressRef.current = percent;
        setProgress(percent);
        onProgress?.({ time, duration, percent });
      }

      // ── Episode complete ───────────────────────────────────────────────────
      if (data.event === EVENTS.COMPLETE) {
        if (!completedRef.current) {
          completedRef.current = true;
          setCompleted(true);
          setShowOverlay(true);
          onComplete?.({ episodeNumber, progress: progressRef.current });
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [episodeNumber, onComplete, onProgress]);

  // ── Switch language — remounts iframe ─────────────────────────────────────
  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => prev === "sub" ? "dub" : "sub");
  }, []);

  // ── Reload player ─────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setIframeKey((k) => k + 1);
  }, []);

  // ── Handle iframe load ────────────────────────────────────────────────────
  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError("Failed to load player. MegaPlay may be temporarily unavailable.");
  }, []);

  if (!anilistId || !episodeNumber) {
    return (
      <div style={styles.placeholder}>
        <span style={styles.placeholderIcon}>▶</span>
        <p style={styles.placeholderText}>Select an episode to start watching</p>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>

      {/* ── Player header ────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.epLabel}>
            Episode {episodeNumber}
          </span>
          {episodeTitle && episodeTitle !== `Episode ${episodeNumber}` && (
            <span style={styles.epTitle}>{episodeTitle}</span>
          )}
        </div>

        <div style={styles.headerRight}>
          {/* Sub / Dub toggle */}
          <div style={styles.langToggle}>
            <button
              style={{
                ...styles.langBtn,
                ...(language === "sub" ? styles.langBtnActive : {}),
              }}
              onClick={() => setLanguage("sub")}
              title="Subtitled"
            >
              SUB
            </button>
            <button
              style={{
                ...styles.langBtn,
                ...(language === "dub" ? styles.langBtnActive : {}),
              }}
              onClick={() => setLanguage("dub")}
              title="Dubbed"
            >
              DUB
            </button>
          </div>

          {/* Reload button */}
          <button style={styles.reloadBtn} onClick={reload} title="Reload player">
            ↺
          </button>
        </div>
      </div>

      {/* ── Player frame ─────────────────────────────────────────────────── */}
      <div style={styles.playerWrap}>

        {/* Loading overlay */}
        {loading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.spinner} />
            <p style={styles.loadingText}>
              Loading {animeTitle} — Episode {episodeNumber} ({language.toUpperCase()})...
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div style={styles.errorOverlay}>
            <span style={styles.errorIcon}>⚠</span>
            <p style={styles.errorText}>{error}</p>
            <div style={styles.errorActions}>
              <button style={styles.errorBtn} onClick={reload}>
                ↺ Retry
              </button>
              <button
                style={styles.errorBtn}
                onClick={() => {
                  // Try MAL fallback URL
                  setError(null);
                  setLoading(true);
                  setIframeKey((k) => k + 1);
                }}
              >
                Try alternate source
              </button>
            </div>
          </div>
        )}

        {/* MegaPlay iframe */}
        {embedUrl && (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={embedUrl}
            style={{
              ...styles.iframe,
              opacity: loading ? 0 : 1,
              transition: "opacity 0.3s ease",
            }}
            frameBorder="0"
            scrolling="no"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
            onLoad={handleLoad}
            onError={handleError}
            title={`${animeTitle} Episode ${episodeNumber}`}
          />
        )}

        {/* ── Episode complete overlay ──────────────────────────────────── */}
        {showOverlay && (
          <div style={styles.completeOverlay}>
            <div style={styles.completeCard}>
              <p style={styles.completeTitle}>Episode {episodeNumber} complete</p>
              <p style={styles.completeSub}>{animeTitle}</p>

              <div style={styles.completeActions}>
                {onNext && (
                  <button
                    style={styles.nextBtn}
                    onClick={() => {
                      setShowOverlay(false);
                      onNext(episodeNumber + 1);
                    }}
                  >
                    ▶ Next Episode {episodeNumber + 1}
                  </button>
                )}
                <button
                  style={styles.replayBtn}
                  onClick={() => {
                    setShowOverlay(false);
                    setCompleted(false);
                    completedRef.current = false;
                    reload();
                  }}
                >
                  ↺ Replay
                </button>
                <button
                  style={styles.dismissOverlayBtn}
                  onClick={() => setShowOverlay(false)}
                >
                  ✕ Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────────── */}
      <div style={styles.progressTrack}>
        <div
          style={{
            ...styles.progressFill,
            width: `${progress}%`,
            transition: "width 1s linear",
          }}
        />
      </div>

      {/* ── Footer info ──────────────────────────────────────────────────── */}
      <div style={styles.footer}>
        <span style={styles.footerSource}>
          📡 Streaming via MegaPlay
        </span>
        <span style={styles.footerProgress}>
          {progress > 0 && `${progress}% watched`}
        </span>
        <span style={styles.footerLang}>
          {language === "sub" ? "🇯🇵 Subtitled" : "🔊 Dubbed"}
        </span>
      </div>

    </div>
  );
}

// ── URL builder ───────────────────────────────────────────────────────────────
function buildEmbedUrl(anilistId, episodeNumber, language) {
  return `https://megaplay.buzz/stream/ani/${anilistId}/${episodeNumber}/${language}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    display:       "flex",
    flexDirection: "column",
    background:    "#0d0d12",
    borderRadius:  "12px",
    overflow:      "hidden",
    border:        "1px solid rgba(255,255,255,0.06)",
  },

  // Header
  header: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    padding:        "10px 14px",
    background:     "#13131a",
    borderBottom:   "1px solid rgba(255,255,255,0.05)",
    gap:            "12px",
    flexWrap:       "wrap",
  },
  headerLeft: {
    display:    "flex",
    alignItems: "center",
    gap:        "10px",
    minWidth:   0,
  },
  epLabel: {
    fontSize:      "0.82rem",
    fontWeight:    700,
    color:         "#e85d5d",
    whiteSpace:    "nowrap",
    flexShrink:    0,
  },
  epTitle: {
    fontSize:     "0.82rem",
    color:        "#a0a0b8",
    overflow:     "hidden",
    whiteSpace:   "nowrap",
    textOverflow: "ellipsis",
  },
  headerRight: {
    display:    "flex",
    alignItems: "center",
    gap:        "8px",
    flexShrink: 0,
  },

  // Language toggle
  langToggle: {
    display:      "flex",
    background:   "#1a1a24",
    borderRadius: "6px",
    overflow:     "hidden",
    border:       "1px solid rgba(255,255,255,0.06)",
  },
  langBtn: {
    padding:        "5px 12px",
    background:     "transparent",
    border:         "none",
    color:          "#5a5a7a",
    fontSize:       "0.72rem",
    fontWeight:     700,
    cursor:         "pointer",
    letterSpacing:  "0.06em",
    transition:     "all 0.15s",
  },
  langBtnActive: {
    background: "#e85d5d",
    color:      "#fff",
  },
  reloadBtn: {
    width:        "30px",
    height:       "30px",
    background:   "#1a1a24",
    border:       "1px solid rgba(255,255,255,0.06)",
    borderRadius: "6px",
    color:        "#5a5a7a",
    fontSize:     "1rem",
    cursor:       "pointer",
    display:      "flex",
    alignItems:   "center",
    justifyContent: "center",
    transition:   "all 0.15s",
  },

  // Player
  playerWrap: {
    position:        "relative",
    width:           "100%",
    aspectRatio:     "16/9",
    background:      "#000",
    overflow:        "hidden",
  },
  iframe: {
    position: "absolute",
    inset:    0,
    width:    "100%",
    height:   "100%",
    border:   "none",
  },

  // Loading overlay
  loadingOverlay: {
    position:       "absolute",
    inset:          0,
    background:     "rgba(0,0,0,0.85)",
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "16px",
    zIndex:         10,
  },
  spinner: {
    width:       "40px",
    height:      "40px",
    borderRadius:"50%",
    border:      "3px solid rgba(232,93,93,0.2)",
    borderTopColor: "#e85d5d",
    animation:   "spin 0.8s linear infinite",
  },
  loadingText: {
    color:     "#a0a0b8",
    fontSize:  "0.85rem",
    textAlign: "center",
    maxWidth:  "280px",
    lineHeight: 1.5,
  },

  // Error overlay
  errorOverlay: {
    position:       "absolute",
    inset:          0,
    background:     "rgba(0,0,0,0.9)",
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    gap:            "12px",
    zIndex:         10,
    padding:        "24px",
  },
  errorIcon: {
    fontSize: "2rem",
    color:    "#e85d5d",
  },
  errorText: {
    color:     "#a0a0b8",
    fontSize:  "0.88rem",
    textAlign: "center",
    maxWidth:  "320px",
    lineHeight: 1.5,
  },
  errorActions: {
    display: "flex",
    gap:     "8px",
    flexWrap:"wrap",
    justifyContent:"center",
  },
  errorBtn: {
    background:   "rgba(232,93,93,0.15)",
    border:       "1px solid rgba(232,93,93,0.3)",
    borderRadius: "7px",
    color:        "#e85d5d",
    fontSize:     "0.82rem",
    fontWeight:   600,
    padding:      "7px 16px",
    cursor:       "pointer",
  },

  // Complete overlay
  completeOverlay: {
    position:       "absolute",
    inset:          0,
    background:     "rgba(0,0,0,0.88)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    zIndex:         20,
    backdropFilter: "blur(4px)",
  },
  completeCard: {
    background:    "#1a1a24",
    border:        "1px solid rgba(255,255,255,0.08)",
    borderRadius:  "14px",
    padding:       "28px 32px",
    display:       "flex",
    flexDirection: "column",
    alignItems:    "center",
    gap:           "8px",
    maxWidth:      "360px",
    width:         "90%",
    textAlign:     "center",
  },
  completeTitle: {
    fontSize:   "1.1rem",
    fontWeight: 700,
    color:      "#fff",
  },
  completeSub: {
    fontSize: "0.85rem",
    color:    "#5a5a7a",
  },
  completeActions: {
    display:  "flex",
    flexDirection: "column",
    gap:      "8px",
    width:    "100%",
    marginTop:"8px",
  },
  nextBtn: {
    background:   "#e85d5d",
    border:       "none",
    borderRadius: "8px",
    color:        "#fff",
    fontSize:     "0.9rem",
    fontWeight:   700,
    padding:      "11px",
    cursor:       "pointer",
    width:        "100%",
  },
  replayBtn: {
    background:   "rgba(255,255,255,0.06)",
    border:       "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    color:        "#a0a0b8",
    fontSize:     "0.85rem",
    fontWeight:   600,
    padding:      "9px",
    cursor:       "pointer",
    width:        "100%",
  },
  dismissOverlayBtn: {
    background:   "transparent",
    border:       "none",
    color:        "#3a3a52",
    fontSize:     "0.78rem",
    cursor:       "pointer",
    padding:      "4px",
  },

  // Progress bar
  progressTrack: {
    height:     "3px",
    background: "rgba(255,255,255,0.06)",
    width:      "100%",
  },
  progressFill: {
    height:     "100%",
    background: "linear-gradient(90deg, #e85d5d, #ff9f7f)",
    borderRadius:"0 2px 2px 0",
  },

  // Footer
  footer: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    padding:        "8px 14px",
    background:     "#13131a",
    borderTop:      "1px solid rgba(255,255,255,0.04)",
    flexWrap:       "wrap",
    gap:            "6px",
  },
  footerSource: {
    fontSize: "0.72rem",
    color:    "#3a3a52",
  },
  footerProgress: {
    fontSize: "0.72rem",
    color:    "#5a5a7a",
    fontWeight: 600,
  },
  footerLang: {
    fontSize: "0.72rem",
    color:    "#5a5a7a",
  },

  // Placeholder
  placeholder: {
    display:        "flex",
    flexDirection:  "column",
    alignItems:     "center",
    justifyContent: "center",
    aspectRatio:    "16/9",
    background:     "#0d0d12",
    borderRadius:   "12px",
    border:         "1px solid rgba(255,255,255,0.04)",
    gap:            "12px",
  },
  placeholderIcon: {
    fontSize: "2.5rem",
    opacity:  0.15,
  },
  placeholderText: {
    fontSize: "0.88rem",
    color:    "#3a3a52",
  },
};