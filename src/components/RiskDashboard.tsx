"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

interface PortfolioPosition {
  id: string;
  type: "call" | "put";
  strike: number;
  quantity: number;
  entryPrice: number;
}

const MOCK_PORTFOLIO: PortfolioPosition[] = [
  { id: "1", type: "put",  strike: 21850, quantity: 50,  entryPrice: 20.5 },
  { id: "2", type: "put",  strike: 21950, quantity: -50, entryPrice: 85.0 },
  { id: "3", type: "call", strike: 22050, quantity: -50, entryPrice: 90.0 },
  { id: "4", type: "call", strike: 22150, quantity: 50,  entryPrice: 22.0 },
];

const MULTIPLIER = 100;
const C_CALL = "#00e676";
const C_PUT  = "#ff1744";
const C_POS  = "#00e676";
const C_NEG  = "#ff1744";
const C_ACC  = "#c8a96e";

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({
  title,
  value,
  prefix = "",
  suffix = "",
  invertColors = false,
}: {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  invertColors?: boolean;
}) {
  const isPos = value >= 0;
  let col = "var(--text-primary)";
  if (value !== 0) {
    col = invertColors
      ? isPos ? C_PUT : C_CALL
      : isPos ? C_CALL : C_PUT;
  }
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--panel-border)",
        borderRadius: 6,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 9,
          letterSpacing: 2,
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 22,
          fontWeight: 700,
          color: col,
          lineHeight: 1,
        }}
      >
        {prefix}
        {Math.abs(value).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        {suffix}
      </span>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
function Panel({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--panel-bg)",
        border: "1px solid var(--panel-border)",
        borderRadius: 6,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--panel-border)",
          background: "#0a0a0c",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div
          style={{ width: 2, height: 14, background: C_ACC, borderRadius: 1, flexShrink: 0 }}
        />
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 10,
            letterSpacing: 2,
            color: C_ACC,
            textTransform: "uppercase",
          }}
        >
          {title}
        </span>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: C_CALL,
              animation: "pulse-dot 2s infinite",
            }}
          />
          <span
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: 1,
            }}
          >
            LIVE MARK
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
const RiskDashboard = React.memo(function RiskDashboard({
  chain,
  spotPrice,
  portfolioData
}: {
  chain: any[];
  spotPrice: number;
  portfolioData?: any;
}) {
  const [maxLossLimit, setMaxLossLimit] = React.useState(10000);
  const [slPoints, setSlPoints] = React.useState(20);

  const margin = portfolioData?.margin || { total: 0, used: 0, available: 0, maxDrawdownPct: 0, runningPnL: 0 };
  const equityCurve = portfolioData?.equityCurve || [];

  const enriched = useMemo(() => {
    let netDelta = 0, netGamma = 0, netTheta = 0, netVega = 0, netPremium = 0, totalPnL = 0;

    const positions = MOCK_PORTFOLIO.map((pos) => {
      const chainRow = chain.find((r) => r.strike === pos.strike);
      const live = chainRow ? chainRow[pos.type] : { premium: 0, delta: 0, gamma: 0, theta: 0, vega: 0 };

      const currentVal = live.premium * pos.quantity * MULTIPLIER;
      const entryVal   = pos.entryPrice * pos.quantity * MULTIPLIER;
      const pnl        = currentVal - entryVal;

      const posDelta = live.delta * pos.quantity * MULTIPLIER;
      const posGamma = live.gamma * pos.quantity * MULTIPLIER;
      const posTheta = live.theta * pos.quantity * MULTIPLIER;
      const posVega  = live.vega  * pos.quantity * MULTIPLIER;

      netDelta   += posDelta;
      netGamma   += posGamma;
      netTheta   += posTheta;
      netVega    += posVega;
      netPremium += currentVal;
      totalPnL   += pnl;

      return {
        ...pos,
        currentPrice: live.premium,
        pnl,
        currentVal,
        greeks: { delta: posDelta, gamma: posGamma, theta: posTheta, vega: posVega },
      };
    });

    return { positions, netDelta, netGamma, netTheta, netVega, netPremium, totalPnL };
  }, [chain]);

  const deltaData = enriched.positions.map((p) => ({
    name: `${p.strike} ${p.type.toUpperCase()}`,
    delta: Number(p.greeks.delta.toFixed(2)),
  }));

  // Mock static stats
  const winRate = 65.4;
  const avgProfit = 3450;
  const avgLoss = -1200;

  // Real-time Margin Calcs
  const marginUsedPct = margin.total > 0 ? (margin.used / margin.total) * 100 : 0;
  const isLossBreached = margin.runningPnL < -maxLossLimit;

  // Risk per trade calc
  const recommendedLotSize = Math.floor((maxLossLimit * 0.2) / slPoints); // simple 20% of max loss per trade

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", paddingBottom: 24 }}>
      {/* ── Top Row: High-Level Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
        <MetricCard title="Net Delta"  value={enriched.netDelta} />
        <MetricCard title="Net Theta"  value={enriched.netTheta} invertColors />
        <MetricCard title="Margin Available" value={margin.available} prefix="₹" />
        <MetricCard title="Running P&L (Sim)"  value={margin.runningPnL} prefix="₹" />
        <MetricCard title="Max Drawdown" value={-margin.maxDrawdownPct} suffix="%" invertColors />
        <MetricCard title="Win Rate" value={winRate} suffix="%" />
      </div>

      {/* ── Middle Row: Equity Curve & Risk Guards ── */}
      <div style={{ display: "flex", gap: 16, height: 260 }}>
        {/* Equity Curve */}
        <Panel title="Equity Curve (Live)" style={{ flex: 2 }}>
          <div style={{ flex: 1, padding: '16px 24px 16px 0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equityCurve} margin={{ top: 10, right: 10, left: 24, bottom: 0 }}>
                {/* Repurposing BarChart as a line-ish representation by using very thin bars for aesthetic or just standard lines */}
                 <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
                 <XAxis dataKey="time" stroke="#2a2a2e" tick={{ fill: "#555", fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }} />
                 <YAxis domain={['auto', 'auto']} stroke="#2a2a2e" tick={{ fill: "#888", fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }} width={50} />
                 <RechartsTooltip 
                    contentStyle={{ background: "#0d0d0f", border: "1px solid #2a2a2e", borderRadius: 4, fontFamily: "'Share Tech Mono', monospace", fontSize: 11 }} 
                    itemStyle={{ color: C_ACC }}
                 />
                 <Bar dataKey="equity" fill={C_ACC} radius={[2,2,0,0]} barSize={4} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Risk Guard Terminal */}
        <Panel title="Risk Controls" style={{ flex: 1 }}>
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            
            {/* Margin Usage */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "var(--text-muted)", textTransform: 'uppercase' }}>Margin Utilized</span>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: marginUsedPct > 80 ? C_PUT : "var(--text-primary)" }}>{marginUsedPct.toFixed(1)}%</span>
              </div>
              <div style={{ width: "100%", height: 6, background: "#1a1a1e", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(marginUsedPct, 100)}%`, background: marginUsedPct > 80 ? C_PUT : C_ACC, transition: "width 0.3s" }} />
              </div>
            </div>

            {/* Daily Loss Guard */}
            <div style={{ background: isLossBreached ? 'rgba(255, 23, 68, 0.1)' : 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 6, border: `1px solid ${isLossBreached ? C_PUT : '#2a2a2e'}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: isLossBreached ? C_PUT : "var(--text-muted)", textTransform: 'uppercase', fontWeight: 700 }}>
                  {isLossBreached ? "⚠ MAX LOSS BREACHED" : "Daily Loss Guard"}
                </span>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "var(--text-primary)" }}>₹{maxLossLimit}</span>
              </div>
              <input 
                type="range" min="1000" max="50000" step="1000" 
                value={maxLossLimit} 
                onChange={e => setMaxLossLimit(Number(e.target.value))}
                style={{ width: "100%", accentColor: C_PUT }} 
              />
            </div>

            {/* Risk Calculator */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0c", padding: 12, borderRadius: 6, border: "1px solid #1a1a1e" }}>
              <div>
                 <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>If SL = </div>
                 <input 
                    type="number" value={slPoints} onChange={e => setSlPoints(Number(e.target.value))}
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #333', color: 'var(--text-primary)', fontFamily: "'Share Tech Mono', monospace", fontSize: 14, width: 40, outline: 'none' }}
                 />
                 <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "var(--text-muted)" }}> pts</span>
              </div>
              <div style={{ textAlign: "right" }}>
                 <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>Recommended Qty</div>
                 <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 16, color: C_CALL, fontWeight: 700 }}>{recommendedLotSize}</div>
              </div>
            </div>

          </div>
        </Panel>
      </div>

      {/* ── Bottom Row: Positions & Greeks ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, flex: 1, minHeight: 300 }}>
        {/* Portfolio Book */}
        <Panel title="Order Book / Positions">
          <div style={{ flex: 1, overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#0a0a0c", position: "sticky", top: 0, zIndex: 5 }}>
                <tr>
                  {["Instrument","Qty","Entry","Mark","P&L","Δ Delta","Γ Gamma","Θ Theta"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 14px", fontFamily: "'Share Tech Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: "var(--text-muted)", textTransform: "uppercase", textAlign: i === 0 ? "left" : "right", fontWeight: 400, borderBottom: "1px solid var(--panel-border)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {enriched.positions.map((pos) => (
                  <tr key={pos.id} style={{ borderBottom: "1px solid #1a1a1e", transition: "background 0.15s" }} onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--hover-bg)")} onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 6px", borderRadius: 3, fontFamily: "'Share Tech Mono', monospace", fontSize: 9, fontWeight: 700, marginRight: 8, background: pos.type === "call" ? "rgba(0,230,118,0.1)" : "rgba(255,23,68,0.1)", color: pos.type === "call" ? C_CALL : C_PUT }}>
                        {pos.type.toUpperCase()}
                      </span>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "var(--text-primary)" }}>{pos.strike}</span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: pos.quantity >= 0 ? "var(--text-primary)" : C_PUT }}>
                      {pos.quantity > 0 ? "+" : ""}{pos.quantity}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "var(--text-muted)" }}>{pos.entryPrice.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: "var(--text-primary)" }}>{pos.currentPrice.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", fontSize: 12, fontWeight: 700, color: pos.pnl >= 0 ? C_CALL : C_PUT }}>{pos.pnl > 0 ? "+" : ""}{pos.pnl.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#a0c8ff" }}>{pos.greeks.delta.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c8a0ff" }}>{pos.greeks.gamma.toFixed(2)}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#ffc060" }}>{pos.greeks.theta.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Delta exposure chart */}
        <Panel title="Δ Delta Exposure">
          <div style={{ flex: 1, padding: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deltaData} layout="vertical" margin={{ top: 4, right: 16, left: 24, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" horizontal={true} vertical={false} />
                <XAxis type="number" stroke="#2a2a2e" tick={{ fill: "#555", fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }} />
                <YAxis dataKey="name" type="category" stroke="#2a2a2e" tick={{ fill: "#888", fontSize: 9, fontFamily: "'Share Tech Mono', monospace" }} width={72} />
                <RechartsTooltip contentStyle={{ background: "#0d0d0f", border: "1px solid #2a2a2e", color: "var(--text-primary)", fontFamily: "'Share Tech Mono', monospace", fontSize: 11, borderRadius: 4 }} itemStyle={{ color: "var(--text-primary)", fontWeight: 700 }} formatter={(v: any) => [v, "Delta"]} />
                <ReferenceLine x={0} stroke="#2a2a2e" />
                <Bar dataKey="delta" radius={[0, 4, 4, 0]} barSize={18}>
                  {deltaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.delta >= 0 ? C_POS : C_NEG} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
});

export default RiskDashboard;
