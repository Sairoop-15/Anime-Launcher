// backend/services/webtorrent.js
// Downloads torrents to disk — no streaming, no MPV

const WebTorrent = require('webtorrent');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ── Download directory ────────────────────────────────────────────────────────
const DOWNLOAD_DIR =
  process.env.DOWNLOAD_DIR || path.join(os.homedir(), 'Downloads', 'Anime');

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

// ── Singleton WebTorrent client ───────────────────────────────────────────────
const client = new WebTorrent();

client.on('error', (err) => console.error('[WebTorrent] client error:', err));

// ── Internal state ────────────────────────────────────────────────────────────
// Keeps metadata after a torrent is removed from the client (finished downloads)
const finishedDownloads = new Map(); // infoHash → snapshot

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTorrent(torrent) {
  return {
    infoHash: torrent.infoHash,
    name: torrent.name || torrent.infoHash,
    progress: parseFloat((torrent.progress * 100).toFixed(1)),   // 0–100
    downloaded: torrent.downloaded,
    total: torrent.length || 0,
    downloadSpeed: torrent.downloadSpeed,
    uploadSpeed: torrent.uploadSpeed,
    numPeers: torrent.numPeers,
    done: torrent.done,
    savePath: DOWNLOAD_DIR,
    files: (torrent.files || []).map((f) => ({
      name: f.name,
      length: f.length,
      downloaded: f.downloaded,
      progress: parseFloat((f.progress * 100).toFixed(1)),
    })),
  };
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Add a magnet/torrent and start downloading to DOWNLOAD_DIR.
 * Resolves immediately with initial stats; poll /downloads/:infoHash for progress.
 */
function addDownload(magnet) {
  return new Promise((resolve, reject) => {
    // Already active?
    const existing = client.get(magnet);
    if (existing) {
      return resolve(formatTorrent(existing));
    }

    client.add(magnet, { path: DOWNLOAD_DIR }, (torrent) => {
      console.log(`[WebTorrent] started: ${torrent.name}`);

      torrent.on('error', (err) => {
        console.error(`[WebTorrent] torrent error (${torrent.name}):`, err.message);
      });

      torrent.on('done', () => {
        console.log(`[WebTorrent] finished: ${torrent.name}`);
        // Snapshot finished state so it still shows up in getAllDownloads()
        finishedDownloads.set(torrent.infoHash, {
          ...formatTorrent(torrent),
          done: true,
          progress: 100,
        });
      });

      resolve(formatTorrent(torrent));
    });

    // Surface add errors
    client.once('error', (err) => reject(err));
  });
}

/**
 * Live stats for one torrent. Returns null if unknown.
 */
function getDownloadStats(infoHash) {
  const active = client.get(infoHash);
  if (active) return formatTorrent(active);
  if (finishedDownloads.has(infoHash)) return finishedDownloads.get(infoHash);
  return null;
}

/**
 * All active + finished downloads.
 */
function getAllDownloads() {
  const active = client.torrents.map(formatTorrent);
  const finished = [...finishedDownloads.values()].filter(
    (f) => !active.find((a) => a.infoHash === f.infoHash)
  );
  return [...active, ...finished];
}

/**
 * Remove / cancel a download.  destroyStore=false keeps files already on disk.
 */
function removeDownload(infoHash, deleteFiles = false) {
  return new Promise((resolve) => {
    const torrent = client.get(infoHash);
    finishedDownloads.delete(infoHash);
    if (!torrent) return resolve({ removed: false, reason: 'not found' });

    torrent.destroy({ destroyStore: deleteFiles }, () => {
      resolve({ removed: true, deleteFiles });
    });
  });
}

module.exports = {
  addDownload,
  getDownloadStats,
  getAllDownloads,
  removeDownload,
  DOWNLOAD_DIR,
};