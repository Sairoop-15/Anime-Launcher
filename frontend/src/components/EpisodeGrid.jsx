import { useState, useMemo } from "react";

// ── Episode pill / tile ───────────────────────────────────────────────────────
function EpisodeTile({ episode, isCurrent, isWatched, onClick }) {
  const [hovered, setHovered] = useState(false);

  const num = episode.number ?? episode.episodeNum ?? "?";
  const title = episode.title || `Episode ${num}`;
  const hasFiller = episode.isFiller || false;

  return (
    <button
      style={{
        ...styles.tile,
        ...(isCurrent  ? styles.tileCurrent  : {}),
        ...(isWatched  ? styles.tileWatched  : {}),
        ...(hasFiller  ? styles.tileFiller   : {}),
        ...(hovered && !isCurrent ? styles.tileHover : {}),
      }}
      onClick={() => onClick?.(episode)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
    >
      <span style={styles.tileNum}>{num}</span>
      {isCurrent && <div style={styles.playingDot} />}
      {isWatched && !isCurrent && (
        <span style={styles.watchedTick}>✓</span>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EpisodeGrid({
  episodes     = [],
  currentEpId  = null,    // episodeId of currently playing episode
  watchedIds   = [],      // array of watched episodeIds
  onEpisodeClick,
  pageSize     = 100,     // episodes per "page" for large series
}) {
  const [search,  setSearch]  = useState("");
  const [chunk,   setChunk]   = useState(0);   // current page index
  const [sortAsc, setSortAsc] = useState(true);

  // ── Pagination chunks ──────────────────────────────────────────────────────
  const chunks = useMemo(() => {
    const result = [];
    for (let i = 0; i < episodes.length; i += pageSize) {
      result.push(episodes.slice(i, i + pageSize));
    }
    return result;
  }, [episodes, pageSize]);

  const currentChunk = chunks[chunk] || [];

  // ── Filter by search ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = currentChunk;

    if (q) {
      list = episodes.filter((ep) => {
        const num   = String(ep.number ?? ep.episodeNum ?? "");
        const title = (ep.title || "").toLowerCase();
        return num.includes(q) || title.includes(q);
      });
    }

    return sortAsc ? list : [...list].reverse();
  }, [search, currentChunk, episodes, sortAsc]);

  // ── Chunk label helper ─────────────────────────────────────────────────────
  function chunkLabel(i) {
    const start = i * pageSize + 1;
    const end   = Math.min((i + 1) * pageSize, episodes.length);
    return `${start}–${end}`;
  }

  if (!episodes.length) {
    return (
      <div style={styles.empty}>
        <span>No episodes found</span>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>

      {/* ── Header row ────────────────────────────────────────────────────── */}
      <div style={styles.header}>
        <span style={styles.heading}>
          Episodes
          <span style={styles.epCount}>{episodes.length}</span>
        </span>

        <div style={styles.controls}>
          {/* Sort toggle */}
          <button
            style={styles.controlBtn}
            onClick={() => setSortAsc((p) => !p)}
            title={sortAsc ? "Sort descending" : "Sort ascending"}
          >
            {sortAsc ? "↑ Asc" : "↓ Desc"}
          </button>

          {/* Episode search */}
          <div style={styles.searchWrap}>
            <span style={styles.searchIcon}>⌕</span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setChunk(0);
              }}
              placeholder="Ep. number or title..."
              style={styles.searchInput}
            />
            {search && (
              <button
                style={styles.clearBtn}
                onClick={() => setSearch("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Chunk selector (for 100+ episode series) ──────────────────────── */}
      {chunks.length > 1 && !search && (
        <div style={styles.chunkBar}>
          {chunks.map((_, i) => (
            <button
              key={i}
              style={{
                ...styles.chunkBtn,
                ...(chunk === i ? styles.chunkBtnActive : {}),
              }}
              onClick={() => setChunk(i)}
            >
              {chunkLabel(i)}
            </button>
          ))}
        </div>
      )}

      {/* ── Episode grid ──────────────────────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div style={styles.grid}>
          {filtered.map((ep) => {
            const epId    = ep.id || ep.episodeId || ep.number;
            const watched = watchedIds.includes(epId);
            const current = epId === currentEpId;

            return (
              <EpisodeTile
                key={epId}
                episode={ep}
                isCurrent={current}
                isWatched={watched}
                onClick={onEpisodeClick}
              />
            );
          })}
        </div>
      ) : (
        <div style={styles.empty}>
          <span>No episodes match "{search}"</span>
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: "#e85d5d" }} />
          Now playing
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: "#34d399" }} />
          Watched
        </span>
        <span style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: "#2a2a38", border: "1px solid #fbbf2466" }} />
          Filler
        </span>
      </div>

    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },
  heading: {
    fontSize: "0.9rem",
    fontWeight: 700,
    color: "#5a5a7a",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  epCount: {
    color: "#a0a0b8",
    fontWeight: 500,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  controlBtn: {
    background: "#2a2a38",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    color: "#a0a0b8",
    fontSize: "0.75rem",
    fontWeight: 600,
    padding: "4px 8px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  searchWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: 8,
    color: "#5a5a7a",
    fontSize: "0.8rem",
    pointerEvents: "none",
  },
  searchInput: {
    background: "#2a2a38",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    color: "#fff",
    fontSize: "0.8rem",
    padding: "6px 8px 6px 28px",
    width: 160,
    outline: "none",
  },
  clearBtn: {
    position: "absolute",
    right: 6,
    background: "transparent",
    border: "none",
    color: "#e85d5d",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  chunkBar: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap",
  },
  chunkBtn: {
    background: "#2a2a38",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 4,
    color: "#a0a0b8",
    fontSize: "0.7rem",
    fontWeight: 600,
    padding: "4px 8px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  chunkBtnActive: {
    background: "#e85d5d",
    color: "#fff",
    borderColor: "#e85d5d",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))",
    gap: 6,
  },
  tile: {
    aspectRatio: "1",
    background: "#2a2a38",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6,
    color: "#a0a0b8",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 600,
    position: "relative",
    transition: "all 0.15s",
  },
  tileHover: {
    background: "#3a3a4a",
    borderColor: "rgba(255,255,255,0.1)",
  },
  tileCurrent: {
    background: "#e85d5d",
    color: "#fff",
    borderColor: "#e85d5d",
  },
  tileWatched: {
    background: "#34d399",
    color: "#fff",
    borderColor: "#34d399",
  },
  tileFiller: {
    borderColor: "#fbbf24",
  },
  tileNum: {
    zIndex: 1,
  },
  playingDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#fff",
    animation: "pulse 1.5s infinite",
  },
  watchedTick: {
    position: "absolute",
    top: 1,
    right: 1,
    fontSize: "0.6rem",
    color: "#fff",
  },
  empty: {
    textAlign: "center",
    padding: 24,
    color: "#5a5a7a",
    fontSize: "0.9rem",
  },
  legend: {
    display: "flex",
    justifyContent: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: "0.7rem",
    color: "#5a5a7a",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
  },
};

