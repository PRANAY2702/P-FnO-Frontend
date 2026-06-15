"use client";

import React, { useState } from "react";
import OrderModal from "./OrderModal";

interface ChainRow {
  strike: number;
  call: { premium: number; delta: number; gamma: number; theta: number; vega: number };
  put: { premium: number; delta: number; gamma: number; theta: number; vega: number };
}

interface Props {
  chain: ChainRow[];
  spotPrice: number;
  instrument?: string;
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
const OptionsChain = React.memo(function OptionsChain({ chain, spotPrice, instrument = "NIFTY" }: Props) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [tooltipSide, setTooltipSide] = useState<"call" | "put">("call");

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

                {/* CALL Trade Buttons */}
                <div style={{ width: 44, display: "flex", justifyContent: "center" }}>
                  <TradeButtons
                    side="call"
                    onBuy={() => openOrder("BUY", row.strike, "CALL", row.call.premium)}
                    onSell={() => openOrder("SELL", row.strike, "CALL", row.call.premium)}
                    visible={isHovered}
                  />
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

                {/* PUT Trade Buttons */}
                <div style={{ width: 44, display: "flex", justifyContent: "center" }}>
                  <TradeButtons
                    side="put"
                    onBuy={() => openOrder("BUY", row.strike, "PUT", row.put.premium)}
                    onSell={() => openOrder("SELL", row.strike, "PUT", row.put.premium)}
                    visible={isHovered}
                  />
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
    </>
  );
});

export default OptionsChain;
