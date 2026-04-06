// const { spawn } = require("child_process");
// const path = require("path");

// // ── Active player processes ───────────────────────────────────────────────────
// // sessionId → { process, url, title, startedAt, status }
// const activeSessions = new Map();

// // ── MPV binary path ───────────────────────────────────────────────────────────
// // Overridable via env var for custom installs
// const MPV_BIN = process.env.MPV_BIN || "mpv";

// // ── Build MPV argument list ───────────────────────────────────────────────────
// function buildArgs(url, options = {}) {
//   const {
//     title = "Anime Launcher",
//     subFile = null,
//     subLang = "eng",
//     quality = null,
//     startTime = null,   // seconds to seek to on open
//     fullscreen = true,
//     hwdec = "auto",     // hardware decoding: auto | no | vaapi | nvdec | d3d11va
//     volume = 100,
//     profile = null,     // mpv profile name from mpv.conf
//     extraArgs = [],
//   } = options;

//   const args = [
//     url,

//     // ── Window ────────────────────────────────────────────────────────────────
//     `--title=${title}`,
//     fullscreen ? "--fullscreen" : "--no-fullscreen",

//     // ── Performance ───────────────────────────────────────────────────────────
//     `--hwdec=${hwdec}`,
//     "--cache=yes",
//     "--cache-secs=120",
//     "--demuxer-max-bytes=150MiB",
//     "--demuxer-max-back-bytes=75MiB",

//     // ── Network (for HLS / HTTP streams) ─────────────────────────────────────
//     "--network-timeout=30",
//     "--stream-lavf-o=reconnect=1",
//     "--stream-lavf-o=reconnect_streamed=1",
//     "--stream-lavf-o=reconnect_delay_max=5",

//     // ── Audio ─────────────────────────────────────────────────────────────────
//     `--volume=${volume}`,
//     "--audio-display=no",

//     // ── Subtitles (default prefs) ─────────────────────────────────────────────
//     `--slang=${subLang}`,
//     "--sub-auto=fuzzy",
//     "--sub-font-size=42",
//     "--sub-color=#FFFFFF",
//     "--sub-border-color=#000000",
//     "--sub-border-size=2.5",
//     "--sub-shadow-offset=1",

//     // ── OSD ───────────────────────────────────────────────────────────────────
//     "--osd-level=1",
//     `--osd-msg1=\${title} — \${time-pos} / \${duration}`,

//     // ── IPC socket (for future remote control) ────────────────────────────────
//     "--input-ipc-server=/tmp/mpvsocket",

//     // ── Misc ──────────────────────────────────────────────────────────────────
//     "--keep-open=yes",   // don't close window when playback ends
//     "--no-terminal",     // suppress mpv's own terminal output
//   ];

//   // Optional subtitle file
//   if (subFile) {
//     args.push(`--sub-file=${subFile}`);
//     args.push("--sub-visibility=yes");
//   }

//   // Seek to timestamp (resume)
//   if (startTime && !isNaN(startTime)) {
//     args.push(`--start=${startTime}`);
//   }

//   // Force quality label into title
//   if (quality) {
//     args[0 /* --title */] = `--title=${title} [${quality}]`;
//   }

//   // Named mpv profile (from ~/.config/mpv/mpv.conf)
//   if (profile) {
//     args.push(`--profile=${profile}`);
//   }

//   // Any extra raw mpv flags
//   if (extraArgs.length) {
//     args.push(...extraArgs);
//   }

//   return args;
// }

// // ── Generate session ID ───────────────────────────────────────────────────────
// function makeSessionId() {
//   return `mpv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
// }

// // ── Launch MPV ────────────────────────────────────────────────────────────────
// function launchMPV(url, options = {}) {
//   return new Promise((resolve, reject) => {
//     if (!url) return reject(new Error("No URL provided to MPV"));

//     const sessionId = makeSessionId();
//     const args = buildArgs(url, options);

//     console.log(`[MPV] Launching session ${sessionId}`);
//     console.log(`[MPV] URL: ${url}`);

//     let proc;
//     try {
//       proc = spawn(MPV_BIN, args, {
//         detached: false,
//         stdio: ["ignore", "pipe", "pipe"],
//       });
//     } catch (err) {
//       return reject(new Error(`Failed to spawn MPV: ${err.message}`));
//     }

//     const session = {
//       sessionId,
//       process: proc,
//       pid: proc.pid,
//       url,
//       title: options.title || "Anime Launcher",
//       startedAt: Date.now(),
//       status: "launching",
//       exitCode: null,
//     };

//     activeSessions.set(sessionId, session);

//     // ── stdout / stderr logging ───────────────────────────────────────────────
//     proc.stdout.on("data", (data) => {
//       console.log(`[MPV:${sessionId}] ${data.toString().trim()}`);
//     });

//     proc.stderr.on("data", (data) => {
//       const msg = data.toString().trim();
//       // MPV writes normal status to stderr — only log actual errors
//       if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("failed")) {
//         console.error(`[MPV:${sessionId}] ${msg}`);
//       }
//     });

//     // ── Process events ────────────────────────────────────────────────────────
//     proc.on("spawn", () => {
//       session.status = "playing";
//       console.log(`[MPV] Session ${sessionId} started (PID: ${proc.pid})`);
//       resolve({
//         sessionId,
//         pid: proc.pid,
//         url,
//         title: session.title,
//         startedAt: session.startedAt,
//         status: "playing",
//       });
//     });

//     proc.on("error", (err) => {
//       session.status = "error";
//       activeSessions.delete(sessionId);
//       console.error(`[MPV] Session ${sessionId} error: ${err.message}`);

//       if (err.code === "ENOENT") {
//         reject(new Error("MPV not found. Install it: sudo apt install mpv / brew install mpv"));
//       } else {
//         reject(new Error(`MPV process error: ${err.message}`));
//       }
//     });

//     proc.on("close", (code) => {
//       session.status = code === 0 ? "finished" : "crashed";
//       session.exitCode = code;
//       console.log(`[MPV] Session ${sessionId} closed (exit code: ${code})`);
//       // Keep in map for 60s so frontend can poll final status
//       setTimeout(() => activeSessions.delete(sessionId), 60000);
//     });
//   });
// }

// // ── Kill a specific MPV session ───────────────────────────────────────────────
// function killSession(sessionId) {
//   const session = activeSessions.get(sessionId);
//   if (!session) return { killed: false, reason: "Session not found" };

//   try {
//     session.process.kill("SIGTERM");
//     session.status = "killed";
//     activeSessions.delete(sessionId);
//     console.log(`[MPV] Killed session ${sessionId}`);
//     return { killed: true, sessionId };
//   } catch (err) {
//     return { killed: false, reason: err.message };
//   }
// }

// // ── Kill all active MPV sessions ──────────────────────────────────────────────
// function killAll() {
//   const results = [];
//   for (const [id] of activeSessions) {
//     results.push(killSession(id));
//   }
//   return results;
// }

// // ── Get session status ────────────────────────────────────────────────────────
// function getSession(sessionId) {
//   const session = activeSessions.get(sessionId);
//   if (!session) return null;
//   return {
//     sessionId: session.sessionId,
//     pid: session.pid,
//     url: session.url,
//     title: session.title,
//     startedAt: session.startedAt,
//     status: session.status,
//     exitCode: session.exitCode,
//     uptime: Math.floor((Date.now() - session.startedAt) / 1000),
//   };
// }

// // ── Get all active sessions ───────────────────────────────────────────────────
// function getAllSessions() {
//   return Array.from(activeSessions.keys())
//     .map(getSession)
//     .filter(Boolean);
// }

// // ── Check if MPV is installed ─────────────────────────────────────────────────
// function checkMPV() {
//   return new Promise((resolve) => {
//     const proc = spawn(MPV_BIN, ["--version"], { stdio: "pipe" });
//     let output = "";

//     proc.stdout.on("data", (d) => (output += d.toString()));
//     proc.on("close", (code) => {
//       resolve({
//         installed: code === 0,
//         version: output.split("\n")[0] || null,
//         bin: MPV_BIN,
//       });
//     });
//     proc.on("error", () => {
//       resolve({ installed: false, version: null, bin: MPV_BIN });
//     });
//   });
// }

// module.exports = {
//   launchMPV,
//   killSession,
//   killAll,
//   getSession,
//   getAllSessions,
//   checkMPV,
// };

const { spawn } = require("child_process");
const path = require("path");

const activeSessions = new Map();

// ── Binaries ──────────────────────────────────────────────────────────────────
// You MUST run: npm install -g webtorrent-cli
const WEBTORRENT_BIN = "webtorrent"; 
const MPV_BIN = process.env.MPV_BIN || "mpv";

// ── Build Args (Now configures Webtorrent to call MPV) ────────────────────────
function buildArgs(url, options = {}) {
  // Webtorrent-cli uses a different flag format than raw MPV.
  // We pass the magnet, tell it to use mpv, and specify download folder.
  const args = [
    "download",
    url,
    "--mpv", // This tells webtorrent to launch MPV automatically
    "--out", path.join(process.cwd(), "downloads"), // Saves the file locally
  ];

  if (options.fullscreen) args.push("--fullscreen");
  
  // Extra webtorrent flags can be added here
  return args;
}

function makeSessionId() {
  return `torrent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Launch MPV (Now handles Torrent Streaming) ────────────────────────────────
function launchMPV(url, options = {}) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error("No Magnet/Torrent URL provided"));

    const sessionId = makeSessionId();
    const args = buildArgs(url, options);

    console.log(`[Stream] Initializing: ${options.title || "Anime"}`);

    let proc;
    try {
      // We spawn WebTorrent, which then spawns MPV as a child process
      proc = spawn(WEBTORRENT_BIN, args, {
        shell: true, // Required for Windows path resolution
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      return reject(new Error(`Failed to start streaming engine: ${err.message}`));
    }

    const session = {
      sessionId,
      process: proc,
      pid: proc.pid,
      url,
      title: options.title || "Anime Launcher",
      startedAt: Date.now(),
      status: "streaming",
      exitCode: null,
    };

    activeSessions.set(sessionId, session);

    // ── Log Download Progress ──
    proc.stdout.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg.includes("Downloading")) {
        console.log(`[${sessionId}] ${msg}`);
      }
    });

    proc.on("spawn", () => {
      session.status = "playing";
      resolve({ sessionId, status: "playing", title: session.title });
    });

    proc.on("error", (err) => {
      session.status = "error";
      activeSessions.delete(sessionId);
      reject(new Error(`Streaming failed: ${err.message}. Ensure webtorrent-cli is installed.`));
    });

    proc.on("close", (code) => {
      session.status = code === 0 ? "finished" : "crashed";
      console.log(`[Stream] Session ${sessionId} exited with code ${code}`);
      setTimeout(() => activeSessions.delete(sessionId), 60000);
    });
  });
}

// ── All other functions remain identical in name/interface ───────────────────

function killSession(sessionId) {
  const session = activeSessions.get(sessionId);
  if (!session) return { killed: false, reason: "Session not found" };
  try {
    session.process.kill("SIGTERM");
    activeSessions.delete(sessionId);
    return { killed: true, sessionId };
  } catch (err) {
    return { killed: false, reason: err.message };
  }
}

function killAll() {
  const results = [];
  for (const [id] of activeSessions) results.push(killSession(id));
  return results;
}

function getSession(sessionId) {
  const session = activeSessions.get(sessionId);
  return session ? { ...session, uptime: Math.floor((Date.now() - session.startedAt) / 1000) } : null;
}

function getAllSessions() {
  return Array.from(activeSessions.keys()).map(getSession).filter(Boolean);
}

// ── Check for both requirements ──
async function checkMPV() {
  return new Promise((resolve) => {
    const proc = spawn(WEBTORRENT_BIN, ["--version"], { stdio: "pipe" });
    proc.on("close", (code) => {
      resolve({
        installed: code === 0,
        engine: "webtorrent-cli",
        player: "mpv"
      });
    });
    proc.on("error", () => resolve({ installed: false }));
  });
}

module.exports = {
  launchMPV,
  killSession,
  killAll,
  getSession,
  getAllSessions,
  checkMPV,
};
