"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

interface OrderModalProps {
  visible: boolean;
  onClose: () => void;
  orderType: "BUY" | "SELL";
  instrument: string;
  strike: number;
  optionType: "CALL" | "PUT";
  premium: number;
  lotSize?: number;
}

export default function OrderModal({
  visible,
  onClose,
  orderType,
  instrument,
  strike,
  optionType,
  premium,
  lotSize = 50,
}: OrderModalProps) {
  const { token, kotakApiSaved, getApiBaseUrl } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [orderMode, setOrderMode] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState(premium.toFixed(2));
  const [isPlacing, setIsPlacing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (visible) {
      setResult(null);
      setQuantity(1);
      setLimitPrice(premium.toFixed(2));
      setTimeout(() => setAnimIn(true), 10);
    } else {
      setAnimIn(false);
    }
  }, [visible, premium]);

  const totalValue = premium * lotSize * quantity;
  const margin = totalValue * (orderType === "BUY" ? 1 : 0.2);

  const handlePlaceOrder = useCallback(async () => {
    if (!kotakApiSaved) {
      setResult({ success: false, message: "Please set up your Kotak API keys first (click API KEYS in the navbar)" });
      return;
    }

    setIsPlacing(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/orders/place`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          instrument,
          strike,
          optionType,
          orderType,
          quantity: quantity * lotSize,
          price: orderMode === "LIMIT" ? parseFloat(limitPrice) : undefined,
          orderMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ success: false, message: data.error || "Order placement failed" });
      } else {
        setResult({
          success: true,
          message: `Order ${data.orderId ? `#${data.orderId}` : ""} placed successfully! ${orderType} ${quantity} lot(s) of ${instrument} ${strike} ${optionType}`,
        });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || "Network error" });
    } finally {
      setIsPlacing(false);
    }
  }, [kotakApiSaved, token, instrument, strike, optionType, orderType, quantity, lotSize, orderMode, limitPrice, getApiBaseUrl]);

  if (!visible) return null;

  const isBuy = orderType === "BUY";
  const accentColor = isBuy ? "#00e676" : "#ff1744";
  const accentDim = isBuy ? "rgba(0,230,118,0.08)" : "rgba(255,23,68,0.08)";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: animIn ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0)",
        backdropFilter: animIn ? "blur(8px)" : "blur(0px)",
        transition: "all 0.3s ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 440,
          background: "#0f0f10",
          border: `1px solid ${accentColor}30`,
          borderRadius: 12,
          overflow: "hidden",
          transform: animIn ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
          opacity: animIn ? 1 : 0,
          transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: `0 0 60px rgba(0,0,0,0.6), 0 0 40px ${accentColor}15`,
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />

        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #1a1a1e",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#0a0a0c",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: accentDim,
                border: `1px solid ${accentColor}40`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Space Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                color: accentColor,
              }}
            >
              {isBuy ? "B" : "S"}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  color: accentColor,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {orderType} {optionType}
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 9,
                  color: "#555",
                  letterSpacing: 1,
                }}
              >
                {instrument} · Strike ₹{strike.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#555",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#fff")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Premium display */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              background: accentDim,
              border: `1px solid ${accentColor}20`,
              borderRadius: 8,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 9,
                  color: "#555",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Premium
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 22,
                  fontWeight: 700,
                  color: accentColor,
                }}
              >
                ₹{premium.toFixed(2)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 9,
                  color: "#555",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Lot Size
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 16,
                  color: "#f0f0f0",
                }}
              >
                {lotSize}
              </div>
            </div>
          </div>

          {/* Order mode toggle */}
          <div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "#555",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Order Type
            </div>
            <div style={{ display: "flex", gap: 4, background: "#080808", borderRadius: 6, padding: 3, border: "1px solid #1a1a1e" }}>
              {(["MARKET", "LIMIT"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setOrderMode(m)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 11,
                    letterSpacing: 1,
                    transition: "all 0.2s",
                    background: orderMode === m ? `${accentColor}15` : "transparent",
                    color: orderMode === m ? accentColor : "#555",
                    outline: orderMode === m ? `1px solid ${accentColor}30` : "none",
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Limit price input */}
          {orderMode === "LIMIT" && (
            <div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 9,
                  color: "#555",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Limit Price
              </div>
              <input
                type="number"
                step="0.05"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                style={{
                  width: "100%",
                  background: "#0a0a0c",
                  border: `1px solid ${accentColor}30`,
                  borderRadius: 6,
                  padding: "10px 14px",
                  color: "#f0f0f0",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 14,
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* Quantity */}
          <div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "#555",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Lots
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  border: "1px solid #2a2a2e",
                  background: "#0a0a0c",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: 18,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                style={{
                  flex: 1,
                  background: "#0a0a0c",
                  border: "1px solid #2a2a2e",
                  borderRadius: 6,
                  padding: "8px 14px",
                  color: "#f0f0f0",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 16,
                  textAlign: "center",
                  outline: "none",
                }}
              />
              <button
                onClick={() => setQuantity(Math.min(50, quantity + 1))}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  border: "1px solid #2a2a2e",
                  background: "#0a0a0c",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: 18,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Summary */}
          <div
            style={{
              background: "#080808",
              border: "1px solid #1a1a1e",
              borderRadius: 8,
              padding: "12px 14px",
            }}
          >
            {[
              { k: "Total Qty", v: `${quantity * lotSize} units` },
              { k: "Total Value", v: `₹${totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
              { k: isBuy ? "Required Margin" : "Margin Released", v: `₹${margin.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` },
            ].map(({ k, v }) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 9,
                    letterSpacing: 2,
                    color: "#555",
                    textTransform: "uppercase",
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 12,
                    color: "#f0f0f0",
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>

          {/* Result message */}
          {result && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 6,
                background: result.success ? "rgba(0,230,118,0.08)" : "rgba(255,23,68,0.08)",
                border: `1px solid ${result.success ? "rgba(0,230,118,0.25)" : "rgba(255,23,68,0.25)"}`,
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 11,
                color: result.success ? "#00e676" : "#ff1744",
                letterSpacing: 0.5,
                animation: "fadeIn 0.2s ease",
              }}
            >
              {result.success ? "✓" : "⚠"} {result.message}
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handlePlaceOrder}
            disabled={isPlacing || (result?.success ?? false)}
            style={{
              width: "100%",
              padding: "14px",
              background: isPlacing || result?.success
                ? `${accentColor}20`
                : `linear-gradient(135deg, ${accentColor}, ${isBuy ? "#00b862" : "#cc1236"})`,
              border: "none",
              borderRadius: 8,
              color: isPlacing || result?.success ? `${accentColor}80` : "#000",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: isPlacing || result?.success ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              transition: "all 0.2s",
              boxShadow: isPlacing || result?.success ? "none" : `0 4px 20px ${accentColor}30`,
            }}
          >
            {isPlacing ? "Placing Order..." : result?.success ? "Order Placed ✓" : `${orderType} ${quantity} LOT${quantity > 1 ? "S" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
