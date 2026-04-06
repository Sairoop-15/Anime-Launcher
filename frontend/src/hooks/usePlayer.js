import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

// ── Status constants ──────────────────────────────────────────────────────────
export const PLAYER_STATUS = {
  IDLE:      "idle",
  BUFFERING: "buffering",
  LAUNCHING: "launching",
  PLAYING:   "playing",
  FINISHED:  "finished",
  CRASHED:   "crashed",
  ERROR:     "error",
};

// ── Main hook ─────────────────────────────────────────────────────────────────
export function usePlayer() {
  const [status, setStatus]         = useState(PLAYER_STATUS.IDLE);
  const [session, setSession]       = useState(null);   // current MPV session
  const [error, setError]           = useState(null);
  const [mpvInstalled, setMpvInstalled] = useState(null); // null = unchecked
  const [torrentStats, setTorrentStats] = useState(null);
  const [nowPlaying, setNowPlaying] = useState(null);   // { title, quality, source }

  // Polling refs
  const sessionPollRef  = useRef(null);
  const torrentPollRef  = useRef(null);

  // ── Check MPV on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    checkMPV();
  }, []);

  // ── Cleanup polls on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopSessionPoll();
      stopTorrentPoll();
    };
  }, []);

  // ── Check MPV installation ─────────────────────────────────────────────────
  const checkMPV = useCallback(async () => {
    try {
      const res = await axios.get("/api/player/check");
      setMpvInstalled(res.data.installed);
      return res.data;
    } catch (err) {
      setMpvInstalled(false);
      return { installed: false };
    }
  }, []);

  // ── Play a direct HLS / HTTP stream URL ───────────────────────────────────
  const playStream = useCallback(async (url, options = {}) => {
    if (!url) return setError("No stream URL provided");

    setStatus(PLAYER_STATUS.LAUNCHING);
    setError(null);
    setNowPlaying({
      title: options.title || "Anime Launcher",
      quality: options.quality || null,
      source: "stream",
      url,
    });

    try {
      const res = await axios.post("/api/player/play/stream", {
        url,
        title:      options.title      || "Anime Launcher",
        subFile:    options.subFile    || null,
        startTime:  options.startTime  || null,
        quality:    options.quality    || null,
        volume:     options.volume     ?? 100,
        fullscreen: options.fullscreen ?? true,
        hwdec:      options.hwdec      || "auto",
      });

      setSession(res.data);
      setStatus(PLAYER_STATUS.PLAYING);
      startSessionPoll(res.data.sessionId);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to launch MPV";
      setError(msg);
      setStatus(PLAYER_STATUS.ERROR);
      throw new Error(msg);
    }
  }, []);

  // ── Play a HiAnime episode (full pipeline) ────────────────────────────────
 // In usePlayer.js replace playEpisode body:
const playEpisode = useCallback(async (episodeId, options = {}) => {
  // episodeId is unused now — we use animeTitle + episodeNumber from options
  setStatus(PLAYER_STATUS.LAUNCHING);
  setError(null);
  setNowPlaying({
    title:   options.title || "Anime Launcher",
    quality: options.quality || null,
    source:  "nyaa",
  });

  try {
    const res = await axios.post("/api/player/play/episode", {
      animeTitle:    options.animeTitle,
      episodeNumber: options.episodeNumber,
      quality:       options.quality    || "1080p",
      title:         options.title      || "Anime Launcher",
      sources:       options.sources    || "nyaa",
      startTime:     options.startTime  || null,
      volume:        options.volume     ?? 100,
      fullscreen:    options.fullscreen ?? true,
    });

    setSession(res.data);
    setStatus(PLAYER_STATUS.PLAYING);
    startSessionPoll(res.data.sessionId);
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.error || "Playback failed";
    setError(msg);
    setStatus(PLAYER_STATUS.ERROR);
    throw new Error(msg);
  }
}, []);

  // ── Play via torrent magnet ────────────────────────────────────────────────
  const playTorrent = useCallback(async (magnet, options = {}) => {
    if (!magnet) return setError("No magnet link provided");

    setStatus(PLAYER_STATUS.BUFFERING);
    setError(null);
    setTorrentStats(null);
    setNowPlaying({
      title:   options.title   || "Anime Launcher",
      quality: options.quality || null,
      source:  "torrent",
      magnet,
    });

    try {
      // Step 1 — Add torrent, get infoHash
      const addRes = await axios.post("/api/torrent/add", { magnet });
      const { infoHash, streamUrl, fileName } = addRes.data;

      // Step 2 — Poll torrent stats while buffering
      await pollTorrentBuffer(infoHash, options.minBuffer ?? 0.5);

      // Step 3 — Launch MPV with the local stream URL
      const playRes = await axios.post("/api/player/play/stream", {
        url:        streamUrl,
        title:      options.title      || fileName || "Anime Launcher",
        quality:    options.quality    || null,
        subFile:    options.subFile    || null,
        startTime:  options.startTime  || null,
        volume:     options.volume     ?? 100,
        fullscreen: options.fullscreen ?? true,
      });

      setSession(playRes.data);
      setStatus(PLAYER_STATUS.PLAYING);
      startSessionPoll(playRes.data.sessionId);

      // Step 4 — Keep polling torrent stats during playback
      startTorrentPoll(infoHash);

      return { ...playRes.data, infoHash, streamUrl };
    } catch (err) {
      const msg = err.response?.data?.error || "Torrent playback failed";
      setError(msg);
      setStatus(PLAYER_STATUS.ERROR);
      stopTorrentPoll();
      throw new Error(msg);
    }
  }, []);

  // ── Kill current MPV session ───────────────────────────────────────────────
  const stop = useCallback(async () => {
    if (!session?.sessionId) return;

    try {
      await axios.delete(`/api/player/sessions/${session.sessionId}`);
    } catch (_) {
      // Session may already be gone — ignore
    } finally {
      stopSessionPoll();
      stopTorrentPoll();
      setSession(null);
      setStatus(PLAYER_STATUS.IDLE);
      setNowPlaying(null);
      setTorrentStats(null);
      setError(null);
    }
  }, [session]);

  // ── Kill ALL MPV sessions ─────────────────────────────────────────────────
  const stopAll = useCallback(async () => {
    try {
      await axios.delete("/api/player/sessions");
    } catch (_) {}
    finally {
      stopSessionPoll();
      stopTorrentPoll();
      setSession(null);
      setStatus(PLAYER_STATUS.IDLE);
      setNowPlaying(null);
      setTorrentStats(null);
      setError(null);
    }
  }, []);

  // ── Poll MPV session status ────────────────────────────────────────────────
  function startSessionPoll(sessionId) {
    stopSessionPoll();
    sessionPollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/api/player/sessions/${sessionId}`);
        const s = res.data;
        setSession(s);

        if (s.status === "finished") {
          setStatus(PLAYER_STATUS.FINISHED);
          stopSessionPoll();
          stopTorrentPoll();
        } else if (s.status === "crashed") {
          setStatus(PLAYER_STATUS.CRASHED);
          setError("MPV crashed unexpectedly");
          stopSessionPoll();
          stopTorrentPoll();
        }
      } catch (_) {
        // Session gone from server — playback ended
        stopSessionPoll();
        setStatus(PLAYER_STATUS.FINISHED);
      }
    }, 3000); // poll every 3s
  }

  function stopSessionPoll() {
    if (sessionPollRef.current) {
      clearInterval(sessionPollRef.current);
      sessionPollRef.current = null;
    }
  }

  // ── Poll torrent download stats ────────────────────────────────────────────
  function startTorrentPoll(infoHash) {
    stopTorrentPoll();
    torrentPollRef.current = setInterval(async () => {
      try {
        const res = await axios.get(`/api/torrent/stats/${infoHash}`);
        setTorrentStats(res.data);
      } catch (_) {
        stopTorrentPoll();
      }
    }, 2000); // poll every 2s
  }

  function stopTorrentPoll() {
    if (torrentPollRef.current) {
      clearInterval(torrentPollRef.current);
      torrentPollRef.current = null;
    }
  }

  // ── Wait for torrent to buffer before launching ────────────────────────────
  function pollTorrentBuffer(infoHash, minPercent = 0.5) {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + 90_000; // 90s max wait
      const iv = setInterval(async () => {
        try {
          const res = await axios.get(`/api/torrent/stats/${infoHash}`);
          const stats = res.data;
          setTorrentStats(stats);

          const progress = parseFloat(stats.progress);
          if (progress >= minPercent) {
            clearInterval(iv);
            resolve();
          } else if (Date.now() > deadline) {
            clearInterval(iv);
            resolve(); // launch anyway, let MPV buffer
          }
        } catch (err) {
          clearInterval(iv);
          reject(new Error("Lost torrent during buffering"));
        }
      }, 1500);
    });
  }

  // ── Derived helpers ────────────────────────────────────────────────────────
  const isPlaying  = status === PLAYER_STATUS.PLAYING;
  const isLoading  = status === PLAYER_STATUS.LAUNCHING ||
                     status === PLAYER_STATUS.BUFFERING;
  const isIdle     = status === PLAYER_STATUS.IDLE ||
                     status === PLAYER_STATUS.FINISHED;

  return {
    // State
    status,
    session,
    error,
    mpvInstalled,
    torrentStats,
    nowPlaying,

    // Derived
    isPlaying,
    isLoading,
    isIdle,

    // Actions
    playStream,
    playEpisode,
    playTorrent,
    stop,
    stopAll,
    checkMPV,

    // Setters
    setError,
  };
}