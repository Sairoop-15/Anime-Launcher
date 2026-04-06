// ── MegaPlay API wrapper ───────────────────────────────────────────────────────
// Docs: https://megaplay.buzz/
// Streams anime via AniList ID + episode number as an iframe embed

const axios = require("axios");

const MEGAPLAY_BASE = "https://megaplay.buzz";

// ── Language options ──────────────────────────────────────────────────────────
const LANG = {
  SUB: "sub",
  DUB: "dub",
};

// ── Build embed URL from AniList ID + episode number ─────────────────────────
// This is the primary endpoint we use since we already have AniList data
function getAnilistEmbedUrl(anilistId, episodeNumber, language = LANG.SUB) {
  if (!anilistId || !episodeNumber) {
    throw new Error("anilistId and episodeNumber are required");
  }
  const lang = language === "dub" ? LANG.DUB : LANG.SUB;
  return `${MEGAPLAY_BASE}/stream/ani/${anilistId}/${episodeNumber}/${lang}`;
}

// ── Build embed URL from MAL ID + episode number ──────────────────────────────
function getMalEmbedUrl(malId, episodeNumber, language = LANG.SUB) {
  if (!malId || !episodeNumber) {
    throw new Error("malId and episodeNumber are required");
  }
  const lang = language === "dub" ? LANG.DUB : LANG.SUB;
  return `${MEGAPLAY_BASE}/stream/mal/${malId}/${episodeNumber}/${lang}`;
}

// ── Build embed URL from Aniwatch episode ID ──────────────────────────────────
function getAniwatchEmbedUrl(aniwatchEpId, language = LANG.SUB) {
  if (!aniwatchEpId) throw new Error("aniwatchEpId is required");
  const lang = language === "dub" ? LANG.DUB : LANG.SUB;
  return `${MEGAPLAY_BASE}/stream/s-2/${aniwatchEpId}/${lang}`;
}

// ── Build iframe HTML string ──────────────────────────────────────────────────
function buildIframeHtml(embedUrl) {
  return `<iframe src="${embedUrl}" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>`;
}

// ── Get all embed variants for an episode ─────────────────────────────────────
// Returns both sub and dub URLs so frontend can toggle instantly
function getEpisodeEmbeds(anilistId, episodeNumber) {
  return {
    sub: getAnilistEmbedUrl(anilistId, episodeNumber, LANG.SUB),
    dub: getAnilistEmbedUrl(anilistId, episodeNumber, LANG.DUB),
    anilistId:     parseInt(anilistId),
    episodeNumber: parseInt(episodeNumber),
  };
}

// ── Verify embed is accessible (HEAD request) ────────────────────────────────
// Note: MegaPlay disables direct access, so this checks reachability only
async function checkAvailability() {
  try {
    await axios.head(MEGAPLAY_BASE, { timeout: 5000 });
    return { available: true, url: MEGAPLAY_BASE };
  } catch (err) {
    // MegaPlay may block HEAD — still likely available
    if (err.response?.status === 403 || err.response?.status === 405) {
      return { available: true, url: MEGAPLAY_BASE, note: "HEAD blocked but likely up" };
    }
    return { available: false, url: MEGAPLAY_BASE, reason: err.message };
  }
}

// ── postMessage event types sent by MegaPlay player ──────────────────────────
// Frontend can listen for these to implement auto-next, progress tracking etc.
const PLAYER_EVENTS = {
  TIME:     "time",       // { event:"time", time, duration, percent }
  COMPLETE: "complete",   // episode finished
  LOG:      "watching-log", // { type:"watching-log", currentTime, duration }
};

module.exports = {
  getAnilistEmbedUrl,
  getMalEmbedUrl,
  getAniwatchEmbedUrl,
  getEpisodeEmbeds,
  buildIframeHtml,
  checkAvailability,
  PLAYER_EVENTS,
  LANG,
};