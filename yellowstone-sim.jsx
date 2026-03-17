import { useState, useEffect, useRef, useCallback } from "react";

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@400;500;600&display=swap');`;

// --- Ecosystem model ---
function computeEcosystem(wolves, humanHunting) {
  // wolves: 0–100, humanHunting: 0–1 (pressure reduces wolves effectively)
  const effectiveWolves = Math.max(0, wolves * (1 - humanHunting * 0.7));
  const w = effectiveWolves / 65; // normalized 0–1.5 (peak ~100 wolves)

  const elk = Math.max(5, Math.round(100 - w * 55));
  const elkMovement = Math.min(100, Math.round(w * 80)); // elk stay mobile when wolves present
  const vegetation = Math.min(100, Math.round(20 + w * 65 + (1 - elk / 100) * 20));
  const riverHealth = Math.min(100, Math.round(15 + vegetation * 0.7));
  const beavers = Math.min(100, Math.round(vegetation * 0.6));
  const fish = Math.min(100, Math.round(riverHealth * 0.75));
  const songbirds = Math.min(100, Math.round(vegetation * 0.65));

  return { elk, elkMovement, vegetation, riverHealth, beavers, fish, songbirds, effectiveWolves };
}

// --- Stat bar component ---
function StatBar({ label, value, icon, color, description, pulse }) {
  const [displayed, setDisplayed] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#2d3a2e", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>{icon}</span> {label}
        </span>
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
          color: value < 30 ? "#c0392b" : value > 70 ? "#27ae60" : "#e67e22",
          transition: "color 0.6s"
        }}>
          {displayed}%
        </span>
      </div>
      <div style={{ height: 8, background: "#e8ede9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${displayed}%`, background: color,
          borderRadius: 4, transition: "width 0.8s cubic-bezier(.4,0,.2,1)",
          boxShadow: pulse ? `0 0 8px ${color}88` : "none"
        }} />
      </div>
      {description && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#6b7c6d", margin: "3px 0 0", lineHeight: 1.4 }}>
          {description}
        </p>
      )}
    </div>
  );
}

// --- CLD Node ---
function CLDNode({ x, y, label, icon, color, active, onClick, size = 60 }) {
  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <circle cx={x} cy={y} r={size / 2} fill={active ? color : "#f0f4f1"}
        stroke={color} strokeWidth={active ? 0 : 2}
        style={{ transition: "all 0.3s", filter: active ? `drop-shadow(0 2px 6px ${color}88)` : "none" }} />
      <text x={x} y={y - 4} textAnchor="middle" fontSize="18" dominantBaseline="middle">{icon}</text>
      <text x={x} y={y + 16} textAnchor="middle" fontSize="10"
        fontFamily="'DM Sans', sans-serif" fontWeight="600"
        fill={active ? "#fff" : "#2d3a2e"}>{label}</text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, label, positive, active }) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = -dy / len * 20, ny = dx / len * 20;
  const color = active ? (positive ? "#27ae60" : "#c0392b") : "#ccc";
  return (
    <g>
      <defs>
        <marker id={`arrow-${label}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={color} />
        </marker>
      </defs>
      <line x1={x1} y1={y1} x2={x2 - (dx / len) * 28} y2={y2 - (dy / len) * 28}
        stroke={color} strokeWidth={active ? 2 : 1} markerEnd={`url(#arrow-${label})`}
        style={{ transition: "all 0.4s" }} />
      <text x={mx + nx * 0.6} y={my + ny * 0.6} textAnchor="middle" fontSize="10"
        fontFamily="'DM Sans', sans-serif" fontWeight="700"
        fill={positive ? "#27ae60" : "#c0392b"}>{positive ? "+" : "−"}</text>
    </g>
  );
}

// --- Challenges ---
const CHALLENGES = [
  {
    id: 0,
    title: "The Broken Park",
    emoji: "🌿",
    intro: "It's 1995. Wolves have been gone for 70 years. The elk population exploded and ate all the riverbank vegetation. The rivers are eroding and fish are disappearing. Can you restore Yellowstone?",
    startWolves: 0,
    startHunting: 0,
    goal: "Raise wolf population so vegetation reaches 70%+ and river health reaches 60%+",
    check: (eco) => eco.vegetation >= 70 && eco.riverHealth >= 60,
    hint: "In 1995, 31 wolves were released. Try setting wolves to around 50–70.",
    successMsg: "The trophic cascade is working! Wolves changed elk behavior, plants recovered, and rivers stabilized. 🎉"
  },
  {
    id: 1,
    title: "The Balanced Park",
    emoji: "⚖️",
    intro: "The park is thriving — 20 wolves, healthy vegetation, clear rivers. But humans outside the park are lobbying to hunt wolves. Don't let the ecosystem collapse!",
    startWolves: 70,
    startHunting: 0,
    goal: "Keep all ecosystem stats above 50% even as you adjust human hunting pressure",
    check: (eco) => eco.vegetation >= 50 && eco.riverHealth >= 50 && eco.fish >= 40,
    hint: "Watch what happens when you slide hunting pressure up. What's the tipping point?",
    successMsg: "You found the balance! Human activity is the hidden lever in this whole system. 🐺"
  },
  {
    id: 2,
    title: "The Human Factor",
    emoji: "🧑‍🌾",
    intro: "Ranchers and hunters outside the park have been removing wolves for decades. The wolves are at 8. You need to advocate for wolf protection — but you can only control hunting pressure, not wolf count.",
    startWolves: 25,
    startHunting: 0.8,
    goal: "Reduce human hunting to let the wolf population recover. Get effective wolves above 40.",
    check: (eco) => eco.effectiveWolves >= 40,
    hint: "Reducing hunting pressure is what lets wolves actually stabilize at higher numbers.",
    successMsg: "By reducing human pressure, you unlocked the cascade. Humans aren't just part of the story — they control the on/off switch. 🌍"
  }
];

// --- Scene SVG ---
function EcosystemScene({ wolves, eco }) {
  const elkCount = Math.round(eco.elk / 14);
  const treeCount = Math.round(eco.vegetation / 14);
  const riverBlue = `hsl(200, ${40 + eco.riverHealth * 0.5}%, ${50 + eco.riverHealth * 0.2}%)`;

  return (
    <svg viewBox="0 0 420 200" style={{ width: "100%", borderRadius: 10, background: "#e8f5e0" }}>
      {/* Sky */}
      <rect width="420" height="120" fill="#d4eaf7" />
      {/* Mountains */}
      <polygon points="0,120 60,50 120,120" fill="#b8c9b0" />
      <polygon points="80,120 150,40 220,120" fill="#a8b9a0" />
      <polygon points="200,120 280,55 360,120" fill="#b8c9b0" />
      {/* Ground */}
      <rect y="120" width="420" height="80" fill="#7ab648" />
      {/* River */}
      <path d={`M 0 ${160 - eco.riverHealth * 0.1} Q 100 ${150 + eco.riverHealth * 0.05} 200 ${158} Q 320 ${162 - eco.riverHealth * 0.08} 420 ${155}`}
        stroke={riverBlue} strokeWidth={8 + eco.riverHealth * 0.04} fill="none" opacity="0.85" />
      {/* Trees */}
      {Array.from({ length: treeCount }).map((_, i) => {
        const x = 20 + (i % 6) * 65 + (i > 5 ? 30 : 0);
        const y = 100 + (i % 3) * 8;
        const h = 18 + (eco.vegetation / 100) * 15;
        return (
          <g key={i}>
            <rect x={x - 2} y={y + h * 0.4} width={4} height={h * 0.6} fill="#6b4c2a" />
            <polygon points={`${x},${y} ${x - 10},${y + h * 0.5} ${x + 10},${y + h * 0.5}`} fill="#2d6a2d" />
            <polygon points={`${x},${y + h * 0.15} ${x - 12},${y + h * 0.65} ${x + 12},${y + h * 0.65}`} fill="#3a8a3a" />
          </g>
        );
      })}
      {/* Elk */}
      {Array.from({ length: elkCount }).map((_, i) => {
        const x = 30 + i * 55;
        const y = 145 + (i % 2) * 10;
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx={8} ry={5} fill="#8B6914" />
            <circle cx={x + 6} cy={y - 4} r={4} fill="#8B6914" />
            <line x1={x - 6} y1={y + 4} x2={x - 7} y2={y + 10} stroke="#8B6914" strokeWidth={1.5} />
            <line x1={x - 2} y1={y + 4} x2={x - 2} y2={y + 10} stroke="#8B6914" strokeWidth={1.5} />
            <line x1={x + 2} y1={y + 4} x2={x + 3} y2={y + 10} stroke="#8B6914" strokeWidth={1.5} />
            <line x1={x + 6} y1={y + 4} x2={x + 7} y2={y + 10} stroke="#8B6914" strokeWidth={1.5} />
          </g>
        );
      })}
      {/* Wolves */}
      {Array.from({ length: Math.min(wolves, 5) }).map((_, i) => {
        const x = 50 + i * 75;
        const y = 170;
        return (
          <g key={i}>
            <ellipse cx={x} cy={y} rx={7} ry={4} fill="#555" />
            <circle cx={x + 5} cy={y - 3} r={3.5} fill="#555" />
            <polygon points={`${x + 4},${y - 6} ${x + 3},${y - 9} ${x + 6},${y - 6}`} fill="#555" />
            <line x1={x - 5} y1={y + 3} x2={x - 6} y2={y + 8} stroke="#555" strokeWidth={1.5} />
            <line x1={x - 1} y1={y + 3} x2={x - 1} y2={y + 8} stroke="#555" strokeWidth={1.5} />
            <line x1={x + 3} y1={y + 3} x2={x + 4} y2={y + 8} stroke="#555" strokeWidth={1.5} />
          </g>
        );
      })}
      {/* Labels */}
      {wolves > 0 && <text x={50} y={196} fontSize="9" fontFamily="'DM Sans',sans-serif" fill="#333">🐺 wolves</text>}
      <text x={200} y={196} fontSize="9" fontFamily="'DM Sans',sans-serif" fill="#333">🦌 elk</text>
    </svg>
  );
}

// --- Main App ---
export default function YellowstoneApp() {
  const [tab, setTab] = useState("explore");
  const [wolves, setWolves] = useState(5);
  const [humanHunting, setHumanHunting] = useState(0);
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [challengeWolves, setChallengeWolves] = useState(CHALLENGES[0].startWolves);
  const [challengeHunting, setChallengeHunting] = useState(CHALLENGES[0].startHunting);
  const [solved, setSolved] = useState(false);
  const [activeNode, setActiveNode] = useState(null);

  const eco = computeEcosystem(wolves, humanHunting);
  const challengeEco = computeEcosystem(challengeWolves, challengeHunting);
  const challenge = CHALLENGES[challengeIdx];

  useEffect(() => {
    if (tab === "challenge") {
      const c = CHALLENGES[challengeIdx];
      setChallengeWolves(c.startWolves);
      setChallengeHunting(c.startHunting);
      setSolved(false);
    }
  }, [challengeIdx, tab]);

  useEffect(() => {
    if (tab === "challenge" && !solved && challenge.check(challengeEco)) {
      setTimeout(() => setSolved(true), 600);
    }
  }, [challengeEco, tab, solved, challenge]);

  const cldNodes = [
    { id: "humans", x: 210, y: 40, label: "Humans", icon: "🧑", color: "#e67e22" },
    { id: "wolves", x: 80, y: 100, label: "Wolves", icon: "🐺", color: "#555577" },
    { id: "elk", x: 340, y: 100, label: "Elk", icon: "🦌", color: "#8B6914" },
    { id: "vegetation", x: 80, y: 220, label: "Plants", icon: "🌿", color: "#27ae60" },
    { id: "river", x: 210, y: 270, label: "Rivers", icon: "🌊", color: "#2980b9" },
    { id: "beavers", x: 340, y: 220, label: "Beavers", icon: "🦫", color: "#795548" },
    { id: "fish", x: 210, y: 340, label: "Fish", icon: "🐟", color: "#00acc1" },
  ];

  const cldEdges = [
    { from: "humans", to: "wolves", positive: false, label: "hw" },
    { from: "wolves", to: "elk", positive: false, label: "we" },
    { from: "elk", to: "vegetation", positive: false, label: "ev" },
    { from: "vegetation", to: "river", positive: true, label: "vr" },
    { from: "vegetation", to: "beavers", positive: true, label: "vb" },
    { from: "beavers", to: "river", positive: true, label: "br" },
    { from: "river", to: "fish", positive: true, label: "rf" },
    { from: "wolves", to: "vegetation", positive: true, label: "wv", label2: "(behavior)" },
  ];

  const nodeInfo = {
    wolves: "Wolves hunt elk — but more importantly, they scare elk away from riverbanks, giving plants room to grow. This is called a 'trophic cascade.'",
    elk: "When wolves are absent, elk overgraze riverbanks and valleys. When wolves return, elk stay moving — changing where they eat, not just how many.",
    vegetation: "Trees and shrubs stabilize river banks, provide habitat, and feed many other species. Willows and aspens grow back quickly when elk stop overgrazing.",
    river: "Vegetation roots hold banks in place, reducing erosion. Beaver dams also slow and deepen rivers. Healthier rivers = more fish.",
    beavers: "Beavers returned when vegetation recovered. Their dams create ponds, slow water flow, and dramatically increase habitat complexity.",
    fish: "Cleaner, cooler, deeper rivers support trout and other fish — which in turn feed eagles, bears, and other predators.",
    humans: "Humans eliminated wolves by the 1920s through hunting and trapping. Without wolves, elk overpopulated and degraded the park. Humans reintroduced wolves in 1995.",
  };

  const styles = {
    app: {
      fontFamily: "'DM Sans', sans-serif",
      background: "#f5f7f2",
      minHeight: "100vh",
      maxWidth: 760,
      margin: "0 auto",
      padding: "0 0 40px",
    },
    header: {
      background: "#1e3320",
      color: "#fff",
      padding: "20px 28px 16px",
      borderBottom: "4px solid #3d7a3d",
    },
    title: {
      fontFamily: "'Fraunces', serif",
      fontSize: 26,
      fontWeight: 700,
      margin: 0,
      letterSpacing: "-0.5px",
      lineHeight: 1.1,
    },
    subtitle: { fontSize: 13, opacity: 0.75, margin: "4px 0 0", fontWeight: 400 },
    tabs: {
      display: "flex",
      gap: 0,
      background: "#2d4a30",
      padding: "0 28px",
    },
    tab: (active) => ({
      padding: "10px 20px",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      fontWeight: active ? 600 : 400,
      color: active ? "#fff" : "rgba(255,255,255,0.6)",
      background: active ? "#3d7a3d" : "transparent",
      border: "none",
      cursor: "pointer",
      borderRadius: "6px 6px 0 0",
      transition: "all 0.2s",
      marginTop: 6,
    }),
    content: { padding: "24px 28px" },
    card: {
      background: "#fff",
      borderRadius: 12,
      padding: 20,
      marginBottom: 18,
      border: "1px solid #e2e8e2",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    },
    sliderLabel: {
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      fontWeight: 600,
      color: "#2d3a2e",
      marginBottom: 8,
      display: "flex",
      justifyContent: "space-between",
    },
    slider: {
      width: "100%",
      accentColor: "#3d7a3d",
      margin: "4px 0 14px",
    },
    sectionTitle: {
      fontFamily: "'Fraunces', serif",
      fontSize: 18,
      fontWeight: 700,
      color: "#1e3320",
      marginBottom: 12,
    },
    challengeBtn: (active) => ({
      padding: "8px 14px",
      background: active ? "#1e3320" : "#f0f4f1",
      color: active ? "#fff" : "#2d3a2e",
      border: "1px solid " + (active ? "#1e3320" : "#d0d8d0"),
      borderRadius: 8,
      cursor: "pointer",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 13,
      fontWeight: 600,
      transition: "all 0.2s",
    }),
    successBanner: {
      background: "#e8f5e0",
      border: "2px solid #3d7a3d",
      borderRadius: 10,
      padding: "14px 18px",
      marginBottom: 16,
    }
  };

  return (
    <div style={styles.app}>
      <style>{FONT}</style>
      <div style={styles.header}>
        <h1 style={styles.title}>🐺 Wolves of Yellowstone</h1>
        <p style={styles.subtitle}>An ecosystem simulation — how one species changed everything</p>
      </div>
      <div style={styles.tabs}>
        {[["explore", "🔬 Explore"], ["challenge", "🎯 Challenges"], ["cld", "🔗 The Loop"]].map(([id, label]) => (
          <button key={id} style={styles.tab(tab === id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div style={styles.content}>

        {/* ── EXPLORE ── */}
        {tab === "explore" && (
          <>
            <div style={styles.card}>
              <EcosystemScene wolves={wolves} eco={eco} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>Controls</div>
                <div style={styles.sliderLabel}>
                  <span>🐺 Wolf Population</span>
                  <span style={{ color: "#3d7a3d", fontWeight: 700 }}>{wolves} wolves</span>
                </div>
                <input type="range" min={0} max={100} value={wolves}
                  onChange={e => setWolves(+e.target.value)} style={styles.slider} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888", marginTop: -10, marginBottom: 10 }}>
                  <span>0 (pre-1995)</span>
                  <span style={{ color: wolves >= 28 && wolves <= 34 ? "#3d7a3d" : "#aaa", fontWeight: wolves >= 28 && wolves <= 34 ? 700 : 400 }}>↑ 31 reintroduced</span>
                  <span>100 (peak)</span>
                </div>
                <div style={{ background: "#eaf4ea", border: "1px solid #b8ddb8", borderRadius: 7, padding: "8px 10px", marginBottom: 12, fontSize: 11, color: "#2d5a2d", lineHeight: 1.5 }}>
                  <strong>📅 Real history:</strong> Wolves were hunted to extinction in Yellowstone by the 1920s. In 1995–96, the U.S. government released <strong>31 wolves</strong> from Canada into the park. By 2003, the population peaked at ~174. Today it's stable around 100–110.
                </div>
                <div style={styles.sliderLabel}>
                  <span>🧑 Human Hunting Pressure</span>
                  <span style={{ color: "#e67e22", fontWeight: 700 }}>{Math.round(humanHunting * 100)}%</span>
                </div>
                <input type="range" min={0} max={100} value={Math.round(humanHunting * 100)}
                  onChange={e => setHumanHunting(e.target.value / 100)} style={{ ...styles.slider, accentColor: "#e67e22" }} />

                <div style={{ background: "#f5f7f2", borderRadius: 8, padding: "10px 12px", marginTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 4 }}>📖 What's happening</div>
                  <p style={{ fontSize: 12, color: "#444", margin: 0, lineHeight: 1.5 }}>
                    {wolves === 0
                      ? "No wolves → elk overgraze riverbanks → trees disappear → rivers erode. This was Yellowstone before 1995."
                      : wolves < 25
                      ? "Very few wolves. Elk are still overgrazing most of the park. The system is still degraded."
                      : wolves < 50
                      ? "Wolves are back — similar to 1995–96 when 31 were reintroduced. Elk are beginning to avoid riverbanks. Vegetation is slowly recovering."
                      : wolves < 75
                      ? "Strong wolf population. Elk behavior has changed dramatically. Rivers are stabilizing and beavers are returning."
                      : "Thriving wolf pack — near peak levels. The full trophic cascade is active. Even the rivers have changed course!"}
                    {humanHunting > 0.5 ? " High human hunting pressure is undermining the wolf population." : ""}
                  </p>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>Ecosystem Health</div>
                <StatBar label="Elk Population" value={eco.elk} icon="🦌" color="#8B6914" />
                <StatBar label="Vegetation" value={eco.vegetation} icon="🌿" color="#27ae60" pulse={eco.vegetation > 70} />
                <StatBar label="River Health" value={eco.riverHealth} icon="🌊" color="#2980b9" />
                <StatBar label="Beavers" value={eco.beavers} icon="🦫" color="#795548" />
                <StatBar label="Fish" value={eco.fish} icon="🐟" color="#00acc1" />
                <StatBar label="Songbirds" value={eco.songbirds} icon="🐦" color="#8e44ad" />
              </div>
            </div>
          </>
        )}

        {/* ── CHALLENGES ── */}
        {tab === "challenge" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {CHALLENGES.map((c, i) => (
                <button key={c.id} style={styles.challengeBtn(challengeIdx === i)}
                  onClick={() => setChallengeIdx(i)}>
                  {c.emoji} {c.title}
                </button>
              ))}
            </div>

            {solved && (
              <div style={styles.successBanner}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: "#1e3320", marginBottom: 4 }}>
                  ✅ Challenge Complete!
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#2d4a30", lineHeight: 1.5 }}>{challenge.successMsg}</p>
              </div>
            )}

            <div style={styles.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{challenge.emoji}</span>
                <div style={styles.sectionTitle}>{challenge.title}</div>
              </div>
              <p style={{ fontSize: 13, color: "#444", lineHeight: 1.6, margin: "0 0 12px" }}>{challenge.intro}</p>
              <div style={{ background: "#fff8e8", border: "1px solid #f0c040", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#b7770a" }}>🎯 Goal: </span>
                <span style={{ fontSize: 12, color: "#5a4010" }}>{challenge.goal}</span>
              </div>
              <EcosystemScene wolves={challengeWolves} eco={challengeEco} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>Your Controls</div>
                {challenge.id !== 2 && (
                  <>
                    <div style={styles.sliderLabel}>
                      <span>🐺 Wolf Population</span>
                      <span style={{ color: "#3d7a3d", fontWeight: 700 }}>{challengeWolves} wolves</span>
                    </div>
                    <input type="range" min={0} max={100} value={challengeWolves}
                      onChange={e => setChallengeWolves(+e.target.value)} style={styles.slider} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#888", marginTop: -10, marginBottom: 10 }}>
                      <span>0</span><span>31 reintroduced →</span><span>100</span>
                    </div>
                  </>
                )}
                <div style={styles.sliderLabel}>
                  <span>🧑 Human Hunting Pressure</span>
                  <span style={{ color: "#e67e22", fontWeight: 700 }}>{Math.round(challengeHunting * 100)}%</span>
                </div>
                <input type="range" min={0} max={100} value={Math.round(challengeHunting * 100)}
                  onChange={e => setChallengeHunting(e.target.value / 100)} style={{ ...styles.slider, accentColor: "#e67e22" }} />

                <div style={{ background: "#f5f7f2", borderRadius: 8, padding: "10px 12px", marginTop: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#888" }}>💡 Hint: </span>
                  <span style={{ fontSize: 11, color: "#555" }}>{challenge.hint}</span>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>Ecosystem Health</div>
                <StatBar label="Effective Wolves" value={Math.round(challengeEco.effectiveWolves)} icon="🐺" color="#555577" />
                <StatBar label="Vegetation" value={challengeEco.vegetation} icon="🌿" color="#27ae60" pulse={challengeEco.vegetation > 70} />
                <StatBar label="River Health" value={challengeEco.riverHealth} icon="🌊" color="#2980b9" />
                <StatBar label="Fish" value={challengeEco.fish} icon="🐟" color="#00acc1" />
                <StatBar label="Beavers" value={challengeEco.beavers} icon="🦫" color="#795548" />
              </div>
            </div>
          </>
        )}

        {/* ── CLD ── */}
        {tab === "cld" && (
          <>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>Causal Loop Diagram</div>
              <p style={{ fontSize: 13, color: "#555", margin: "0 0 14px", lineHeight: 1.5 }}>
                Click any node to learn how it fits in the system. <strong>+</strong> means "more leads to more." <strong>−</strong> means "more leads to less."
              </p>
              <svg viewBox="0 0 420 390" style={{ width: "100%", background: "#f5f7f2", borderRadius: 10 }}>
                {/* Edges */}
                <Arrow x1={80} y1={100} x2={340} y2={100} positive={false} label="we" active={!activeNode || activeNode === "wolves" || activeNode === "elk"} />
                <Arrow x1={80} y1={120} x2={80} y2={210} positive={true} label="wv" active={!activeNode || activeNode === "wolves" || activeNode === "vegetation"} />
                <Arrow x1={340} y1={120} x2={100} y2={210} positive={false} label="ev" active={!activeNode || activeNode === "elk" || activeNode === "vegetation"} />
                <Arrow x1={80} y1={230} x2={180} y2={260} positive={true} label="vr" active={!activeNode || activeNode === "vegetation" || activeNode === "river"} />
                <Arrow x1={100} y1={230} x2={320} y2={215} positive={true} label="vb" active={!activeNode || activeNode === "vegetation" || activeNode === "beavers"} />
                <Arrow x1={340} y1={235} x2={240} y2={265} positive={true} label="br" active={!activeNode || activeNode === "beavers" || activeNode === "river"} />
                <Arrow x1={210} y1={282} x2={210} y2={328} positive={true} label="rf" active={!activeNode || activeNode === "river" || activeNode === "fish"} />
                <Arrow x1={210} y1={55} x2={100} y2={90} positive={false} label="hw" active={!activeNode || activeNode === "humans" || activeNode === "wolves"} />
                {/* Nodes */}
                {cldNodes.map(n => (
                  <CLDNode key={n.id} {...n} active={activeNode === n.id}
                    onClick={() => setActiveNode(activeNode === n.id ? null : n.id)} />
                ))}
                {/* Loop label */}
                <text x={210} y={170} textAnchor="middle" fontSize="10" fontFamily="'DM Sans',sans-serif"
                  fill="#888" fontStyle="italic">reinforcing loop ↻</text>
              </svg>
            </div>

            {activeNode && (
              <div style={{ ...styles.card, borderLeft: `4px solid ${cldNodes.find(n => n.id === activeNode)?.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{cldNodes.find(n => n.id === activeNode)?.icon}</span>
                  <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 700, color: "#1e3320" }}>
                    {cldNodes.find(n => n.id === activeNode)?.label}
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "#333" }}>
                  {nodeInfo[activeNode]}
                </p>
              </div>
            )}

            <div style={styles.card}>
              <div style={styles.sectionTitle}>Key Concepts</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  ["Trophic Cascade", "When a top predator (like wolves) affects not just their prey, but the whole chain below — all the way to plants and rivers."],
                  ["Feedback Loop", "When A causes B, and B comes back to affect A. Wolves reduce elk → vegetation grows → more food for everything → healthier park → supports wolves."],
                  ["Ecology of Fear", "Elk don't just die from wolves. They change their behavior — avoiding risky spots — which lets plants grow even without being eaten."],
                  ["Keystone Species", "A species that has an outsized effect on its ecosystem compared to its numbers. Remove it, and the whole system changes."],
                ].map(([term, def]) => (
                  <div key={term} style={{ background: "#f0f4f1", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 14, color: "#1e3320", marginBottom: 5 }}>{term}</div>
                    <p style={{ margin: 0, fontSize: 12, color: "#444", lineHeight: 1.5 }}>{def}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
