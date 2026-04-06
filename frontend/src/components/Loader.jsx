// // ── Skeleton card — mimics AnimeCard shape while loading ─────────────────────
// function SkeletonCard() {
//   return (
//     <div style={styles.card}>
//       <div style={{ ...styles.shimmer, ...styles.poster }} />
//       <div style={styles.info}>
//         <div style={{ ...styles.shimmer, ...styles.titleBar }} />
//         <div style={{ ...styles.shimmer, ...styles.subBar }} />
//       </div>
//     </div>
//   );
// }

// // ── Skeleton torrent row ───────────────────────────────────────────────────────
// function SkeletonTorrentRow() {
//   return (
//     <div style={styles.torrentRow}>
//       <div style={{ ...styles.shimmer, width: "40%", height: "14px", borderRadius: "4px" }} />
//       <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
//         <div style={{ ...styles.shimmer, width: "50px", height: "14px", borderRadius: "4px" }} />
//         <div style={{ ...styles.shimmer, width: "50px", height: "14px", borderRadius: "4px" }} />
//         <div style={{ ...styles.shimmer, width: "60px", height: "24px", borderRadius: "6px" }} />
//       </div>
//     </div>
//   );
// }

// // ── Skeleton episode tile ─────────────────────────────────────────────────────
// function SkeletonEpisode() {
//   return (
//     <div style={styles.episodeTile}>
//       <div style={{ ...styles.shimmer, width: "100%", height: "100%" }} />
//     </div>
//   );
// }

// // ── Spinner ───────────────────────────────────────────────────────────────────
// function Spinner({ size = 32, color = "#e85d5d" }) {
//   return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
//       <div
//         style={{
//           width: size,
//           height: size,
//           borderRadius: "50%",
//           border: `3px solid rgba(232,93,93,0.2)`,
//           borderTopColor: color,
//           animation: "spin 0.7s linear infinite",
//         }}
//       />
//       <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//     </div>
//   );
// }

// // ── Buffer progress bar (torrent buffering) ────────────────────────────────
// function BufferBar({ progress = 0, speed = "", label = "Buffering..." }) {
//   const pct = Math.min(parseFloat(progress) || 0, 100);

//   return (
//     <div style={styles.bufferWrap}>
//       <div style={styles.bufferHeader}>
//         <span style={styles.bufferLabel}>{label}</span>
//         <span style={styles.bufferMeta}>{speed && `↓ ${speed}`}</span>
//       </div>
//       <div style={styles.bufferTrack}>
//         <div
//           style={{
//             ...styles.bufferFill,
//             width: `${pct}%`,
//             transition: "width 0.4s ease",
//           }}
//         />
//       </div>
//       <div style={styles.bufferPct}>{pct.toFixed(1)}%</div>
//       <style>{`@keyframes shimmer {
//         0%   { background-position: -400px 0; }
//         100% { background-position:  400px 0; }
//       }`}</style>
//     </div>
//   );
// }

// // ── Main Loader export — renders correct variant based on props ───────────────
// export default function Loader({
//   type = "card",      // "card" | "torrent" | "episode" | "spinner" | "buffer"
//   count = 12,         // how many skeletons to render
//   // buffer props
//   progress,
//   speed,
//   label,
// }) {
//   if (type === "spinner") return <Spinner />;

//   if (type === "buffer") {
//     return <BufferBar progress={progress} speed={speed} label={label} />;
//   }

//   if (type === "torrent") {
//     return (
//       <div style={styles.torrentList}>
//         {Array.from({ length: count }).map((_, i) => (
//           <SkeletonTorrentRow key={i} />
//         ))}
//         <style>{shimmerKeyframe}</style>
//       </div>
//     );
//   }

//   if (type === "episode") {
//     return (
//       <div style={styles.episodeGrid}>
//         {Array.from({ length: count }).map((_, i) => (
//           <SkeletonEpisode key={i} />
//         ))}
//         <style>{shimmerKeyframe}</style>
//       </div>
//     );
//   }

//   // Default: card grid
//   return (
//     <div className="card-grid">
//       {Array.from({ length: count }).map((_, i) => (
//         <SkeletonCard key={i} />
//       ))}
//       <style>{shimmerKeyframe}</style>
//     </div>
//   );
// }

// // ── Shimmer animation ─────────────────────────────────────────────────────────
// const shimmerKeyframe = `
//   @keyframes shimmer {
//     0%   { background-position: -400px 0; }
//     100% { background-position:  400px 0; }
//   }
// `;

// const shimmerBg = {
//   background: "linear-gradient(90deg, #1a1a24 25%, #252535 50%, #1a1a24 75%)",
//   backgroundSize: "400px 100%",
//   animation: "shimmer 1.4s ease infinite",
// };

// // ── Styles ────────────────────────────────────────────────────────────────────
// const styles = {
//   // Card skeleton
//   card: {
//     background: "#22222e",
//     borderRadius: "10px",
//     overflow: "hidden",
//     display: "flex",
//     flexDirection: "column",
//   },
//   poster: {
//     width: "100%",
//     aspectRatio: "2/3",
//     borderRadius: 0,
//   },
//   info: {
//     padding: "10px",
//     display: "flex",
//     flexDirection: "column",
//     gap: "8px",
//   },
//   titleBar: {
//     height: "14px",
//     borderRadius: "4px",
//     width: "85%",
//   },
//   subBar: {
//     height: "11px",
//     borderRadius: "4px",
//     width: "55%",
//   },
//   shimmer: shimmerBg,

//   // Torrent skeleton
//   torrentList: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "8px",
//   },
//   torrentRow: {
//     background: "#22222e",
//     borderRadius: "8px",
//     padding: "14px 16px",
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },

//   // Episode skeleton
//   episodeGrid: {
//     display: "grid",
//     gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
//     gap: "8px",
//   },
//   episodeTile: {
//     height: "44px",
//     borderRadius: "6px",
//     overflow: "hidden",
//     background: "#22222e",
//   },

//   // Buffer bar
//   bufferWrap: {
//     background: "#1a1a24",
//     border: "1px solid rgba(255,255,255,0.06)",
//     borderRadius: "10px",
//     padding: "16px 20px",
//     margin: "16px 0",
//   },
//   bufferHeader: {
//     display: "flex",
//     justifyContent: "space-between",
//     marginBottom: "10px",
//   },
//   bufferLabel: {
//     fontSize: "0.85rem",
//     color: "#a0a0b8",
//     fontWeight: 500,
//   },
//   bufferMeta: {
//     fontSize: "0.82rem",
//     color: "#e85d5d",
//     fontWeight: 600,
//   },
//   bufferTrack: {
//     height: "6px",
//     background: "rgba(255,255,255,0.08)",
//     borderRadius: "99px",
//     overflow: "hidden",
//   },
//   bufferFill: {
//     height: "100%",
//     background: "linear-gradient(90deg, #e85d5d, #ff9f7f)",
//     borderRadius: "99px",
//   },
//   bufferPct: {
//     marginTop: "6px",
//     fontSize: "0.78rem",
//     color: "#5a5a7a",
//     textAlign: "right",
//   },
// };

// ── Skeleton card — mimics AnimeCard shape while loading ─────────────────────
function SkeletonCard() {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.shimmer, ...styles.poster }} />
      <div style={styles.info}>
        <div style={{ ...styles.shimmer, ...styles.titleBar }} />
        <div style={{ ...styles.shimmer, ...styles.subBar }} />
      </div>
    </div>
  );
}

// ── Skeleton torrent row ───────────────────────────────────────────────────────
function SkeletonTorrentRow() {
  return (
    <div style={styles.torrentRow}>
      <div style={{ ...styles.shimmer, width: "40%", height: "14px", borderRadius: "4px" }} />
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ ...styles.shimmer, width: "50px", height: "14px", borderRadius: "4px" }} />
        <div style={{ ...styles.shimmer, width: "50px", height: "14px", borderRadius: "4px" }} />
        <div style={{ ...styles.shimmer, width: "60px", height: "24px", borderRadius: "6px" }} />
      </div>
    </div>
  );
}

// ── Skeleton episode tile ─────────────────────────────────────────────────────
function SkeletonEpisode() {
  return (
    <div style={styles.episodeTile}>
      <div style={{ ...styles.shimmer, width: "100%", height: "100%" }} />
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = 32, color = "#e85d5d" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `3px solid rgba(232,93,93,0.2)`,
          borderTopColor: color,
          animation: "spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Buffer progress bar (torrent buffering) ────────────────────────────────
function BufferBar({ progress = 0, speed = "", label = "Buffering..." }) {
  const pct = Math.min(parseFloat(progress) || 0, 100);

  return (
    <div style={styles.bufferWrap}>
      <div style={styles.bufferHeader}>
        <span style={styles.bufferLabel}>{label}</span>
        <span style={styles.bufferMeta}>{speed && `↓ ${speed}`}</span>
      </div>
      <div style={styles.bufferTrack}>
        <div
          style={{
            ...styles.bufferFill,
            width: `${pct}%`,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={styles.bufferPct}>{pct.toFixed(1)}%</div>
      <style>{`@keyframes shimmer {
        0%   { background-position: -400px 0; }
        100% { background-position:  400px 0; }
      }`}</style>
    </div>
  );
}

// ── Main Loader export — renders correct variant based on props ───────────────
export default function Loader({
  type = "card",      // "card" | "torrent" | "episode" | "spinner" | "buffer"
  count = 12,         // how many skeletons to render
  // buffer props
  progress,
  speed,
  label,
}) {
  if (type === "spinner") return <Spinner />;

  if (type === "buffer") {
    return <BufferBar progress={progress} speed={speed} label={label} />;
  }

  if (type === "torrent") {
    return (
      <div style={styles.torrentList}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonTorrentRow key={i} />
        ))}
        <style>{shimmerKeyframe}</style>
      </div>
    );
  }

  if (type === "episode") {
    return (
      <div style={styles.episodeGrid}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonEpisode key={i} />
        ))}
        <style>{shimmerKeyframe}</style>
      </div>
    );
  }

  // Default: card grid
  return (
    <div className="card-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
      <style>{shimmerKeyframe}</style>
    </div>
  );
}

// ── Shimmer animation ─────────────────────────────────────────────────────────
const shimmerKeyframe = `
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
`;

const shimmerBg = {
  background: "linear-gradient(90deg, #1a1a24 25%, #252535 50%, #1a1a24 75%)",
  backgroundSize: "400px 100%",
  animation: "shimmer 1.4s ease infinite",
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  // Card skeleton
  card: {
    background: "#22222e",
    borderRadius: "10px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  poster: {
    width: "100%",
    aspectRatio: "2/3",
    borderRadius: 0,
  },
  info: {
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  titleBar: {
    height: "14px",
    borderRadius: "4px",
    width: "85%",
  },
  subBar: {
    height: "11px",
    borderRadius: "4px",
    width: "55%",
  },
  shimmer: shimmerBg,

  // Torrent skeleton
  torrentList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  torrentRow: {
    background: "#22222e",
    borderRadius: "8px",
    padding: "14px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Episode skeleton
  episodeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
    gap: "8px",
  },
  episodeTile: {
    height: "44px",
    borderRadius: "6px",
    overflow: "hidden",
    background: "#22222e",
  },

  // Buffer bar
  bufferWrap: {
    background: "#1a1a24",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: "10px",
    padding: "16px 20px",
    margin: "16px 0",
  },
  bufferHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  bufferLabel: {
    fontSize: "0.85rem",
    color: "#a0a0b8",
    fontWeight: 500,
  },
  bufferMeta: {
    fontSize: "0.82rem",
    color: "#e85d5d",
    fontWeight: 600,
  },
  bufferTrack: {
    height: "6px",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "99px",
    overflow: "hidden",
  },
  bufferFill: {
    height: "100%",
    background: "linear-gradient(90deg, #e85d5d, #ff9f7f)",
    borderRadius: "99px",
  },
  bufferPct: {
    marginTop: "6px",
    fontSize: "0.78rem",
    color: "#5a5a7a",
    textAlign: "right",
  },
};