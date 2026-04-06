const express = require("express");
const router  = express.Router();
const { launchMPV, killSession, killAll, getSession, getAllSessions, checkMPV } = require("../utils/mpv");

// ── GET /api/player/check ─────────────────────────────────────────────────────
// Check if MPV is installed (kept for local file playback)
router.get("/check", async (req, res, next) => {
  try {
    const result = await checkMPV();
    if (!result.installed) {
      return res.status(503).json({
        installed: false,
        error: "MPV not found",
        installGuide: {
          linux:   "sudo apt install mpv  OR  sudo pacman -S mpv",
          mac:     "brew install mpv",
          windows: "https://mpv.io/installation/",
        },
      });
    }
    res.json(result);
  } catch (err) { next(err); }
});

// ── GET /api/player/sessions ──────────────────────────────────────────────────
router.get("/sessions", (req, res) => {
  const sessions = getAllSessions();
  res.json({ sessions, total: sessions.length });
});

// ── GET /api/player/sessions/:sessionId ──────────────────────────────────────
router.get("/sessions/:sessionId", (req, res) => {
  const session = getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }
  res.json(session);
});

// ── POST /api/player/play/local ───────────────────────────────────────────────
// Play a local file in MPV — still useful as a bonus feature
router.post("/play/local", async (req, res, next) => {
  try {
    const {
      filePath,
      title      = "Anime Launcher",
      startTime  = null,
      subFile    = null,
      volume     = 100,
      fullscreen = true,
    } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: "filePath is required" });
    }
    if (filePath.includes("..")) {
      return res.status(400).json({ error: "Invalid file path" });
    }

    const session = await launchMPV(filePath, {
      title,
      startTime,
      subFile,
      volume,
      fullscreen,
    });

    res.json({ success: true, ...session });
  } catch (err) { next(err); }
});

// ── POST /api/player/play/url ─────────────────────────────────────────────────
// Play any direct HTTP/HTTPS URL in MPV
// Useful if user wants to play a raw video URL outside the browser
router.post("/play/url", async (req, res, next) => {
  try {
    const {
      url,
      title      = "Anime Launcher",
      subFile    = null,
      startTime  = null,
      volume     = 100,
      fullscreen = true,
      hwdec      = "auto",
    } = req.body;

    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return res.status(400).json({ error: "url must start with http:// or https://" });
    }

    const session = await launchMPV(url, {
      title,
      subFile,
      startTime,
      volume,
      fullscreen,
      hwdec,
    });

    res.json({ success: true, ...session });
  } catch (err) { next(err); }
});

// ── DELETE /api/player/sessions/:sessionId ────────────────────────────────────
router.delete("/sessions/:sessionId", (req, res) => {
  const result = killSession(req.params.sessionId);
  if (!result.killed) {
    return res.status(404).json({ error: result.reason || "Session not found" });
  }
  res.json({ success: true, ...result });
});

// ── DELETE /api/player/sessions ───────────────────────────────────────────────
router.delete("/sessions", (req, res) => {
  const results = killAll();
  res.json({
    success: true,
    killed:  results.filter((r) => r.killed).length,
    total:   results.length,
  });
});

module.exports = router;