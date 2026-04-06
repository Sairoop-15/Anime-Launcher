import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar.jsx";
import AnimeCard from "../components/AnimeCard.jsx";
import Loader from "../components/Loader.jsx";
import { useSearch, useTrending, useSeasonal } from "../hooks/useSearch.js";

// ── Season helper ─────────────────────────────────────────────────────────────
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month <= 3)  return "WINTER";
  if (month <= 6)  return "SPRING";
  if (month <= 9)  return "SUMMER";
  return "FALL";
}

const SEASON_TABS = ["TRENDING", "WINTER", "SPRING", "SUMMER", "FALL"];
const YEAR        = new Date().getFullYear();

export default function Home() {
  const navigate   = useNavigate();
  const [activeTab, setActiveTab] = useState("TRENDING");

  // ── Search ─────────────────────────────────────────────────────────────────
  const {
    query, results,
    loading: searchLoading,
    error:   searchError,
    hasMore, totalResults,
    setQuery, loadMore, triggerSearch, clear,
  } = useSearch("anilist");

  const isSearching = query.trim().length >= 2;

  // ── Trending ───────────────────────────────────────────────────────────────
  const {
    data:    trending,
    loading: trendingLoading,
    error:   trendingError,
  } = useTrending(1);

  // ── Seasonal ───────────────────────────────────────────────────────────────
  const {
    data:    seasonal,
    loading: seasonalLoading,
  } = useSeasonal(
    activeTab !== "TRENDING" ? activeTab : null,
    YEAR
  );

  // ── Grid data based on tab / search ───────────────────────────────────────
  const gridData = isSearching
    ? results
    : activeTab === "TRENDING"
    ? trending
    : seasonal;

  const gridLoading = isSearching
    ? searchLoading
    : activeTab === "TRENDING"
    ? trendingLoading
    : seasonalLoading;

  return (
    <div style={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⛩</span>
          <div>
            <h1 style={styles.logoTitle}>Anime Launcher</h1>
          </div>
        </div>
      </header>

      {/* ── Hero banner ─────────────────────────────────────────────────── */}
      {!isSearching && trending.length > 0 && (
        <HeroBanner anime={trending[0]} onClick={() => navigate(`/anime/${trending[0].id}`)} />
      )}

      {/* ── Search bar ──────────────────────────────────────────────────── */}
      <section style={styles.searchSection}>
        <SearchBar
          query={query}
          source="anilist"
          loading={searchLoading}
          onQueryChange={setQuery}
          onSourceChange={() => {}}
          onSubmit={triggerSearch}
          onClear={clear}
        />
      </section>

      {/* ── Search results ────────────────────────────────────────────────── */}
      {isSearching && (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>
              Results
              {totalResults > 0 && (
                <span style={styles.countBadge}>{totalResults}</span>
              )}
            </span>
            <button style={styles.clearBtn} onClick={clear}>
              ✕ Clear
            </button>
          </div>

          {searchError && (
            <div className="error-msg">{searchError}</div>
          )}

          {searchLoading && !results.length ? (
            <Loader type="card" count={12} />
          ) : results.length > 0 ? (
            <>
              <div className="card-grid">
                {results.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    source="anilist"
                    onClick={() => navigate(`/anime/${anime.id}`)}
                  />
                ))}
              </div>

              {hasMore && (
                <div style={styles.loadMoreWrap}>
                  <button
                    style={styles.loadMoreBtn}
                    onClick={loadMore}
                    disabled={searchLoading}
                  >
                    {searchLoading ? "Loading..." : "Load more"}
                  </button>
                </div>
              )}
            </>
          ) : !searchLoading ? (
            <div className="empty-state">
              <h3>No results for "{query}"</h3>
              <p>Try a different title</p>
            </div>
          ) : null}
        </section>
      )}

      {/* ── Browse tabs ───────────────────────────────────────────────────── */}
      {!isSearching && (
        <>
          <div style={styles.tabRow}>
            {SEASON_TABS.map((tab) => (
              <button
                key={tab}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab ? styles.tabActive : {}),
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "TRENDING"
                  ? "🔥 Trending"
                  : `${seasonEmoji(tab)} ${capitalize(tab)}`}
                {tab !== "TRENDING" && (
                  <span style={styles.tabYear}>{YEAR}</span>
                )}
              </button>
            ))}
          </div>

          <section style={styles.section}>
            {trendingError && activeTab === "TRENDING" && (
              <div className="error-msg">{trendingError}</div>
            )}

            {gridLoading ? (
              <Loader type="card" count={20} />
            ) : gridData?.length > 0 ? (
              <div className="card-grid">
                {gridData.map((anime) => (
                  <AnimeCard
                    key={anime.id}
                    anime={anime}
                    source="anilist"
                    onClick={() => navigate(`/anime/${anime.id}`)}
                  />
                ))}
              </div>
            ) : !gridLoading ? (
              <div className="empty-state">
                <h3>Nothing here</h3>
                <p>Try a different season or search for a title</p>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

// ── Hero banner — shows top trending anime ────────────────────────────────────
function HeroBanner({ anime, onClick }) {
  const [hovered, setHovered] = useState(false);

  const title  = anime.title?.english || anime.title?.romaji || "";
  const banner = anime.bannerImage    || anime.coverImage?.extraLarge;
  const score  = anime.averageScore;
  const genres = anime.genres?.slice(0, 3) || [];
  const desc   = anime.description?.replace(/<[^>]+>/g, "").slice(0, 180) || "";

  if (!banner) return null;

  return (
    <div
      style={{
        ...heroStyles.wrap,
        cursor: "pointer",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Background image */}
      <div style={{
        ...heroStyles.bg,
        backgroundImage: `url(${banner})`,
        transform: hovered ? "scale(1.02)" : "scale(1)",
        transition: "transform 0.4s ease",
      }} />

      {/* Gradient overlay */}
      <div style={heroStyles.overlay} />

      {/* Content */}
      <div style={heroStyles.content}>
        <div style={heroStyles.left}>
          {/* Trending badge */}
          <span style={heroStyles.trendingBadge}>🔥 #1 Trending</span>

          {/* Title */}
          <h2 style={heroStyles.title}>{title}</h2>

          {/* Meta row */}
          <div style={heroStyles.metaRow}>
            {score && (
              <span style={heroStyles.score}>
                ★ {(score / 10).toFixed(1)}
              </span>
            )}
            {anime.format && (
              <span style={heroStyles.metaTag}>
                {anime.format.replace(/_/g, " ")}
              </span>
            )}
            {anime.episodes && (
              <span style={heroStyles.metaTag}>
                {anime.episodes} eps
              </span>
            )}
            {genres.map((g) => (
              <span key={g} style={heroStyles.genreTag}>{g}</span>
            ))}
          </div>

          {/* Description */}
          {desc && (
            <p style={heroStyles.desc}>{desc}{desc.length >= 180 ? "..." : ""}</p>
          )}

          {/* Watch button */}
          <button
            style={{
              ...heroStyles.watchBtn,
              background: hovered ? "#ff7070" : "#e85d5d",
            }}
          >
            ▶ Watch Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function seasonEmoji(s) {
  return { WINTER: "❄", SPRING: "🌸", SUMMER: "☀", FALL: "🍂" }[s] || "";
}

function capitalize(s) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    maxWidth:  "1400px",
    margin:    "0 auto",
    padding:   "24px 20px 60px",
    minHeight: "100vh",
  },

  // Header
  header: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   "28px",
    flexWrap:       "wrap",
    gap:            "12px",
  },
  logo: {
    display:    "flex",
    alignItems: "center",
    gap:        "14px",
  },
  logoIcon:  { fontSize: "2.2rem", lineHeight: 1 },
  logoTitle: { fontSize: "1.4rem", fontWeight: 800, color: "#fff",
               letterSpacing: "-0.02em", lineHeight: 1.1 },
  logoSub:   { fontSize: "0.75rem", color: "#5a5a7a", marginTop: "2px" },
  poweredBy: {
    display:      "flex",
    alignItems:   "center",
    gap:          "6px",
    fontSize:     "0.75rem",
    color:        "#5a5a7a",
    background:   "#1a1a24",
    border:       "1px solid rgba(255,255,255,0.06)",
    borderRadius: "99px",
    padding:      "5px 12px",
  },
  poweredDot: {
    width:        "6px",
    height:       "6px",
    borderRadius: "50%",
    background:   "#34d399",
    flexShrink:   0,
  },

  // Search
  searchSection: {
    marginBottom: "28px",
    display:      "flex",
    justifyContent: "center",
  },

  // Section
  section: { marginBottom: "28px" },
  sectionHeader: {
    display:        "flex",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   "16px",
  },
  sectionTitle: {
    fontSize:      "0.85rem",
    fontWeight:    700,
    color:         "#fff",
    display:       "flex",
    alignItems:    "center",
    gap:           "8px",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  countBadge: {
    background:   "rgba(232,93,93,0.15)",
    color:        "#e85d5d",
    borderRadius: "99px",
    padding:      "1px 8px",
    fontSize:     "0.72rem",
    fontWeight:   700,
  },
  clearBtn: {
    background:   "transparent",
    border:       "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px",
    color:        "#5a5a7a",
    fontSize:     "0.78rem",
    padding:      "5px 10px",
    cursor:       "pointer",
  },

  // Tabs
  tabRow: {
    display:      "flex",
    gap:          "6px",
    marginBottom: "20px",
    flexWrap:     "wrap",
  },
  tab: {
    display:      "flex",
    alignItems:   "center",
    gap:          "5px",
    padding:      "8px 16px",
    background:   "#1a1a24",
    border:       "1px solid rgba(255,255,255,0.06)",
    borderRadius: "8px",
    color:        "#5a5a7a",
    fontSize:     "0.85rem",
    fontWeight:   600,
    cursor:       "pointer",
    transition:   "all 0.15s",
  },
  tabActive: {
    background:  "rgba(232,93,93,0.12)",
    borderColor: "rgba(232,93,93,0.3)",
    color:       "#fff",
  },
  tabYear: {
    fontSize: "0.7rem",
    color:    "#3a3a52",
    fontWeight: 500,
  },

  // Load more
  loadMoreWrap: {
    display:        "flex",
    justifyContent: "center",
    marginTop:      "24px",
  },
  loadMoreBtn: {
    background:   "#1a1a24",
    border:       "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
    color:        "#a0a0b8",
    fontSize:     "0.88rem",
    fontWeight:   600,
    padding:      "10px 32px",
    cursor:       "pointer",
  },
};

// ── Hero banner styles ────────────────────────────────────────────────────────
const heroStyles = {
  wrap: {
    position:     "relative",
    borderRadius: "16px",
    overflow:     "hidden",
    marginBottom: "28px",
    height:       "380px",
  },
  bg: {
    position:           "absolute",
    inset:              0,
    backgroundSize:     "cover",
    backgroundPosition: "center",
  },
  overlay: {
    position:   "absolute",
    inset:      0,
    background: "linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.1) 100%)",
  },
  content: {
    position: "relative",
    zIndex:   1,
    height:   "100%",
    display:  "flex",
    alignItems: "center",
    padding:  "32px",
  },
  left: {
    display:       "flex",
    flexDirection: "column",
    gap:           "10px",
    maxWidth:      "520px",
  },
  trendingBadge: {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "4px",
    background:   "rgba(232,93,93,0.2)",
    border:       "1px solid rgba(232,93,93,0.4)",
    borderRadius: "99px",
    color:        "#e85d5d",
    fontSize:     "0.72rem",
    fontWeight:   700,
    padding:      "3px 10px",
    width:        "fit-content",
    letterSpacing:"0.04em",
  },
  title: {
    fontSize:    "2rem",
    fontWeight:  800,
    color:       "#fff",
    lineHeight:  1.15,
    letterSpacing: "-0.02em",
  },
  metaRow: {
    display:  "flex",
    flexWrap: "wrap",
    gap:      "6px",
  },
  score: {
    background:   "rgba(52,211,153,0.15)",
    color:        "#34d399",
    borderRadius: "6px",
    padding:      "3px 8px",
    fontSize:     "0.78rem",
    fontWeight:   700,
  },
  metaTag: {
    background:   "rgba(255,255,255,0.1)",
    color:        "#a0a0b8",
    borderRadius: "6px",
    padding:      "3px 8px",
    fontSize:     "0.75rem",
    fontWeight:   600,
  },
  genreTag: {
    background:   "rgba(232,93,93,0.1)",
    color:        "#e85d5d",
    borderRadius: "99px",
    padding:      "3px 9px",
    fontSize:     "0.72rem",
    fontWeight:   600,
    border:       "1px solid rgba(232,93,93,0.2)",
  },
  desc: {
    fontSize:  "0.88rem",
    color:     "rgba(255,255,255,0.65)",
    lineHeight: 1.6,
  },
  watchBtn: {
    display:      "inline-flex",
    alignItems:   "center",
    gap:          "6px",
    background:   "#e85d5d",
    border:       "none",
    borderRadius: "8px",
    color:        "#fff",
    fontSize:     "0.9rem",
    fontWeight:   700,
    padding:      "10px 24px",
    cursor:       "pointer",
    transition:   "background 0.15s",
    width:        "fit-content",
    marginTop:    "4px",
  },
};