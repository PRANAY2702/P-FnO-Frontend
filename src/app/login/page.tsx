"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ─── Animated grid background ────────────────────────────────────────────────
function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const draw = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const spacing = 48;
      ctx.strokeStyle = "rgba(200,169,110,0.04)";
      ctx.lineWidth = 1;

      // Vertical lines
      for (let x = (offset % spacing); x < canvas.width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = (offset % spacing); y < canvas.height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Glowing diagonal accent
      const grad = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.4 + 0.1 * Math.sin(offset * 0.01), "rgba(200,169,110,0.03)");
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      offset += 0.3;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Ticker tape at bottom ────────────────────────────────────────────────────
const TICKER_ITEMS = [
  { label: "NIFTY", val: "22,847.65", chg: "+0.73%" },
  { label: "BANKNIFTY", val: "48,612.30", chg: "+1.12%" },
  { label: "SENSEX", val: "75,241.90", chg: "+0.58%" },
  { label: "INDIA VIX", val: "13.42", chg: "-0.84%" },
  { label: "USDINR", val: "83.62", chg: "+0.11%" },
  { label: "CRUDE OIL", val: "6,712", chg: "-0.42%" },
  { label: "GOLD", val: "71,456", chg: "+0.38%" },
];

function TickerTape() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        background: "#0a0a0b",
        borderTop: "1px solid #1e1e22",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div className="ticker-track">
        {items.map((item, i) => {
          const isNeg = item.chg.startsWith("-");
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 28px" }}>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 2,
                  color: "#c8a96e",
                  textTransform: "uppercase",
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 11,
                  color: "#f0f0f0",
                }}
              >
                {item.val}
              </span>
              <span
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: isNeg ? "#ff1744" : "#00e676",
                }}
              >
                {item.chg}
              </span>
              <span style={{ color: "#2a2a2e", fontSize: 10, marginLeft: 4 }}>|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [termLines, setTermLines] = useState<string[]>([]);

  // Boot sequence
  useEffect(() => {
    setMounted(true);
    const lines = [
      "P-FnO Quant Engine v2.4.1",
      "Initializing Black-Scholes-Merton core...",
      "Loading NSE market data feeds...",
      "Connecting to risk management module...",
      "System ready. Awaiting authentication.",
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setTermLines((prev) => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 380);
    return () => clearInterval(interval);
  }, []);

  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("totp");
    }, 900);
  };

  const handleTotpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!totp || totp.length !== 6) {
      setError("Enter the 6-digit TOTP code.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/");
    }, 1200);
  };

  const inputStyle = (name: string): React.CSSProperties => ({
    width: "100%",
    background: focused === name ? "#141418" : "#0f0f12",
    border: `1px solid ${focused === name ? "#c8a96e60" : "#2a2a2e"}`,
    borderRadius: 6,
    padding: "12px 16px",
    color: "#f0f0f0",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 14,
    letterSpacing: 1,
    outline: "none",
    transition: "all 0.2s",
    boxShadow: focused === name ? "0 0 0 2px rgba(200,169,110,0.08)" : "none",
  });

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        background: "#080808",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: mounted ? 1 : 0,
        transition: "opacity 0.5s ease",
      }}
    >
      {/* Animated grid */}
      <GridCanvas />

      {/* Radial glow behind card */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 500,
          background: "radial-gradient(ellipse, rgba(200,169,110,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* ─── Card ─────────────────────────────────────────────────── */}
      <div
        id="login-card"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 420,
          background: "rgba(15,15,16,0.92)",
          border: "1px solid #222226",
          borderRadius: 14,
          backdropFilter: "blur(24px)",
          boxShadow:
            "0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(200,169,110,0.06), inset 0 1px 0 rgba(200,169,110,0.06)",
          overflow: "hidden",
          animation: "loginSlideUp 0.6s cubic-bezier(0.4,0,0.2,1) both",
        }}
      >
        {/* Card top bar */}
        <div
          style={{
            height: 3,
            background: "linear-gradient(90deg, transparent, #c8a96e, transparent)",
          }}
        />

        <div style={{ padding: "32px 36px 36px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: "linear-gradient(135deg, #c8a96e, #8b6914)",
                borderRadius: 9,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Space Mono', monospace",
                fontSize: 14,
                fontWeight: 700,
                color: "#000",
                boxShadow: "0 0 20px rgba(200,169,110,0.3)",
              }}
            >
              P
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "#f0f0f0",
                  letterSpacing: 1,
                  lineHeight: 1.2,
                }}
              >
                P<span style={{ color: "#c8a96e" }}>-FnO</span>
              </div>
              <div
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 9,
                  color: "#555",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                Futures &amp; Options
              </div>
            </div>
          </div>

          {/* Terminal boot log */}
          <div
            style={{
              background: "#050507",
              border: "1px solid #1a1a1e",
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 28,
              minHeight: 90,
            }}
          >
            {termLines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 9,
                  letterSpacing: 1,
                  color: i === termLines.length - 1 ? "#c8a96e" : "#444",
                  lineHeight: 1.8,
                  animation: "fadeIn 0.3s ease",
                }}
              >
                <span style={{ color: "#2a2a2e" }}>{">"}</span> {line}
                {i === termLines.length - 1 && (
                  <span className="cursor-blink">_</span>
                )}
              </div>
            ))}
          </div>

          {/* Step heading */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
                letterSpacing: 3,
                color: "#c8a96e",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              {step === "credentials" ? "Authentication" : "Two-Factor Verification"}
            </div>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 22,
                fontWeight: 600,
                color: "#f0f0f0",
                lineHeight: 1.2,
              }}
            >
              {step === "credentials" ? "Sign in to your account" : "Enter TOTP code"}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(255,23,68,0.08)",
                border: "1px solid rgba(255,23,68,0.25)",
                borderRadius: 6,
                padding: "8px 14px",
                marginBottom: 16,
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 11,
                color: "#ff1744",
                letterSpacing: 0.5,
                animation: "fadeIn 0.2s ease",
              }}
            >
              ⚠ {error}
            </div>
          )}

          {/* STEP 1 — Credentials */}
          {step === "credentials" && (
            <form onSubmit={handleCredentialSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label
                  htmlFor="username"
                  style={{
                    display: "block",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 2,
                    color: "#555",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  User ID
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocused("username")}
                  onBlur={() => setFocused(null)}
                  placeholder="Enter user ID"
                  autoComplete="username"
                  style={inputStyle("username")}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  style={{
                    display: "block",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 2,
                    color: "#555",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocused("password")}
                    onBlur={() => setFocused(null)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    style={{ ...inputStyle("password"), paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#555",
                      fontSize: 14,
                      padding: 4,
                      lineHeight: 1,
                      transition: "color 0.2s",
                    }}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? "◉" : "○"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 10,
                    color: "#c8a96e",
                    letterSpacing: 1,
                    textDecoration: "underline",
                    opacity: 0.8,
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: loading
                    ? "rgba(200,169,110,0.15)"
                    : "linear-gradient(135deg, #c8a96e, #a0842a)",
                  border: "none",
                  borderRadius: 7,
                  color: loading ? "#c8a96e" : "#000",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 2,
                  cursor: loading ? "not-allowed" : "pointer",
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                  boxShadow: loading ? "none" : "0 4px 24px rgba(200,169,110,0.25)",
                  marginTop: 4,
                }}
              >
                {loading ? "Authenticating..." : "Continue"}
              </button>
            </form>
          )}

          {/* STEP 2 — TOTP */}
          {step === "totp" && (
            <form onSubmit={handleTotpSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  background: "rgba(200,169,110,0.05)",
                  border: "1px solid rgba(200,169,110,0.15)",
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 11,
                  color: "#c8a96e",
                  letterSpacing: 0.5,
                }}
              >
                Logged in as <strong>{username}</strong> — enter your 6-digit authenticator code.
              </div>

              <div>
                <label
                  htmlFor="totp"
                  style={{
                    display: "block",
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: 10,
                    letterSpacing: 2,
                    color: "#555",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  TOTP Code
                </label>
                <input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onFocus={() => setFocused("totp")}
                  onBlur={() => setFocused(null)}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  style={{
                    ...inputStyle("totp"),
                    textAlign: "center",
                    fontSize: 28,
                    letterSpacing: 12,
                  }}
                />
              </div>

              <button
                id="totp-submit-btn"
                type="submit"
                disabled={loading || totp.length !== 6}
                style={{
                  width: "100%",
                  padding: "13px",
                  background:
                    loading || totp.length !== 6
                      ? "rgba(200,169,110,0.15)"
                      : "linear-gradient(135deg, #c8a96e, #a0842a)",
                  border: "none",
                  borderRadius: 7,
                  color: loading || totp.length !== 6 ? "#c8a96e80" : "#000",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 2,
                  cursor: loading || totp.length !== 6 ? "not-allowed" : "pointer",
                  textTransform: "uppercase",
                  transition: "all 0.2s",
                  boxShadow:
                    loading || totp.length !== 6
                      ? "none"
                      : "0 4px 24px rgba(200,169,110,0.25)",
                }}
              >
                {loading ? "Verifying..." : "Access Platform"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("credentials"); setTotp(""); setError(""); }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: 10,
                  color: "#555",
                  letterSpacing: 1,
                  textAlign: "center",
                }}
              >
                ← Back to credentials
              </button>
            </form>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid #1a1a1e",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "#333",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              NSE · BSE · MCX Certified
            </span>
            <span
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: 9,
                color: "#333",
                letterSpacing: 1,
              }}
            >
              v2.4.1
            </span>
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          gap: 8,
          marginTop: 20,
        }}
      >
        {["credentials", "totp"].map((s, i) => (
          <div
            key={s}
            style={{
              width: step === s ? 24 : 8,
              height: 4,
              borderRadius: 2,
              background: step === s ? "#c8a96e" : "#2a2a2e",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      {/* Ticker tape */}
      <TickerTape />

      {/* Inline styles for animations */}
      <style>{`
        @keyframes loginSlideUp {
          from { transform: translateY(32px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        .cursor-blink {
          animation: blink 1s step-end infinite;
          margin-left: 2px;
        }
        .ticker-track {
          display: inline-flex;
          white-space: nowrap;
          animation: tickerScroll 28s linear infinite;
        }
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        #login-submit-btn:not(:disabled):hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(200,169,110,0.35) !important;
        }
        #totp-submit-btn:not(:disabled):hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(200,169,110,0.35) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
