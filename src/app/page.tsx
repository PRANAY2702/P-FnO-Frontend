"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import io from "socket.io-client";
import OptionsChain from "../components/OptionsChain";
import RiskDashboard from "../components/RiskDashboard";
import LiveChart from "../components/LiveChart";
import KotakSetupModal from "../components/KotakSetupModal";
import { useAuth } from "../context/AuthContext";

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
const TIMEFRAMES = ["1D", "1W", "1M", "1Y", "5Y", "MAX"];
const TF_POINTS: Record<string, number> = { "1D": 200, "1W": 300, "1M": 400, "1Y": 252, "5Y": 260, "MAX": 300 };

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
  const router = useRouter();
  const { user, isAuthenticated, isLoading, kotakApiSaved, logout } = useAuth();

  const [marketData, setMarketData] = useState<any>(null);
  const [histories, setHistories] = useState<Record<IndexKey, { time: string; price: number }[]>>({
    NIFTY: [],
    BANKNIFTY: [],
    SENSEX: [],
  });
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [sysMetrics, setSysMetrics] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Kotak API Modal State
  const [showApiModal, setShowApiModal] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show first-time Kotak setup after login
  useEffect(() => {
    if (isAuthenticated && !kotakApiSaved && !showFirstTimeSetup) {
      const timer = setTimeout(() => setShowFirstTimeSetup(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, kotakApiSaved, showFirstTimeSetup]);

  // P-FnO UI state
  const [activeTab, setActiveTab] = useState<"PRICING" | "RISK">("PRICING");
  const [selectedIndex, setSelectedIndex] = useState<IndexKey | null>(null);
  const [timeframe, setTimeframe] = useState("1D");
  const [historicalData, setHistoricalData] = useState<{ time: string; price: number }[]>([]);
  const [isFetchingHistorical, setIsFetchingHistorical] = useState(false);
  const [expiry, setExpiry] = useState(0);
  const [animDir, setAnimDir] = useState(1);
  const [chartAnimClass, setChartAnimClass] = useState("");

  const prevSelectedRef = useRef<IndexKey | null>(null);

  // ── WebSocket ──
  useEffect(() => {
    // Connect directly to backend — Next.js rewrites can't proxy WebSocket upgrades
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== "undefined"
      ? `http://${window.location.hostname}:3001`
      : "http://localhost:3001");
    const socket = io(backendUrl);
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
  }, [timeframe]);

  // ── Fetch historical data ──
  useEffect(() => {
    const fetchIdx = selectedIndex ?? "NIFTY";
    let active = true;
    setIsFetchingHistorical(true);

    const backendUrl = typeof window !== "undefined"
      ? `http://${window.location.hostname}:3001`
      : "http://localhost:3001";

    fetch(`${backendUrl}/api/prices/historical?symbol=${fetchIdx}&range=${timeframe}`)
      .then(r => r.json())
      .then(data => {
        if (active && data.data) {
          // Format times for display based on timeframe
          const formatted = data.data.map((d: any) => {
            const date = new Date(d.time);
            
            const dStr = date.getDate().toString().padStart(2, "0");
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const mStr = months[date.getMonth()];
            const yStr = date.getFullYear().toString().slice(-2);
            const hr = date.getHours().toString().padStart(2, "0");
            const min = date.getMinutes().toString().padStart(2, "0");

            let timeStr = "";
            if (timeframe === "1D") {
              timeStr = `${hr}:${min}`;
            } else if (timeframe === "1W") {
              timeStr = `${dStr} ${mStr}, ${hr}:${min}`;
            } else if (timeframe === "1M" || timeframe === "1Y") {
              timeStr = `${dStr} ${mStr}`;
            } else {
              timeStr = `${mStr} '${yStr}`;
            }
            
            return { time: timeStr, price: d.price };
          });
          setHistoricalData(formatted);
          setIsFetchingHistorical(false);
        }
      })
      .catch(err => {
        console.error("Failed to fetch historical data", err);
        if (active) setIsFetchingHistorical(false);
      });

    return () => { active = false; };
  }, [timeframe, selectedIndex]);

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
  if (isLoading || !isAuthenticated || !marketData?.spots) {
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
  
  let activeHistory = historicalData;
  if (timeframe === "1D") {
    if (historicalData.length > 0) {
      activeHistory = [...historicalData, { time: "Now", price: spot }];
    } else {
      activeHistory = histories[displayIdx];
    }
  }

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
              border: `1px solid ${kotakApiSaved ? 'rgba(0,230,118,0.3)' : 'var(--panel-border)'}`,
              background: kotakApiSaved ? 'rgba(0,230,118,0.06)' : '#0f0f10',
              color: kotakApiSaved ? '#00e676' : 'var(--accent)',
              cursor: "pointer",
              borderRadius: 4,
              letterSpacing: 1,
            }}
          >
            {kotakApiSaved ? '✓ API' : 'API KEYS'}
          </button>

          {/* User info + Logout */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #c8a96e, #8b6914)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, color: '#000' }}>
                {(user.fullName || user.email || 'U')[0].toUpperCase()}
              </div>
              <button
                onClick={logout}
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 9,
                  padding: '3px 8px',
                  border: '1px solid #2a2a2e',
                  background: 'transparent',
                  color: '#555',
                  cursor: 'pointer',
                  borderRadius: 3,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff1744'; e.currentTarget.style.color = '#ff1744'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2a2e'; e.currentTarget.style.color = '#555'; }}
              >
                Logout
              </button>
            </div>
          )}
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
            {isFetchingHistorical ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, letterSpacing: 2 }}>
                FETCHING DATA...
              </div>
            ) : (
              <LiveChart data={activeHistory} previousClose={prevClose} />
            )}
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
              <OptionsChain chain={activeChain} spotPrice={spot} instrument={displayIdx} />
            </div>
          </div>
        </div>
      ) : (
        /* ── RISK TAB ─────────────────────────────────────────────────────── */
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          <RiskDashboard chain={activeChain} spotPrice={spot} portfolioData={portfolioData} />
        </div>
      )}

      {/* ── Kotak API Setup Modal ────────────────────────────────────────────── */}
      <KotakSetupModal
        visible={showApiModal}
        onClose={() => setShowApiModal(false)}
      />

      {/* ── First-time Kotak Setup (mandatory after login) ─────────────────── */}
      <KotakSetupModal
        visible={showFirstTimeSetup && !kotakApiSaved}
        onClose={() => setShowFirstTimeSetup(false)}
        onSuccess={() => setShowFirstTimeSetup(false)}
        isFirstTime
      />
    </div>
  );
}
