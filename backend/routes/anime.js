const express   = require("express");
const router    = express.Router();
const anilist   = require("../services/anilist");
const megaplay  = require("../services/megaplay");

// ── GET /api/anime/trending ───────────────────────────────────────────────────
router.get("/trending", async (req, res, next) => {
  try {
    const page    = parseInt(req.query.page)    || 1;
    const perPage = parseInt(req.query.perPage) || 20;
    const data    = await anilist.getTrendingAnime(page, perPage);
    res.json({ results: data, page, perPage });
  } catch (err) { next(err); }
});

// ── GET /api/anime/seasonal ───────────────────────────────────────────────────
router.get("/seasonal", async (req, res, next) => {
  try {
    const { season, year, page = 1, perPage = 20 } = req.query;
    if (!season || !year) {
      return res.status(400).json({ error: "season and year are required" });
    }
    const valid = ["WINTER", "SPRING", "SUMMER", "FALL"];
    if (!valid.includes(season.toUpperCase())) {
      return res.status(400).json({
        error: `season must be one of: ${valid.join(", ")}`,
      });
    }
    const data = await anilist.getSeasonalAnime(
      season.toUpperCase(),
      parseInt(year),
      parseInt(page),
      parseInt(perPage)
    );
    res.json({ results: data, season, year });
  } catch (err) { next(err); }
});

// ── GET /api/anime/search ─────────────────────────────────────────────────────
router.get("/search", async (req, res, next) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q?.trim()) {
      return res.status(400).json({ error: "q is required" });
    }
    const data = await anilist.searchAnime(q.trim(), parseInt(page));
    res.json({ results: data, query: q, page });
  } catch (err) { next(err); }
});

// ── GET /api/anime/info/:id ───────────────────────────────────────────────────
router.get("/info/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: "id must be a number" });
    }
    const data = await anilist.getAnimeById(parseInt(id));
    res.json(data);
  } catch (err) { next(err); }
});

// ── GET /api/anime/episodes/:id ───────────────────────────────────────────────
// Returns full episode list built from AniList episode count
router.get("/episodes/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: "id must be a number" });
    }
    const data = await anilist.getEpisodeList(parseInt(id));
    res.json(data);
  } catch (err) { next(err); }
});

// ── GET /api/anime/stream ─────────────────────────────────────────────────────
// Build MegaPlay embed URLs for an episode
// ?anilistId=21&episode=1&language=sub
router.get("/stream", async (req, res, next) => {
  try {
    const {
      anilistId,
      episode,
      language = "sub",
    } = req.query;

    if (!anilistId) {
      return res.status(400).json({ error: "anilistId is required" });
    }
    if (!episode) {
      return res.status(400).json({ error: "episode is required" });
    }
    if (!["sub", "dub"].includes(language)) {
      return res.status(400).json({ error: "language must be sub or dub" });
    }

    const embeds = megaplay.getEpisodeEmbeds(
      parseInt(anilistId),
      parseInt(episode)
    );

    res.json({
      anilistId:     parseInt(anilistId),
      episode:       parseInt(episode),
      language,
      embedUrl:      language === "dub" ? embeds.dub : embeds.sub,
      sub:           embeds.sub,
      dub:           embeds.dub,
      iframe:        megaplay.buildIframeHtml(
                       language === "dub" ? embeds.dub : embeds.sub
                     ),
    });
  } catch (err) { next(err); }
});

// ── GET /api/anime/stream/mal ─────────────────────────────────────────────────
// Build MegaPlay embed URL using MAL ID (fallback)
// ?malId=20&episode=1&language=sub
router.get("/stream/mal", async (req, res, next) => {
  try {
    const { malId, episode, language = "sub" } = req.query;

    if (!malId)   return res.status(400).json({ error: "malId is required"   });
    if (!episode) return res.status(400).json({ error: "episode is required" });

    const embedUrl = megaplay.getMalEmbedUrl(
      parseInt(malId),
      parseInt(episode),
      language
    );

    res.json({
      malId:    parseInt(malId),
      episode:  parseInt(episode),
      language,
      embedUrl,
      iframe:   megaplay.buildIframeHtml(embedUrl),
    });
  } catch (err) { next(err); }
});

// ── GET /api/anime/sources-status ────────────────────────────────────────────
// Check MegaPlay availability
router.get("/sources-status", async (req, res) => {
  try {
    const megaplayStatus = await megaplay.checkAvailability();
    res.json({
      megaplay: megaplayStatus,
      anilist:  { available: true, url: "https://graphql.anilist.co" },
    });
  } catch {
    res.json({
      megaplay: { available: false },
      anilist:  { available: true  },
    });
  }
});

module.exports = router;