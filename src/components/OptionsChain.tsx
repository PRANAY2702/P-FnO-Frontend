"use client";

import React, { useState } from "react";
import { Pin, ArrowLeft } from "lucide-react";
import OrderModal from "./OrderModal";
import LiveChart from "./LiveChart";
import KotakSetupModal from "./KotakSetupModal";
import { useAuth } from "../context/AuthContext";

const normCdf = (x: number) => {
  let t = 1 / (1 + 0.2316419 * Math.abs(x));
  let d = 0.3989423 * Math.exp(-x * x / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
};

const calculateBlack76 = (F: number, K: number, T: number, r: number, v: number, type: "call" | "put") => {
  if (T <= 0) return 0;
  const d1 = (Math.log(F / K) + 0.5 * v * v * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);
  const discount = Math.exp(-r * T);
  if (type === "call") return discount * (F * normCdf(d1) - K * normCdf(d2));
  return discount * (K * normCdf(-d2) - F * normCdf(-d1));
};

interface ChainRow {
  strike: number;
  call: { premium: number; delta: number; gamma: number; theta: number; vega: number };
  put: { premium: number; delta: number; gamma: number; theta: number; vega: number };
}

interface Props {
  chain: ChainRow[];
  spotPrice: number;
  instrument?: string;
  activeHistory?: { time: string; timestamp?: number; price: number }[];
  dte?: number;
  rfRate?: number;
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function GreekTooltip({
  greeks,
  side,
  visible,
}: {
  greeks: ChainRow["call"] | null;
  side: "call" | "put";
  visible: boolean;
}) {
  if (!greeks || !visible) return null;
  const color = side === "call" ? "var(--call-green)" : "var(--put-red)";
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        [side === "call" ? "right" : "left"]: "calc(100% + 8px)",
        transform: "translateY(-50%)",
        zIndex: 50,
        background: "#0d0d0f",
        border: `1px solid ${color}40`,
        borderRadius: 4,
        padding: "8px 12px",
        minWidth: 140,
        boxShadow: `0 0 18px ${color}20`,
        animation: "fadeIn 0.15s ease both",
        pointerEvents: "none",
      }}
    >
      {[
        { label: "Delta", val: greeks.delta.toFixed(3), col: "#a0c8ff" },
        { label: "Gamma", val: greeks.gamma.toFixed(4), col: "#c8a0ff" },
        { label: "Theta", val: greeks.theta.toFixed(3), col: "#ffc060" },
        { label: "Vega", val: greeks.vega?.toFixed(3) ?? "—", col: "#60d0ff" },
      ].map(({ label, val, col }) => (
        <div
          key={label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9,
              letterSpacing: 1,
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: col }}>
            {val}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Trade Buttons ─────────────────────────────────────────────────────────────
function TradeButtons({
  side,
  onBuy,
  onSell,
  visible,
}: {
  side: "call" | "put";
  onBuy: () => void;
  onSell: () => void;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <div
      style={{
        display: "flex",
        gap: 3,
        animation: "fadeIn 0.15s ease both",
      }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onBuy(); }}
        style={{
          padding: "3px 8px",
          borderRadius: 3,
          border: "none",
          background: "rgba(0,230,118,0.15)",
          color: "#00e676",
          fontFamily: "'Space Mono', monospace",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1,
          cursor: "pointer",
          transition: "all 0.15s",
          textTransform: "uppercase",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0,230,118,0.3)";
          e.currentTarget.style.boxShadow = "0 0 8px rgba(0,230,118,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(0,230,118,0.15)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        B
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onSell(); }}
        style={{
          padding: "3px 8px",
          borderRadius: 3,
          border: "none",
          background: "rgba(255,23,68,0.15)",
          color: "#ff1744",
          fontFamily: "'Space Mono', monospace",
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 1,
          cursor: "pointer",
          transition: "all 0.15s",
          textTransform: "uppercase",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,23,68,0.3)";
          e.currentTarget.style.boxShadow = "0 0 8px rgba(255,23,68,0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,23,68,0.15)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        S
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const OptionsChain = React.memo(function OptionsChain({ chain, spotPrice, instrument = "NIFTY", activeHistory, dte, rfRate }: Props) {
  const { kotakApiSaved } = useAuth();
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [tooltipSide, setTooltipSide] = useState<"call" | "put">("call");
  const [pinnedOption, setPinnedOption] = useState<{strike: number, type: "call" | "put"} | null>(null);
  const [showApiSetup, setShowApiSetup] = useState(false);

  // Order modal state
  const [orderModal, setOrderModal] = useState<{
    visible: boolean;
    orderType: "BUY" | "SELL";
    strike: number;
    optionType: "CALL" | "PUT";
    premium: number;
  }>({
    visible: false,
    orderType: "BUY",
    strike: 0,
    optionType: "CALL",
    premium: 0,
  });

  const openOrder = (orderType: "BUY" | "SELL", strike: number, optionType: "CALL" | "PUT", premium: number) => {
    if (!kotakApiSaved) {
      setShowApiSetup(true);
      return;
    }
    setOrderModal({ visible: true, orderType, strike, optionType, premium });
  };

  if (!chain || chain.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        Loading Chain...
      </div>
    );
  }

  // If an option is pinned, show its 1D graph instead of the chain
  if (pinnedOption && activeHistory && dte !== undefined) {
    const isCall = pinnedOption.type === "call";
    const strike = pinnedOption.strike;
    const r = 0; // Black-76 for Indian options uses r=0
    const t = Math.max(0.00001, dte / 365.0);

    const historyData = activeHistory.map(d => {
      const spot = d.price;
      const F = spot * Math.exp(r * t);
      const moneyness = Math.abs(spot - strike) / spot;
      const v = 0.15 + (moneyness * 0.5);
      const optPrice = calculateBlack76(F, strike, t, r, v, pinnedOption.type);
      return { ...d, price: optPrice };
    });

    const currentOptPrice = historyData.length > 0 ? historyData[historyData.length - 1].price : 0;
    const prevOptPrice = historyData.length > 0 ? historyData[0].price : 0;
    const diff = currentOptPrice - prevOptPrice;
    const pct = prevOptPrice > 0 ? (diff / prevOptPrice) * 100 : 0;

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--panel-bg)", height: "100%", overflow: "hidden" }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--panel-border)", display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            onClick={() => setPinnedOption(null)}
            style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "var(--text-muted)", cursor: "pointer", borderRadius: 4, padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: "var(--text-secondary)", letterSpacing: 1 }}>
              {instrument} {strike} {isCall ? "CE" : "PE"}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 28, color: isCall ? "var(--call-green)" : "var(--put-red)", fontWeight: 700 }}>
                ₹{currentOptPrice.toFixed(2)}
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 12, color: diff >= 0 ? "var(--green)" : "var(--red)" }}>
                {diff >= 0 ? "▲" : "▼"} ₹{Math.abs(diff).toFixed(2)} ({Math.abs(pct).toFixed(2)}%)
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, position: "relative" }}>
          <LiveChart data={historyData} previousClose={prevOptPrice} />
        </div>
      </div>
    );
  }

  // Find ATM
  const atmStrike = chain.reduce((prev, cur) =>
    Math.abs(cur.strike - spotPrice) < Math.abs(prev.strike - spotPrice) ? cur : prev
  ).strike;

  // Max OI proxy (use premium as OI surrogate, scaled)
  const maxCall = Math.max(...chain.map((r) => r.call.premium));
  const maxPut = Math.max(...chain.map((r) => r.put.premium));

  return (
    <>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Column header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr 60px 80px 60px 1fr auto",
            padding: "8px 14px",
            borderBottom: "1px solid var(--panel-border)",
            flexShrink: 0,
            background: "#0a0a0c",
          }}
        >
          {[
            { label: "TRADE", align: "center", col: "var(--text-muted)", w: "44px" },
            { label: "CALL LTP", align: "left", col: "rgba(0,230,118,0.5)" },
            { label: "OI", align: "left", col: "var(--text-muted)" },
            { label: "STRIKE", align: "center", col: "var(--text-muted)" },
            { label: "OI", align: "right", col: "var(--text-muted)" },
            { label: "PUT LTP", align: "right", col: "rgba(255,23,68,0.5)" },
            { label: "TRADE", align: "center", col: "var(--text-muted)", w: "44px" },
          ].map(({ label, align, col }, idx) => (
            <div
              key={`${label}-${idx}`}
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                letterSpacing: 1.5,
                color: col,
                textAlign: align as any,
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Scrollable rows */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {chain.map((row, i) => {
            const isAtm = row.strike === atmStrike;
            const callOiPct = (row.call.premium / maxCall) * 100;
            const putOiPct = (row.put.premium / maxPut) * 100;
            const isHovered = hoveredRow === i;

            return (
              <div
                key={row.strike}
                id={`chain-row-${row.strike}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr 60px 80px 60px 1fr auto",
                  padding: "9px 14px",
                  borderBottom: isAtm ? "none" : "1px solid #1a1a1e",
                  borderTop: isAtm ? "1px solid rgba(200,169,110,0.2)" : "none",
                  borderBottomColor: isAtm ? "rgba(200,169,110,0.2)" : undefined,
                  background: isAtm
                    ? "rgba(200,169,110,0.04)"
                    : isHovered
                    ? "var(--hover-bg)"
                    : "transparent",
                  cursor: "pointer",
                  alignItems: "center",
                  transition: "background 0.15s",
                  position: "relative",
                }}
                onMouseEnter={() => setHoveredRow(i)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {/* ATM badge */}
                {isAtm && (
                  <div
                    style={{
                      position: "absolute",
                      left: 4,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 7,
                      color: "var(--accent)",
                      letterSpacing: 1,
                      pointerEvents: "none",
                    }}
                  >
                    ATM
                  </div>
                )}

                {/* CALL Trade Buttons & Pin */}
                <div style={{ width: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <TradeButtons
                    side="call"
                    onBuy={() => openOrder("BUY", row.strike, "CALL", row.call.premium)}
                    onSell={() => openOrder("SELL", row.strike, "CALL", row.call.premium)}
                    visible={isHovered}
                  />
                  {isHovered && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPinnedOption({ strike: row.strike, type: "call" }); }}
                      style={{ background: "transparent", border: "none", color: "var(--call-green)", cursor: "pointer", padding: 2, opacity: 0.7 }}
                      title="View 1D Graph"
                    >
                      <Pin size={12} />
                    </button>
                  )}
                </div>

                {/* CALL side */}
                <div
                  style={{ textAlign: "left", position: "relative" }}
                  onMouseEnter={() => setTooltipSide("call")}
                >
                  <div
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 12,
                      color: "var(--call-green)",
                    }}
                  >
                    {row.call.premium.toFixed(2)}
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: "rgba(0,230,118,0.15)",
                      borderRadius: 2,
                      marginTop: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${callOiPct}%`,
                        background: "var(--call-green)",
                        borderRadius: 2,
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                  {isHovered && tooltipSide === "call" && (
                    <GreekTooltip greeks={row.call} side="call" visible={true} />
                  )}
                </div>

                {/* Call OI label */}
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 9,
                    color: "#555",
                    textAlign: "left",
                    paddingTop: 2,
                  }}
                >
                  {(row.call.premium * 10).toFixed(0)}L
                </div>

                {/* Strike */}
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 11,
                    color: isAtm ? "var(--accent)" : "var(--text-secondary)",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {row.strike.toLocaleString("en-IN")}
                </div>

                {/* Put OI label */}
                <div
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 9,
                    color: "#555",
                    textAlign: "right",
                    paddingTop: 2,
                  }}
                >
                  {(row.put.premium * 10).toFixed(0)}L
                </div>

                {/* PUT side */}
                <div
                  style={{ textAlign: "right", position: "relative" }}
                  onMouseEnter={() => setTooltipSide("put")}
                >
                  <div
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 12,
                      color: "var(--put-red)",
                    }}
                  >
                    {row.put.premium.toFixed(2)}
                  </div>
                  <div
                    style={{
                      height: 3,
                      background: "rgba(255,23,68,0.15)",
                      borderRadius: 2,
                      marginTop: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${putOiPct}%`,
                        background: "var(--put-red)",
                        borderRadius: 2,
                        float: "right",
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                  {isHovered && tooltipSide === "put" && (
                    <GreekTooltip greeks={row.put} side="put" visible={true} />
                  )}
                </div>

                {/* PUT Trade Buttons & Pin */}
                <div style={{ width: 44, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <TradeButtons
                    side="put"
                    onBuy={() => openOrder("BUY", row.strike, "PUT", row.put.premium)}
                    onSell={() => openOrder("SELL", row.strike, "PUT", row.put.premium)}
                    visible={isHovered}
                  />
                  {isHovered && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPinnedOption({ strike: row.strike, type: "put" }); }}
                      style={{ background: "transparent", border: "none", color: "var(--put-red)", cursor: "pointer", padding: 2, opacity: 0.7 }}
                      title="View 1D Graph"
                    >
                      <Pin size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Modal */}
      <OrderModal
        visible={orderModal.visible}
        onClose={() => setOrderModal((p) => ({ ...p, visible: false }))}
        orderType={orderModal.orderType}
        instrument={instrument}
        strike={orderModal.strike}
        optionType={orderModal.optionType}
        premium={orderModal.premium}
      />

      {/* API Setup Modal — shown when user tries to trade without API keys */}
      <KotakSetupModal
        visible={showApiSetup}
        onClose={() => setShowApiSetup(false)}
        onSuccess={() => setShowApiSetup(false)}
        isFirstTime
      />
    </>
  );
});

export default OptionsChain;
