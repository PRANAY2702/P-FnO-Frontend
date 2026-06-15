"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

interface KotakSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isFirstTime?: boolean;
}

export default function KotakSetupModal({ visible, onClose, onSuccess, isFirstTime }: KotakSetupModalProps) {
  const { saveKotakApi, kotakApiSaved } = useAuth();
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [mpin, setMpin] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    if (visible) {
      setResult(null);
      setTimeout(() => setAnimIn(true), 10);
    } else {
      setAnimIn(false);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!consumerKey || !consumerSecret || !mpin) {
      setResult({ success: false, message: "All fields are required" });
      return;
    }
    if (mpin.length !== 6) {
      setResult({ success: false, message: "MPIN must be 6 digits" });
      return;
    }

    setSaving(true);
    const res = await saveKotakApi({ consumerKey, consumerSecret, mpin });
    setSaving(false);

    if (res.success) {
      setResult({ success: true, message: "Kotak API keys saved successfully! You can now place orders." });
      setTimeout(() => {
        onSuccess?.();
        if (!isFirstTime) onClose();
      }, 1500);
    } else {
      setResult({ success: false, message: res.error || "Failed to save API keys" });
    }
  };

  if (!visible) return null;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#111",
    border: "1px solid #333",
    color: "#f0f0f0",
    padding: "12px 14px",
    borderRadius: 6,
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: animIn ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0)",
        backdropFilter: animIn ? "blur(8px)" : "blur(0px)",
        transition: "all 0.3s ease",
      }}
      onClick={(e) => {
        if (!isFirstTime && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 460,
          background: "#0f0f10",
          border: "1px solid #222226",
          borderRadius: 12,
          overflow: "hidden",
          transform: animIn ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
          opacity: animIn ? 1 : 0,
          transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "0 0 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(200,169,110,0.08)",
        }}
      >
        {/* Gold top bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, transparent, #c8a96e, transparent)" }} />

        {/* Header */}
        <div
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid #1a1a1e",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#0a0a0c",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: "#c8a96e",
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {isFirstTime ? "Welcome! Set Up Trading" : "Kotak Neo Integration"}
            </div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "#555",
                letterSpacing: 1,
                marginTop: 3,
              }}
            >
              {kotakApiSaved ? "Update your API credentials" : "Connect your Kotak API to enable trading"}
            </div>
          </div>
          {!isFirstTime && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "#555",
                cursor: "pointer",
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {isFirstTime && (
            <div
              style={{
                background: "rgba(200,169,110,0.06)",
                border: "1px solid rgba(200,169,110,0.15)",
                borderRadius: 8,
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 14,
                  color: "#c8a96e",
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                🔑 First-time Setup Required
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: "#888",
                  lineHeight: 1.7,
                }}
              >
                To buy and sell stocks, you need to connect your Kotak Neo Trade API.
                Get your keys from{" "}
                <span style={{ color: "#c8a96e", textDecoration: "underline" }}>neo.kotaksecurities.com</span>
                {" "}→ Invest → Trade API → API Dashboard.
                Your keys will be securely saved with your account.
              </div>
            </div>
          )}

          {!isFirstTime && (
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 13,
                color: "#888",
                lineHeight: 1.5,
              }}
            >
              Connect your Kotak Trade API keys to enable live order routing. Keys are encrypted and stored securely with your email.
            </div>
          )}

          {/* Consumer Key */}
          <div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "#555",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Consumer Key
            </div>
            <input
              type="password"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              placeholder="Enter your consumer key"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#c8a96e60")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#333")}
            />
          </div>

          {/* Consumer Secret */}
          <div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "#555",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Consumer Secret
            </div>
            <input
              type="password"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              placeholder="Enter your consumer secret"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#c8a96e60")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#333")}
            />
          </div>

          {/* Trading MPIN */}
          <div>
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "#555",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              Trading MPIN
            </div>
            <input
              type="password"
              value={mpin}
              onChange={(e) => setMpin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              maxLength={6}
              inputMode="numeric"
              style={{ ...inputStyle, textAlign: "center", fontSize: 18, letterSpacing: 8 }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#c8a96e60")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#333")}
            />
          </div>

          {/* Result */}
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
              }}
            >
              {result.success ? "✓" : "⚠"} {result.message}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              padding: "14px",
              background: saving
                ? "rgba(200,169,110,0.15)"
                : "linear-gradient(135deg, #c8a96e, #a0842a)",
              border: "none",
              borderRadius: 8,
              color: saving ? "#c8a96e" : "#000",
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 2,
              cursor: saving ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              transition: "all 0.2s",
              boxShadow: saving ? "none" : "0 4px 20px rgba(200,169,110,0.25)",
            }}
            onMouseEnter={(e) => {
              if (!saving) e.currentTarget.style.filter = "brightness(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            {saving ? "Saving..." : isFirstTime ? "Connect & Start Trading" : "Save API Keys"}
          </button>

          {isFirstTime && (
            <div
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "#444",
                textAlign: "center",
                letterSpacing: 1,
              }}
            >
              You can update these later from the API KEYS button in the navbar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
