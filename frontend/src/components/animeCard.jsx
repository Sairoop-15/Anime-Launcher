import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Score color helper ────────────────────────────────────────────────────────
function scoreColor(score) {
  if (!score) return "#5a5a7a";
  if (score >= 80) return "#34d399";
  if (score >= 65) return "#fbbf24";
  return "#e85d5d";
}

// ── Format status label ───────────────────────────────────────────────────────
function formatStatus(status) {
  if (!status) return null;
  const map = {
    FINISHED:        { label: "Finished",    color: "#34d399" },
    RELEASING:       { label: "Airing",      color: "#60a5fa" },
    NOT_YET_RELEASED:{ label: "Upcoming",    color: "#fbbf24" },
    CANCELLED:       { label: "Cancelled",   color: "#e85d5d" },
    HIATUS:          { label: "Hiatus",      color: "#a78bfa" },
  };
  return map[status] || { label: status, color: "#5a5a7a" };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AnimeCard({ anime, source = "anilist" }) {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered]   = useState(false);

  if (!anime) return null;

  // ── Normalise fields across AniList / Consumet shapes ─────────────────────
  const title =
    anime.title?.english ||
    anime.title?.romaji  ||
    anime.title          ||
    "Unknown Title";

  const cover =
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large      ||
    anime.image                  ||
    null;

  const score   = anime.averageScore || null;
  const eps     = anime.episodes     || anime.totalEpisodes || null;
  const format  = anime.format       || null;
  const status  = formatStatus(anime.status);
  const genres  = anime.genres?.slice(0, 2) || [];
  const year    = anime.seasonYear   || anime.releaseDate?.slice(0, 4) || null;
  const color   = anime.coverImage?.color || "#e85d5d";

  // ── Navigate to detail page ────────────────────────────────────────────────
  function handleClick() {
    const id = anime.id || anime.malId;
    navigate(`/anime/${id}`, { state: { anime, source } });
  }

  return (
    <div
      style={{
        ...styles.card,
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? `0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px ${color}44`
          : "0 2px 8px rgba(0,0,0,0.3)",
      }}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Poster ─────────────────────────────────────────────────────────── */}
      <div style={styles.posterWrap}>
        {cover && !imgError ? (
          <img
            src={cover}
            alt={title}
            style={styles.poster}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div style={{ ...styles.posterFallback, background: `${color}33` }}>
            <span style={styles.fallbackIcon}>🎬</span>
          </div>
        )}

        {/* Score badge — top right */}
        {score && (
          <div style={{ ...styles.scoreBadge, color: scoreColor(score) }}>
            ★ {(score / 10).toFixed(1)}
          </div>
        )}

        {/* Format badge — top left */}
        {format && (
          <div style={styles.formatBadge}>
            {format.replace(/_/g, " ")}
          </div>
        )}

        {/* Hover overlay */}
        <div
          style={{
            ...styles.overlay,
            opacity: hovered ? 1 : 0,
          }}
        >
          <button style={styles.playBtn}>▶ Watch</button>
          {genres.map((g) => (
            <span key={g} style={styles.genreTag}>{g}</span>
          ))}
        </div>
      </div>

      {/* ── Info ───────────────────────────────────────────────────────────── */}
      <div style={styles.info}>
        <p style={styles.title} title={title}>
          {title}
        </p>

        <div style={styles.meta}>
          {year && <span style={styles.metaItem}>{year}</span>}
          {year && eps && <span style={styles.dot}>·</span>}
          {eps  && (
            <span style={styles.metaItem}>
              {eps} ep{eps !== 1 ? "s" : ""}
            </span>
          )}
          {status && (
            <>
              <span style={styles.dot}>·</span>
              <span style={{ ...styles.metaItem, color: status.color }}>
                {status.label}
              </span>
            </>
          )}
        </div>
      </div>

      <style>{`
        div[data-animeid] { transition: all 0.2s ease; }
      `}</style>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  card: {
    background: "#22222e",
    borderRadius: "10px",
    overflow: "hidden",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    transition: "all 0.2s ease",
    userSelect: "none",
  },

  // Poster
  posterWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "2/3",
    overflow: "hidden",
    background: "#1a1a24",
  },
  poster: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition: "transform 0.3s ease",
  },
  posterFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  fallbackIcon: {
    fontSize: "2.5rem",
    opacity: 0.4,
  },

  // Badges
  scoreBadge: {
    position: "absolute",
    top: "8px",
    right: "8px",
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    borderRadius: "6px",
    padding: "2px 7px",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  formatBadge: {
    position: "absolute",
    top: "8px",
    left: "8px",
    background: "rgba(0,0,0,0.75)",
    backdropFilter: "blur(4px)",
    borderRadius: "6px",
    padding: "2px 7px",
    fontSize: "0.68rem",
    fontWeight: 600,
    color: "#a0a0b8",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  // Hover overlay
  overlay: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-end",
    padding: "12px",
    gap: "6px",
    transition: "opacity 0.2s ease",
  },
  playBtn: {
    background: "#e85d5d",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "7px 20px",
    fontSize: "0.82rem",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    letterSpacing: "0.04em",
  },
  genreTag: {
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    borderRadius: "4px",
    padding: "2px 8px",
    fontSize: "0.7rem",
    fontWeight: 500,
    width: "100%",
    textAlign: "center",
  },

  // Info row
  info: {
    padding: "10px 10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    flex: 1,
  },
  title: {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "#fff",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    lineHeight: 1.35,
  },
  meta: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "3px",
  },
  metaItem: {
    fontSize: "0.72rem",
    color: "#a0a0b8",
    fontWeight: 500,
  },
  dot: {
    color: "#3a3a52",
    fontSize: "0.72rem",
  },
};