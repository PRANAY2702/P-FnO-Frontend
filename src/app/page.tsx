"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";
import OptionsChain from "../components/OptionsChain";
import RiskDashboard from "../components/RiskDashboard";
import LiveChart from "../components/LiveChart";

// ─── Types ────────────────────────────────────────────────────────────────────
type IndexKey = "NIFTY" | "BANKNIFTY" | "SENSEX";

const INDEX_META: Record<
  IndexKey,
  {
    label: string;
    strikeGap: number;
    futureLabel: string;
  }
> = {
  NIFTY: {
    label: "NIFTY 50",
    strikeGap: 50,
    futureLabel: "FUTURES",
  },
  BANKNIFTY: {
    label: "BANK NIFTY",
    strikeGap: 100,
    futureLabel: "FUTURES",
  },
  SENSEX: {
    label: "SENSEX",
    strikeGap: 100,
    futureLabel: "FUTURES",
  },
};

const INDICES: IndexKey[] = ["NIFTY", "BANKNIFTY", "SENSEX"];
const TIMEFRAMES = ["1D", "1W", "1M", "3M"];
const TF_POINTS: Record<string, number> = { "1D": 200, "1W": 300, "1M": 400, "3M": 500 };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtPrice(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtChange(diff: number, pct: number) {
  const sign = diff >= 0 ? "▲" : "▼";
  return `${sign} ₹${Math.abs(diff).toFixed(2)} (${Math.abs(pct).toFixed(2)}%)`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [marketData, setMarketData] = useState<any>(null);
  const [histories, setHistories] = useState<Record<IndexKey, { time: string; price: number }[]>>({
    NIFTY: [],
    BANKNIFTY: [],
    SENSEX: [],
  });
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [sysMetrics, setSysMetrics] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // API Modal State
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeys, setApiKeys] = useState(() => {
    // We can load from somewhat of a mocked local storage or just keep blank
    return { consumerKey: "", consumerSecret: "", mpin: "" };
  });

  // P-FnO UI state
  const [activeTab, setActiveTab] = useState<"PRICING" | "RISK">("PRICING");
  const [selectedIndex, setSelectedIndex] = useState<IndexKey | null>(null);
  const [timeframe, setTimeframe] = useState("1D");
  const [expiry, setExpiry] = useState(0);
  const [animDir, setAnimDir] = useState(1);
  const [chartAnimClass, setChartAnimClass] = useState("");

  const prevSelectedRef = useRef<IndexKey | null>(null);

  // ── WebSocket ──
  useEffect(() => {
    const socket = io("http://localhost:3001");
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));
    socket.on("portfolio_update", (data: any) => setPortfolioData(data));
    socket.on("market_update", (data: any) => {
      setMarketData(data);
      if (data.sysMetrics) setSysMetrics(data.sysMetrics);
      const time = new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setHistories((prev) => {
        const next = { ...prev };
        INDICES.forEach((idx) => {
          if (data.spots?.[idx]) {
            const pts = [...next[idx], { time, price: parseFloat(data.spots[idx]) }];
            next[idx] = pts.length > TF_POINTS[timeframe] ? pts.slice(-TF_POINTS[timeframe]) : pts;
          }
        });
        return next;
      });
    });
    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Select index tab ──
  const handleTabClick = useCallback(
    (idx: IndexKey) => {
      if (selectedIndex === idx) {
        // Deselect
        setSelectedIndex(null);
        prevSelectedRef.current = null;
        setChartAnimClass("");
        return;
      }
      const prev = prevSelectedRef.current;
      const prevPos = prev ? INDICES.indexOf(prev) : -1;
      const nextPos = INDICES.indexOf(idx);
      setAnimDir(prev === null || nextPos > prevPos ? 1 : -1);

      prevSelectedRef.current = idx;
      setSelectedIndex(idx);
      setExpiry(0);

      // Trigger chart anim
      setChartAnimClass("");
      requestAnimationFrame(() => {
        setChartAnimClass(nextPos > prevPos ? "chart-animate-right" : "chart-animate-left");
        setTimeout(() => setChartAnimClass(""), 500);
      });
    },
    [selectedIndex]
  );

  // ─── Loading screen ───
  if (!marketData?.spots) {
    return (
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div className="pulse-dot" style={{ width: 12, height: 12, background: "var(--accent)" }} />
        <span
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 13,
            letterSpacing: 3,
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Booting Quant Engine...
        </span>
      </div>
    );
  }

  // ── Derived data ──
  const displayIdx = selectedIndex ?? "NIFTY";
  const meta = INDEX_META[displayIdx];
  const idxNum = INDICES.indexOf(displayIdx);
  const chainCandidate = marketData.chains?.[displayIdx]?.[expiry];
  const activeChain = Array.isArray(chainCandidate) ? chainCandidate : (marketData.chains?.[displayIdx] || []);
  const activeHistory = histories[displayIdx];

  // Dynamic expiry labels from backend (real dates)
  const expiryLabels: string[] = marketData.expiryLabels?.[displayIdx] || ["—", "—", "—", "—"];

  const spot = parseFloat(marketData.spots[displayIdx]);

  const prevCloseStr = marketData.prevClose?.[displayIdx];
  const prevClose = prevCloseStr ? parseFloat(prevCloseStr) : (spot * 0.993);

  // Trend direction
  let trendColor = "var(--text-primary)";
  if (activeHistory.length > 0) {
    const last = activeHistory[activeHistory.length - 1].price;
    trendColor = last >= prevClose ? "var(--green)" : "var(--red)";
  }

  const activeDTE = Array.isArray(marketData.timeToMaturity?.[0]) 
                     ? (marketData.timeToMaturity[idxNum]?.[expiry] || marketData.timeToMaturity[idxNum]?.[0])
                     : marketData.timeToMaturity;

  // Per-tab info
  const tabInfo = INDICES.map((idx) => {
    const s = parseFloat(marketData.spots[idx]);
    const pc = marketData.prevClose ? parseFloat(marketData.prevClose[idx]) : s * 0.993;
    const diff = s - pc;
    const pct = (diff / pc) * 100;
    return { key: idx, label: INDEX_META[idx].label, spot: s, diff, pct };
  });

  const rf = parseFloat(marketData.rfRate) / 100;
  const t = parseFloat(activeDTE || "0") / 365;
  const futurePrice = spot * Math.exp(rf * t);
  const futureDiff = futurePrice - spot;
  const futurePct = spot > 0 ? (futureDiff / spot) * 100 : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        height: "100vh",
        background: "var(--bg)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Rajdhani', sans-serif",
      }}
    >
      {/* ══ NAVBAR ══════════════════════════════════════════════════════════════ */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--navbar-bg)",
          borderBottom: "1px solid var(--navbar-border)",
          height: 58,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
          gap: 14,
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 34,
            height: 34,
            background: "linear-gradient(135deg, #c8a96e, #8b6914)",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            fontWeight: 700,
            color: "#000",
            letterSpacing: -0.5,
            flexShrink: 0,
          }}
        >
          P
        </div>
        <div>
          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: 1,
            }}
          >
            P<span style={{ color: "var(--accent)" }}>-FnO</span>
          </div>
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Futures &amp; Options
          </div>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            marginLeft: 24,
            display: "flex",
            gap: 4,
            background: "#0f0f10",
            padding: "3px",
            borderRadius: 5,
            border: "1px solid var(--panel-border)",
          }}
        >
          {(["PRICING", "RISK"] as const).map((tab) => (
            <button
              key={tab}
              id={`nav-tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                letterSpacing: 2,
                padding: "4px 16px",
                borderRadius: 3,
                border: "none",
                cursor: "pointer",
                textTransform: "uppercase",
                transition: "all 0.2s",
                background: activeTab === tab ? "#c8a96e18" : "transparent",
                color: activeTab === tab ? "var(--accent)" : "var(--text-muted)",
                outline: activeTab === tab ? "1px solid #c8a96e30" : "none",
              }}
            >
              {tab === "PRICING" ? "Option Chain" : "Risk Manager"}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Market data */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 20 }}>
          {/* ── SysMetrics HUD ── */}
          {sysMetrics && (
            <div style={{ display: "flex", gap: 12, marginRight: 16, background: "rgba(200, 169, 110, 0.05)", padding: "4px 12px", borderRadius: 4, border: "1px solid rgba(200, 169, 110, 0.2)" }}>
               <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>Engine Latency</span>
                  <span style={{ fontSize: 11, color: "var(--call-green)", fontWeight: 700 }}>{sysMetrics.latencyMs}ms</span>
               </div>
               <div style={{ width: 1, background: "rgba(200,169,110,0.2)" }} />
               <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>Throughput</span>
                  <span style={{ fontSize: 11, color: "var(--accent)" }}>{sysMetrics.throughputPerSec} ops/s</span>
               </div>
               <div style={{ width: 1, background: "rgba(200,169,110,0.2)" }} />
               <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>Strikes</span>
                  <span style={{ fontSize: 11, color: "var(--text-primary)" }}>{sysMetrics.totalStrikes}</span>
               </div>
            </div>
          )}

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              DTE
            </div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 14,
                color: "var(--text-primary)",
              }}
            >
              {activeDTE}d
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              RF Rate
            </div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 14,
                color: "var(--accent)",
              }}
            >
              {marketData.rfRate}%
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className="pulse-dot" />
            <span
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 10,
                color: "var(--text-muted)",
                letterSpacing: 1,
              }}
            >
              {isConnected ? "LIVE" : "OFFLINE"}
            </span>
          </div>
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginLeft: 4,
            }}
          >
            NSE · MARKET OPEN
          </div>
          
          <button
            onClick={() => setShowApiModal(true)}
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 10,
              padding: "4px 10px",
              border: "1px solid var(--panel-border)",
              background: "#0f0f10",
              color: "var(--accent)",
              cursor: "pointer",
              borderRadius: 4,
              letterSpacing: 1,
            }}
          >
            API KEYS
          </button>
        </div>
      </nav>

      {/* ══ INDEX BAR ════════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          background: "var(--panel-bg)",
          borderBottom: "1px solid var(--panel-border)",
          height: 64,
          padding: "0 28px",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        {tabInfo.map((ti, i) => {
          const isSelected = selectedIndex === ti.key;
          const isHidden = selectedIndex !== null && !isSelected;
          return (
            <div
              key={ti.key}
              id={`index-tab-${ti.key.toLowerCase()}`}
              onClick={() => handleTabClick(ti.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: isHidden ? "0" : "0 24px",
                cursor: "pointer",
                position: "relative",
                borderRight: isHidden ? "none" : "1px solid var(--panel-border)",
                minWidth: isHidden ? 0 : isSelected ? 240 : 200,
                maxWidth: isHidden ? 0 : undefined,
                overflow: "hidden",
                opacity: isHidden ? 0 : 1,
                transition:
                  "min-width 0.5s cubic-bezier(0.4,0,0.2,1), max-width 0.5s cubic-bezier(0.4,0,0.2,1), opacity 0.4s, padding 0.5s",
                background: isSelected ? "#14140f" : "transparent",
              }}
            >
              {/* Active underline */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "var(--accent)",
                  transform: isSelected ? "scaleX(1)" : "scaleX(0)",
                  transition: "transform 0.25s ease",
                }}
              />
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 2,
                  color: isSelected ? "var(--accent)" : "var(--text-secondary)",
                  textTransform: "uppercase",
                  transition: "color 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                {ti.label}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: isSelected ? 22 : 17,
                    color: isSelected ? "#fff" : "var(--text-primary)",
                    transition: "font-size 0.3s, color 0.3s",
                    letterSpacing: -0.5,
                    lineHeight: 1.2,
                  }}
                >
                  {fmtPrice(ti.spot)}
                </div>
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 10,
                    color: ti.diff >= 0 ? "var(--green)" : "var(--red)",
                  }}
                >
                  {fmtChange(ti.diff, ti.pct)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ MAIN ═════════════════════════════════════════════════════════════════ */}
      {activeTab === "PRICING" ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Chart Area */}
          <div
            id="chart-area"
            className={chartAnimClass}
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              transition: "flex 0.6s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {/* Chart label overlay */}
            <div style={{ position: "absolute", top: 24, left: 28, zIndex: 10 }}>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 11,
                  letterSpacing: 3,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                {meta.label}
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 42,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: trendColor,
                  transition: "color 0.4s",
                }}
              >
                {fmtPrice(spot)}
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 14,
                  marginTop: 4,
                  color: trendColor,
                  transition: "color 0.4s",
                }}
              >
                {fmtChange(
                  activeHistory.length >= 2
                    ? activeHistory[activeHistory.length - 1].price - activeHistory[0].price
                    : 0,
                  activeHistory.length >= 2
                    ? ((activeHistory[activeHistory.length - 1].price - activeHistory[0].price) /
                        activeHistory[0].price) *
                        100
                    : 0
                )}
                {"  "}
                {timeframe}
              </div>
            </div>

            {/* Timeframe buttons */}
            <div
              style={{
                position: "absolute",
                top: 24,
                right: 28,
                zIndex: 10,
                display: "flex",
                gap: 8,
              }}
            >
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  id={`tf-btn-${tf.toLowerCase()}`}
                  onClick={() => setTimeframe(tf)}
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 1,
                    padding: "4px 10px",
                    border: `1px solid ${timeframe === tf ? "var(--accent)" : "var(--panel-border)"}`,
                    background: timeframe === tf ? "rgba(200,169,110,0.08)" : "transparent",
                    color: timeframe === tf ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer",
                    borderRadius: 3,
                    transition: "all 0.2s",
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Canvas chart from LiveChart */}
            <LiveChart data={activeHistory} previousClose={prevClose} />
          </div>

          {/* Options Panel */}
          <div
            id="options-panel"
            style={{
              width: selectedIndex ? 420 : 0,
              overflow: "hidden",
              transition: "width 0.55s cubic-bezier(0.4,0,0.2,1)",
              background: "var(--panel-bg)",
              borderLeft: "1px solid var(--panel-border)",
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ width: 420, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Panel header */}
              <div
                style={{
                  padding: "18px 20px 14px",
                  borderBottom: "1px solid var(--panel-border)",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 3,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: 10,
                  }}
                >
                  {meta.label} · Option Chain
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {expiryLabels.map((ex: string, i: number) => (
                    <button
                      key={ex}
                      id={`expiry-btn-${i}`}
                      onClick={() => setExpiry(i)}
                      style={{
                        fontFamily: "'Share Tech Mono', monospace",
                        fontSize: 10,
                        letterSpacing: 0.5,
                        padding: "4px 10px",
                        border: `1px solid ${expiry === i ? "var(--accent)" : "var(--panel-border)"}`,
                        background: expiry === i ? "rgba(200,169,110,0.07)" : "transparent",
                        color: expiry === i ? "var(--accent)" : "var(--text-muted)",
                        cursor: "pointer",
                        borderRadius: 3,
                        transition: "all 0.2s",
                      }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* Futures strip */}
              <div
                style={{
                  padding: "10px 14px",
                  borderBottom: "1px solid var(--panel-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#0a0a0c",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 2,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {meta.futureLabel}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 16,
                      color: "var(--text-primary)",
                    }}
                  >
                    {fmtPrice(futurePrice)}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 11,
                      color: futureDiff >= 0 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {fmtChange(futureDiff, futurePct)}
                  </div>
                </div>
              </div>

              {/* Chain */}
              <OptionsChain chain={activeChain} spotPrice={spot} />
            </div>
          </div>
        </div>
      ) : (
        /* ── RISK TAB ─────────────────────────────────────────────────────── */
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          <RiskDashboard chain={activeChain} spotPrice={spot} portfolioData={portfolioData} />
        </div>
      )}

      {/* ── API Modal Overlay ─────────────────────────────────────────────────── */}
      {showApiModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)" }}>
          <div style={{ width: 420, background: "var(--panel-bg)", border: "1px solid var(--panel-border)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--panel-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0c" }}>
               <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "var(--accent)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Kotak Neo Integration</span>
               <button onClick={() => setShowApiModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
               <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                 Connect your Kotak Trade API keys to enable live order routing and real-time margin tracking for the simulation engine. Keys are sent securely and stored temporarily.
               </div>
               
               <div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Consumer Key</div>
                  <input type="password" value={apiKeys.consumerKey} onChange={e => setApiKeys({...apiKeys, consumerKey: e.target.value})} style={{ width: "100%", background: "#111", border: "1px solid #333", color: "var(--text-primary)", padding: "10px", borderRadius: 4, fontFamily: "'Space Mono', monospace", fontSize: 13, outline: "none" }} placeholder="xxxxxxxxxxxx" />
               </div>

               <div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Consumer Secret</div>
                  <input type="password" value={apiKeys.consumerSecret} onChange={e => setApiKeys({...apiKeys, consumerSecret: e.target.value})} style={{ width: "100%", background: "#111", border: "1px solid #333", color: "var(--text-primary)", padding: "10px", borderRadius: 4, fontFamily: "'Space Mono', monospace", fontSize: 13, outline: "none" }} placeholder="xxxxxxxxxxxx" />
               </div>

               <div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase" }}>Trading MPIN</div>
                  <input type="password" value={apiKeys.mpin} onChange={e => setApiKeys({...apiKeys, mpin: e.target.value})} style={{ width: "100%", background: "#111", border: "1px solid #333", color: "var(--text-primary)", padding: "10px", borderRadius: 4, fontFamily: "'Space Mono', monospace", fontSize: 13, outline: "none" }} placeholder="••••••" maxLength={6} />
               </div>

               <button onClick={() => {
                 setTimeout(() => setShowApiModal(false), 800);
               }} style={{ marginTop: 8, padding: "12px", background: "var(--accent)", color: "#000", border: "none", borderRadius: 4, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 13, cursor: "pointer", transition: "filter 0.2s" }}
               onMouseEnter={e => e.currentTarget.style.filter = "brightness(1.1)"}
               onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"}>
                 CONNECT ACCOUNT
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
