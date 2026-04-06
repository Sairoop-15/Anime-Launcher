import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import api from "../api.js";
import VideoPlayer from "../components/videoPlayer.jsx";
import EpisodeGrid from "../components/EpisodeGrid.jsx";
import Loader from "../components/Loader.jsx";

// ── localStorage helpers ──────────────────────────────────────────────────────
function getWatched(id)       { try { return JSON.parse(localStorage.getItem(`watched_${id}`) || "[]"); } catch { return []; } }
function saveWatched(id, ids) { localStorage.setItem(`watched_${id}`, JSON.stringify(ids)); }
function getProgress(id)      { try { return JSON.parse(localStorage.getItem(`progress_${id}`) || "{}"); } catch { return {}; } }
function saveProgress(id, ep, pct) {
  const all = getProgress(id);
  all[ep] = pct;
  localStorage.setItem(`progress_${id}`, JSON.stringify(all));
}

export default function AnimeDetail() {
  const { id }      = useParams();
  const { state }   = useLocation();
  const navigate    = useNavigate();

  // ── AniList data ───────────────────────────────────────────────────────────
  const [anilistData, setAnilistData] = useState(state?.anime || null);
  const [episodes,    setEpisodes]    = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(!state?.anime);
  const [loadingEps,  setLoadingEps]  = useState(true);

  // ── Player state ───────────────────────────────────────────────────────────
  const [currentEp,   setCurrentEp]   = useState(null);  // episode object
  const [watchedIds,  setWatchedIds]  = useState([]);
  const [epProgress,  setEpProgress]  = useState({});     // ep number → %

  // ── UI state ───────────────────────────────────────────────────────────────
  const [imgLoaded,   setImgLoaded]   = useState(false);
  const [showDesc,    setShowDesc]    = useState(false);
  const [error,       setError]       = useState(null);
  const [sourcesOk,   setSourcesOk]   = useState(null);

  // ── Load on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    if (!anilistData) fetchMeta();
    fetchEpisodes();
    setWatchedIds(getWatched(id));
    setEpProgress(getProgress(id));
    checkSources();
  }, [id]);

  async function fetchMeta() {
    setLoadingMeta(true);
    try {
      const res = await api.get(`/api/anime/info/${id}`);
      setAnilistData(res.data);
    } catch {
      setError("Failed to load anime info");
    } finally {
      setLoadingMeta(false);
    }
  }

  async function fetchEpisodes() {
    setLoadingEps(true);
    try {
      const res = await api.get(`/api/anime/episodes/${id}`);
      setEpisodes(res.data.episodes || []);

      // Auto-select first episode if none selected
      if (!currentEp && res.data.episodes?.length) {
        setCurrentEp(res.data.episodes[0]);
      }
    } catch {
      setEpisodes([]);
    } finally {
      setLoadingEps(false);
    }
  }

  async function checkSources() {
    try {
      const res = await api.get("/api/anime/sources-status");
      setSourcesOk(res.data.megaplay?.available ?? true);
    } catch {
      setSourcesOk(true); // assume ok
    }
  }

  // ── Episode click ──────────────────────────────────────────────────────────
  const handleEpisodeClick = useCallback((episode) => {
    setCurrentEp(episode);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Mark as watched
    const epId   = episode.id || episode.number;
    const updated = [...new Set([...watchedIds, epId])];
    setWatchedIds(updated);
    saveWatched(id, updated);
  }, [watchedIds, id]);

  // ── Auto-next episode ─────────────────────────────────────────────────────
  const handleNext = useCallback((nextEpNumber) => {
    const next = episodes.find((e) => e.number === nextEpNumber);
    if (next) {
      handleEpisodeClick(next);
    }
  }, [episodes, handleEpisodeClick]);

  // ── Track progress ────────────────────────────────────────────────────────
  const handleProgress = useCallback(({ percent }) => {
    if (!currentEp) return;
    const epNum = currentEp.number;
    setEpProgress((prev) => ({ ...prev, [epNum]: percent }));
    saveProgress(id, epNum, percent);
  }, [currentEp, id]);

  // ── Episode complete ──────────────────────────────────────────────────────
  const handleComplete = useCallback(({ episodeNumber }) => {
    saveProgress(id, episodeNumber, 100);
    setEpProgress((prev) => ({ ...prev, [episodeNumber]: 100 }));
  }, [id]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const banner  = anilistData?.bannerImage;
  const cover   = anilistData?.coverImage?.extraLarge || anilistData?.coverImage?.large;
  const title   = anilistData?.title?.english || anilistData?.title?.romaji || "Loading...";
  const score   = anilistData?.averageScore;
  const genres  = anilistData?.genres        || [];
  const studios = anilistData?.studios?.nodes?.map((n) => n.name) || [];
  const desc    = anilistData?.description?.replace(/<[^>]+>/g, "") || "";
  const color   = anilistData?.coverImage?.color || "#e85d5d";
  const totalEps= anilistData?.episodes      || episodes.length;
  const relations      = anilistData?.relations?.edges          || [];
  const recommendations= anilistData?.recommendations?.nodes   || [];

  const hasNext = currentEp && currentEp.number < totalEps;

  return (
    <div style={styles.page}>

      {/* ── Banner ──────────────────────────────────────────────────────── */}
      <div style={{
        ...styles.banner,
        backgroundImage:   banner ? `url(${banner})` : "none",
        backgroundColor:   "#1a1a24",
      }}>
        <div style={styles.bannerOverlay} />
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div style={styles.hero}>
        <div style={styles.coverWrap}>
          {cover ? (
            <img
              src={cover}
              alt={title}
              style={{ ...styles.cover, opacity: imgLoaded ? 1 : 0 }}
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div style={{
              ...styles.cover,
              background:     `${color}33`,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              fontSize:       "3rem",
            }}>
              🎬
            </div>
          )}
        </div>

        <div style={styles.meta}>
          {loadingMeta ? <Loader type="spinner" /> : (
            <>
              <h1 style={styles.title}>{title}</h1>

              {anilistData?.title?.romaji &&
               anilistData?.title?.english &&
               anilistData.title.romaji !== title && (
                <p style={styles.titleAlt}>{anilistData.title.romaji}</p>
              )}

              {/* Tags */}
              <div style={styles.tagRow}>
                {score && (
                  <span style={{ ...styles.tag, color:"#34d399", background:"rgba(52,211,153,0.12)" }}>
                    ★ {(score / 10).toFixed(1)}
                  </span>
                )}
                {anilistData?.format && (
                  <span style={styles.tag}>
                    {anilistData.format.replace(/_/g, " ")}
                  </span>
                )}
                {anilistData?.status && (
                  <span style={{ ...styles.tag, color: statusColor(anilistData.status) }}>
                    {formatStatus(anilistData.status)}
                  </span>
                )}
                {anilistData?.seasonYear && (
                  <span style={styles.tag}>{anilistData.seasonYear}</span>
                )}
                {totalEps > 0 && (
                  <span style={styles.tag}>{totalEps} episodes</span>
                )}
              </div>

              {/* Studio */}
              {studios.length > 0 && (
                <p style={styles.studio}>🎬 {studios.join(", ")}</p>
              )}

              {/* Genres */}
              {genres.length > 0 && (
                <div style={styles.genreRow}>
                  {genres.slice(0, 6).map((g) => (
                    <span key={g} style={styles.genreTag}>{g}</span>
                  ))}
                </div>
              )}

              {/* Description */}
              {desc && (
                <div>
                  <p style={{
                    ...styles.desc,
                    WebkitLineClamp: showDesc ? "unset" : 3,
                  }}>
                    {desc}
                  </p>
                  {desc.length > 200 && (
                    <button
                      style={styles.descToggle}
                      onClick={() => setShowDesc((p) => !p)}
                    >
                      {showDesc ? "Show less ▲" : "Show more ▼"}
                    </button>
                  )}
                </div>
              )}

              {/* MegaPlay status */}
              {sourcesOk !== null && (
                <div style={styles.sourceRow}>
                  <span style={{
                    ...styles.sourcePill,
                    background:  sourcesOk ? "rgba(52,211,153,0.1)"  : "rgba(232,93,93,0.1)",
                    color:       sourcesOk ? "#34d399"                : "#e85d5d",
                    borderColor: sourcesOk ? "rgba(52,211,153,0.25)" : "rgba(232,93,93,0.25)",
                  }}>
                    <span style={{
                      width:      "5px",
                      height:     "5px",
                      borderRadius:"50%",
                      background: "currentColor",
                      flexShrink: 0,
                    }} />
                    {sourcesOk ? "MegaPlay online" : "MegaPlay unavailable"}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="error-msg" style={{ margin: "0 24px 16px" }}>
          ⚠ {error}
          <button style={styles.dismissBtn} onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div style={styles.content}>

        {/* ── Left column — Video player + episode grid ────────────────── */}
        <div style={styles.leftCol}>

          {/* Video player */}
          <div style={styles.playerSection}>
            <VideoPlayer
              anilistId={id}
              episodeNumber={currentEp?.number}
              episodeTitle={currentEp?.title}
              animeTitle={title}
              onProgress={handleProgress}
              onComplete={handleComplete}
              onNext={hasNext ? handleNext : null}
            />
          </div>

          {/* Now playing info */}
          {currentEp && (
            <div style={styles.nowPlaying}>
              <div style={styles.nowPlayingLeft}>
                <span style={styles.nowPlayingLabel}>Now watching</span>
                <span style={styles.nowPlayingTitle}>
                  {title} — Episode {currentEp.number}
                  {currentEp.title && currentEp.title !== `Episode ${currentEp.number}` && (
                    <span style={styles.nowPlayingEpTitle}>
                      : {currentEp.title}
                    </span>
                  )}
                </span>
              </div>

              {/* Prev / Next nav */}
              <div style={styles.epNav}>
                <button
                  style={{
                    ...styles.epNavBtn,
                    opacity: currentEp.number <= 1 ? 0.3 : 1,
                  }}
                  disabled={currentEp.number <= 1}
                  onClick={() => {
                    const prev = episodes.find((e) => e.number === currentEp.number - 1);
                    if (prev) handleEpisodeClick(prev);
                  }}
                >
                  ← Prev
                </button>
                <span style={styles.epNavCount}>
                  {currentEp.number} / {totalEps}
                </span>
                <button
                  style={{
                    ...styles.epNavBtn,
                    opacity: !hasNext ? 0.3 : 1,
                  }}
                  disabled={!hasNext}
                  onClick={() => handleNext(currentEp.number + 1)}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Episode grid */}
          <div style={styles.episodeSection}>
            <p style={styles.sectionHeading}>Episodes</p>
            {loadingEps ? (
              <Loader type="episode" count={24} />
            ) : episodes.length > 0 ? (
              <EpisodeGrid
                episodes={episodes}
                currentEpId={currentEp?.id}
                watchedIds={watchedIds}
                onEpisodeClick={handleEpisodeClick}
              />
            ) : (
              <div style={styles.noEps}>
                <p>No episode data available from AniList</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column — Anime info ────────────────────────────────── */}
        <div style={styles.rightCol}>

          {/* Watch progress card */}
          {episodes.length > 0 && (
            <div style={styles.infoCard}>
              <p style={styles.infoCardTitle}>Your progress</p>
              <div style={styles.progressStats}>
                <div style={styles.progressStat}>
                  <span style={styles.progressStatNum}>
                    {watchedIds.length}
                  </span>
                  <span style={styles.progressStatLabel}>watched</span>
                </div>
                <div style={styles.progressDivider} />
                <div style={styles.progressStat}>
                  <span style={styles.progressStatNum}>
                    {totalEps - watchedIds.length}
                  </span>
                  <span style={styles.progressStatLabel}>remaining</span>
                </div>
                <div style={styles.progressDivider} />
                <div style={styles.progressStat}>
                  <span style={styles.progressStatNum}>
                    {totalEps > 0
                      ? Math.round((watchedIds.length / totalEps) * 100)
                      : 0}%
                  </span>
                  <span style={styles.progressStatLabel}>complete</span>
                </div>
              </div>

              {/* Overall progress bar */}
              <div style={styles.overallTrack}>
                <div style={{
                  ...styles.overallFill,
                  width: `${totalEps > 0
                    ? Math.round((watchedIds.length / totalEps) * 100)
                    : 0}%`,
                }} />
              </div>
            </div>
          )}

          {/* How to watch card */}
          <div style={styles.infoCard}>
            <p style={styles.infoCardTitle}>How to watch</p>
            <div style={styles.howToList}>
              <HowToStep n="1" text="Click any episode number below the player" />
              <HowToStep n="2" text="Video loads instantly in the player above" />
              <HowToStep n="3" text="Toggle SUB / DUB in the player header" />
              <HowToStep n="4" text="Auto-next plays when episode finishes" />
            </div>
          </div>

          {/* Anime details card */}
          {anilistData && (
            <div style={styles.infoCard}>
              <p style={styles.infoCardTitle}>Details</p>
              <div style={styles.detailList}>
                {anilistData.format && (
                  <DetailRow k="Format"  v={anilistData.format.replace(/_/g, " ")} />
                )}
                {anilistData.status && (
                  <DetailRow k="Status"  v={formatStatus(anilistData.status)} />
                )}
                {anilistData.season && anilistData.seasonYear && (
                  <DetailRow k="Season"  v={`${capitalize(anilistData.season)} ${anilistData.seasonYear}`} />
                )}
                {anilistData.episodes && (
                  <DetailRow k="Episodes" v={anilistData.episodes} />
                )}
                {anilistData.duration && (
                  <DetailRow k="Duration" v={`${anilistData.duration} min`} />
                )}
                {anilistData.averageScore && (
                  <DetailRow k="Score"   v={`${(anilistData.averageScore / 10).toFixed(1)} / 10`} />
                )}
                {anilistData.popularity && (
                  <DetailRow k="Popularity" v={anilistData.popularity.toLocaleString()} />
                )}
                {studios.length > 0 && (
                  <DetailRow k="Studio"  v={studios[0]} />
                )}
                {anilistData.idMal && (
                  <DetailRow k="MAL ID"  v={anilistData.idMal} />
                )}
              </div>
            </div>
          )}

          {/* Characters */}
          {anilistData?.characters?.edges?.length > 0 && (
            <div style={styles.infoCard}>
              <p style={styles.infoCardTitle}>Characters</p>
              <div style={styles.charGrid}>
                {anilistData.characters.edges.slice(0, 6).map((c, i) => (
                  <div key={i} style={styles.charCard}>
                    {c.node.image?.medium && (
                      <img
                        src={c.node.image.medium}
                        alt={c.node.name?.full}
                        style={styles.charImg}
                        loading="lazy"
                      />
                    )}
                    <p style={styles.charName}>
                      {c.node.name?.full?.split(" ")[0]}
                    </p>
                    <p style={styles.charRole}>{c.role}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trailer */}
          {anilistData?.trailer?.id && anilistData.trailer.site === "youtube" && (
            <div style={styles.infoCard}>
              <p style={styles.infoCardTitle}>Trailer</p>

              <a
                href={`https://youtube.com/watch?v=${anilistData.trailer.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.trailerLink}
              >
                <div style={styles.trailerThumb}>
                  <img
                    src={`https://img.youtube.com/vi/${anilistData.trailer.id}/mqdefault.jpg`}
                    alt="Trailer"
                    style={styles.trailerImg}
                  />
                  <div style={styles.trailerPlay}>▶</div>
                </div>
                <span style={styles.trailerLabel}>Watch on YouTube</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Relations ───────────────────────────────────────────────────── */}
      {relations.length > 0 && (
        <section style={styles.relSection}>
          <p style={styles.sectionHeading}>Related</p>
          <div style={styles.relRow}>
            {relations
              .filter((r) =>
                ["SEQUEL", "PREQUEL", "SIDE_STORY", "ALTERNATIVE"].includes(r.relationType)
              )
              .slice(0, 8)
              .map((r) => (
                <RelCard
                  key={r.node.id}
                  node={r.node}
                  type={r.relationType}
                  onClick={() => navigate(`/anime/${r.node.id}`)}
                />
              ))}
          </div>
        </section>
      )}

      {/* ── Recommendations ─────────────────────────────────────────────── */}
      {recommendations.length > 0 && (
        <section style={styles.relSection}>
          <p style={styles.sectionHeading}>You might also like</p>
          <div style={styles.relRow}>
            {recommendations.slice(0, 8).map((r) => {
              const m = r.mediaRecommendation;
              return (
                <RelCard
                  key={m.id}
                  node={m}
                  type={null}
                  onClick={() => navigate(`/anime/${m.id}`)}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function HowToStep({ n, text }) {
  return (
    <div style={howToStyles.row}>
      <span style={howToStyles.num}>{n}</span>
      <span style={howToStyles.text}>{text}</span>
    </div>
  );
}

function DetailRow({ k, v }) {
  return (
    <div style={detailStyles.row}>
      <span style={detailStyles.key}>{k}</span>
      <span style={detailStyles.val}>{v}</span>
    </div>
  );
}

function RelCard({ node, type, onClick }) {
  const [hovered, setHovered] = useState(false);
  const title = node.title?.english || node.title?.romaji || "Unknown";
  return (
    <div
      style={{ ...relStyles.card, ...(hovered ? relStyles.hover : {}) }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {node.coverImage?.large && (
        <img
          src={node.coverImage.large}
          alt={title}
          style={relStyles.cover}
          loading="lazy"
        />
      )}
      <div style={relStyles.info}>
        {type && (
          <span style={relStyles.type}>
            {type.replace("_", " ")}
          </span>
        )}
        {node.averageScore && (
          <span style={relStyles.score}>
            ★ {(node.averageScore / 10).toFixed(1)}
          </span>
        )}
        <p style={relStyles.title}>{title}</p>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusColor(s) {
  return {
    FINISHED:          "#34d399",
    RELEASING:         "#60a5fa",
    NOT_YET_RELEASED:  "#fbbf24",
    CANCELLED:         "#e85d5d",
    HIATUS:            "#a78bfa",
  }[s] || "#5a5a7a";
}

function formatStatus(s) {
  return {
    FINISHED:          "Finished",
    RELEASING:         "Airing",
    NOT_YET_RELEASED:  "Upcoming",
    CANCELLED:         "Cancelled",
    HIATUS:            "Hiatus",
  }[s] || s;
}

function capitalize(s) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page:         { minHeight: "100vh", paddingBottom: 60, background: "#0f0f13" },
  banner:       { height: 220, backgroundSize: "cover", backgroundPosition: "center top", position: "relative" },
  bannerOverlay:{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,15,19,0.2) 0%, rgba(15,15,19,1) 100%)" },
  backBtn:      { position: "absolute", top: 16, left: 16, background: "rgba(0,0,0,0.5)",
                  backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, color: "#fff", fontSize: "0.85rem", fontWeight: 600,
                  padding: "7px 14px", cursor: "pointer", zIndex: 10 },

  // Hero
  hero:         { display: "flex", gap: 24, padding: "0 24px", marginTop: -100,
                  position: "relative", zIndex: 1, alignItems: "flex-end",
                  marginBottom: 28, flexWrap: "wrap" },
  coverWrap:    { flexShrink: 0 },
  cover:        { width: 150, aspectRatio: "2/3", borderRadius: 10, objectFit: "cover",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  border: "3px solid rgba(255,255,255,0.06)", transition: "opacity 0.3s ease" },
  meta:         { flex: 1, minWidth: 240, paddingBottom: 8, display: "flex", flexDirection: "column", gap: 10 },
  title:        { fontSize: "1.7rem", fontWeight: 800, color: "#fff", lineHeight: 1.2, letterSpacing: "-0.02em" },
  titleAlt:     { fontSize: "0.88rem", color: "#5a5a7a", marginTop: -6 },
  tagRow:       { display: "flex", flexWrap: "wrap", gap: 6 },
  tag:          { background: "rgba(255,255,255,0.08)", color: "#a0a0b8",
                  borderRadius: 6, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600 },
  studio:       { fontSize: "0.8rem", color: "#5a5a7a" },
  genreRow:     { display: "flex", flexWrap: "wrap", gap: 6 },
  genreTag:     { background: "rgba(232,93,93,0.1)", color: "#e85d5d", borderRadius: "99px",
                  padding: "3px 10px", fontSize: "0.74rem", fontWeight: 600,
                  border: "1px solid rgba(232,93,93,0.2)" },
  desc:         { fontSize: "0.87rem", color: "#a0a0b8", lineHeight: 1.6,
                  overflow: "hidden", display: "-webkit-box", WebkitBoxOrient: "vertical" },
  descToggle:   { background: "transparent", border: "none", color: "#e85d5d",
                  fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", padding: "4px 0" },
  sourceRow:    { display: "flex", gap: 6 },
  sourcePill:   { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px",
                  borderRadius: "99px", fontSize: "0.72rem", fontWeight: 600, border: "1px solid" },
  dismissBtn:   { background: "transparent", border: "none", color: "#e85d5d",
                  cursor: "pointer", marginLeft: 12, fontSize: "0.85rem" },

  // Content
  content:      { display: "grid", gridTemplateColumns: "1fr 300px", gap: 24,
                  padding: "0 24px", alignItems: "start" },
  leftCol:      { minWidth: 0, display: "flex", flexDirection: "column", gap: 16 },
  rightCol:     { display: "flex", flexDirection: "column", gap: 12,
                  position: "sticky", top: 20 },

  // Player section
  playerSection:{ borderRadius: 12, overflow: "hidden" },

  // Now playing
  nowPlaying:   { background: "#1a1a24", border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 10, padding: "12px 16px", display: "flex",
                  alignItems: "center", justifyContent: "space-between",
                  gap: 12, flexWrap: "wrap" },
  nowPlayingLeft:{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 },
  nowPlayingLabel:{ fontSize: "0.65rem", fontWeight: 700, color: "#e85d5d",
                   textTransform: "uppercase", letterSpacing: "0.08em" },
  nowPlayingTitle:{ fontSize: "0.88rem", fontWeight: 600, color: "#fff",
                   overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  nowPlayingEpTitle:{ fontWeight: 400, color: "#a0a0b8" },

  // Ep nav
  epNav:        { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  epNavBtn:     { background: "#2a2a38", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6, color: "#a0a0b8", fontSize: "0.78rem",
                  fontWeight: 600, padding: "5px 12px", cursor: "pointer", transition: "all 0.15s" },
  epNavCount:   { fontSize: "0.78rem", color: "#5a5a7a", fontWeight: 600, whiteSpace: "nowrap" },

  // Episode section
  episodeSection:{ background: "#1a1a24", border: "1px solid rgba(255,255,255,0.05)",
                   borderRadius: 12, padding: 16 },
  sectionHeading:{ fontSize: "0.78rem", fontWeight: 700, color: "#5a5a7a",
                   textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 },
  noEps:        { textAlign: "center", padding: 24, color: "#5a5a7a", fontSize: "0.88rem" },

  // Info cards
  infoCard:     { background: "#1a1a24", border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: 10, padding: "14px 16px", display: "flex",
                  flexDirection: "column", gap: 10 },
  infoCardTitle:{ fontSize: "0.7rem", fontWeight: 700, color: "#5a5a7a",
                  textTransform: "uppercase", letterSpacing: "0.08em" },

  // Progress stats
  progressStats:{ display: "flex", alignItems: "center", justifyContent: "space-around" },
  progressStat: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  progressStatNum:{ fontSize: "1.3rem", fontWeight: 800, color: "#fff" },
  progressStatLabel:{ fontSize: "0.68rem", color: "#5a5a7a", fontWeight: 500 },
  progressDivider:{ width: 1, height: 28, background: "rgba(255,255,255,0.06)" },
  overallTrack: { height: 4, background: "rgba(255,255,255,0.06)",
                  borderRadius: "99px", overflow: "hidden" },
  overallFill:  { height: "100%", background: "linear-gradient(90deg,#e85d5d,#ff9f7f)",
                  borderRadius: "99px", transition: "width 0.4s ease" },

  // Characters
  charGrid:     { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  charCard:     { display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  charImg:      { width: "100%", aspectRatio: "1/1", borderRadius: 8,
                  objectFit: "cover", objectPosition: "top" },
  charName:     { fontSize: "0.7rem", fontWeight: 600, color: "#a0a0b8",
                  textAlign: "center", lineHeight: 1.2 },
  charRole:     { fontSize: "0.62rem", color: "#3a3a52", textTransform: "capitalize" },

  // Trailer
  trailerLink:  { display: "flex", flexDirection: "column", gap: 8,
                  textDecoration: "none", color: "inherit" },
  trailerThumb: { position: "relative", borderRadius: 8, overflow: "hidden",
                  aspectRatio: "16/9" },
  trailerImg:   { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  trailerPlay:  { position: "absolute", inset: 0, display: "flex", alignItems: "center",
                  justifyContent: "center", background: "rgba(0,0,0,0.5)",
                  color: "#fff", fontSize: "1.8rem" },
  trailerLabel: { fontSize: "0.75rem", color: "#5a5a7a", textAlign: "center" },

  // Relations
  relSection:   { padding: "20px 24px 0" },
  relRow:       { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 },
};

const howToStyles = {
  row:  { display: "flex", alignItems: "center", gap: 10 },
  num:  { width: 20, height: 20, borderRadius: "50%", background: "rgba(232,93,93,0.15)",
          color: "#e85d5d", fontSize: "0.7rem", fontWeight: 700, display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0 },
  text: { fontSize: "0.8rem", color: "#a0a0b8", lineHeight: 1.4 },
};

const detailStyles = {
  row: { display: "flex", justifyContent: "space-between", alignItems: "center",
         borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: 6 },
  key: { fontSize: "0.75rem", color: "#5a5a7a", fontWeight: 500 },
  val: { fontSize: "0.78rem", color: "#e0e0f0", fontWeight: 600 },
};

const relStyles = {
  card:  { flexShrink: 0, width: 110, background: "#1e1e2a", borderRadius: 8,
           overflow: "hidden", cursor: "pointer", transition: "all 0.2s ease",
           border: "1px solid rgba(255,255,255,0.05)" },
  hover: { transform: "translateY(-3px)", boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
           borderColor: "rgba(255,255,255,0.1)" },
  cover: { width: "100%", aspectRatio: "2/3", objectFit: "cover", display: "block" },
  info:  { padding: "6px 8px", display: "flex", flexDirection: "column", gap: 3 },
  type:  { fontSize: "0.6rem", fontWeight: 700, color: "#e85d5d",
           textTransform: "uppercase", letterSpacing: "0.06em" },
  score: { fontSize: "0.68rem", color: "#34d399", fontWeight: 600 },
  title: { fontSize: "0.7rem", color: "#a0a0b8", lineHeight: 1.3, overflow: "hidden",
           display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" },
};