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

      for (let x = offset % spacing; x < canvas.width; x += spacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = offset % spacing; y < canvas.height; y += spacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      const grad = ctx.createLinearGradient(0, canvas.height, canvas.width, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.4 + 0.1 * Math.sin(offset * 0.01), "rgba(200,169,110,0.025)");
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
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
    />
  );
}

// ─── Ticker tape ──────────────────────────────────────────────────────────────
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
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: 32,
      background: "#0a0a0b", borderTop: "1px solid #1e1e22",
      overflow: "hidden", display: "flex", alignItems: "center",
    }}>
      <div className="ticker-track">
        {items.map((item, i) => {
          const isNeg = item.chg.startsWith("-");
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "0 28px" }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#c8a96e", textTransform: "uppercase" }}>{item.label}</span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#f0f0f0" }}>{item.val}</span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: isNeg ? "#ff1744" : "#00e676" }}>{item.chg}</span>
              <span style={{ color: "#2a2a2e", fontSize: 10, marginLeft: 4 }}>|</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = "account" | "profile" | "security" | "done";

interface FormData {
  // Account
  userId: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Profile
  fullName: string;
  phone: string;
  panCard: string;
  broker: string;
  // Security
  mpin: string;
  confirmMpin: string;
  totpSecret: string;
  agreedTerms: boolean;
}

const STEPS: Step[] = ["account", "profile", "security", "done"];
const STEP_LABELS = ["Account", "Profile", "Security", "Complete"];

const BROKERS = [
  "Kotak Neo", "Zerodha", "ICICI Direct", "HDFC Securities",
  "Angel Broking", "Upstox", "5Paisa", "Groww", "Other",
];

// ─── Password strength ────────────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak", color: "#ff1744" };
  if (score <= 3) return { score, label: "Moderate", color: "#ffa726" };
  return { score, label: "Strong", color: "#00e676" };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData & { general: string }>>({});
  const [focused, setFocused] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const [form, setForm] = useState<FormData>({
    userId: "", email: "", password: "", confirmPassword: "",
    fullName: "", phone: "", panCard: "", broker: "",
    mpin: "", confirmMpin: "", totpSecret: "", agreedTerms: false,
  });

  useEffect(() => { setMounted(true); }, []);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((err) => ({ ...err, [key]: undefined }));
  };

  const goStep = (next: Step) => {
    setAnimKey((k) => k + 1);
    setStep(next);
  };

  // ── Validate step 1 ──
  const validateAccount = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.userId || form.userId.length < 4) e.userId = "Min 4 characters";
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email required";
    if (!form.password || form.password.length < 8) e.password = "Min 8 characters";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Validate step 2 ──
  const validateProfile = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.fullName || form.fullName.trim().length < 3) e.fullName = "Full name required";
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) e.phone = "Valid 10-digit mobile number";
    if (!form.panCard || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.panCard.toUpperCase())) e.panCard = "Valid PAN format (e.g. ABCDE1234F)";
    if (!form.broker) e.broker = "Select your broker";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Validate step 3 ──
  const validateSecurity = (): boolean => {
    const e: Partial<FormData & { general: string }> = {};
    if (!form.mpin || form.mpin.length !== 6 || !/^\d+$/.test(form.mpin)) e.mpin = "6-digit numeric MPIN required";
    if (form.mpin !== form.confirmMpin) e.confirmMpin = "MPINs do not match";
    if (!form.agreedTerms) e.general = "You must accept the terms to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === "account") { if (validateAccount()) goStep("profile"); }
    else if (step === "profile") { if (validateProfile()) goStep("security"); }
    else if (step === "security") {
      if (validateSecurity()) {
        setLoading(true);
        setTimeout(() => { setLoading(false); goStep("done"); }, 1400);
      }
    }
  };

  const handleBack = () => {
    if (step === "profile") goStep("account");
    else if (step === "security") goStep("profile");
  };

  // ── Input style ──
  const inp = (name: string, hasError?: boolean): React.CSSProperties => ({
    width: "100%",
    background: focused === name ? "#141418" : "#0f0f12",
    border: `1px solid ${hasError ? "rgba(255,23,68,0.5)" : focused === name ? "#c8a96e60" : "#2a2a2e"}`,
    borderRadius: 6,
    padding: "11px 14px",
    color: "#f0f0f0",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 13,
    letterSpacing: 0.5,
    outline: "none",
    transition: "all 0.2s",
    boxShadow: hasError ? "0 0 0 2px rgba(255,23,68,0.08)" : focused === name ? "0 0 0 2px rgba(200,169,110,0.08)" : "none",
  });

  const label = (text: string): React.CSSProperties => ({
    display: "block",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#555",
    textTransform: "uppercase",
    marginBottom: 5,
  });

  const errMsg = (key: keyof (FormData & { general: string })) =>
    errors[key] ? (
      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#ff1744", marginTop: 4, letterSpacing: 0.5 }}>
        ⚠ {errors[key]}
      </div>
    ) : null;

  const pwStrength = getPasswordStrength(form.password);
  const stepIndex = STEPS.indexOf(step);

  return (
    <div style={{
      position: "relative", minHeight: "100vh", width: "100%",
      background: "#080808", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      overflow: "hidden", padding: "40px 16px 60px",
      opacity: mounted ? 1 : 0, transition: "opacity 0.5s ease",
    }}>
      <GridCanvas />

      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", width: 700, height: 700,
        background: "radial-gradient(ellipse, rgba(200,169,110,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ─── Card ─────────────────────────────────────── */}
      <div id="register-card" style={{
        position: "relative", zIndex: 10, width: "100%", maxWidth: 480,
        background: "rgba(15,15,16,0.93)", border: "1px solid #222226",
        borderRadius: 14, backdropFilter: "blur(24px)",
        boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(200,169,110,0.06), inset 0 1px 0 rgba(200,169,110,0.06)",
        overflow: "hidden", animation: "loginSlideUp 0.6s cubic-bezier(0.4,0,0.2,1) both",
      }}>
        {/* Gold top bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, transparent, #c8a96e, transparent)" }} />

        <div style={{ padding: "28px 36px 36px" }}>

          {/* Logo + header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{
              width: 38, height: 38,
              background: "linear-gradient(135deg, #c8a96e, #8b6914)",
              borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: "#000",
              boxShadow: "0 0 18px rgba(200,169,110,0.28)", flexShrink: 0,
            }}>P</div>
            <div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: "#f0f0f0", letterSpacing: 1, lineHeight: 1.2 }}>
                P<span style={{ color: "#c8a96e" }}>-FnO</span>
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#555", letterSpacing: 3, textTransform: "uppercase" }}>
                Futures &amp; Options
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>
                Step {stepIndex + 1} of {STEPS.length - 1}
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#c8a96e", letterSpacing: 1, marginTop: 2 }}>
                {STEP_LABELS[stepIndex]}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {step !== "done" && (
            <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
              {STEPS.slice(0, 3).map((s, i) => (
                <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, overflow: "hidden", background: "#1a1a1e" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    background: i < stepIndex ? "#c8a96e" : i === stepIndex ? "linear-gradient(90deg, #c8a96e, #e8c98e)" : "transparent",
                    width: i <= stepIndex ? "100%" : "0%",
                    transition: "width 0.4s ease",
                  }} />
                </div>
              ))}
            </div>
          )}

          {/* Step heading */}
          {step !== "done" && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: 3, color: "#c8a96e", textTransform: "uppercase", marginBottom: 3 }}>
                {step === "account" ? "Create Account" : step === "profile" ? "Trader Profile" : "Security Setup"}
              </div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 600, color: "#f0f0f0" }}>
                {step === "account" ? "Set up your credentials" : step === "profile" ? "Tell us about yourself" : "Secure your account"}
              </div>
            </div>
          )}

          {/* Global error */}
          {errors.general && (
            <div style={{
              background: "rgba(255,23,68,0.08)", border: "1px solid rgba(255,23,68,0.25)",
              borderRadius: 6, padding: "8px 14px", marginBottom: 16,
              fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#ff1744",
              letterSpacing: 0.5, animation: "fadeIn 0.2s ease",
            }}>
              ⚠ {errors.general}
            </div>
          )}

          {/* ══ STEP 1 — ACCOUNT ══════════════════════════════════════════════════ */}
          {step === "account" && (
            <div key={`step-${animKey}`} style={{ animation: "fadeInStep 0.35s ease both" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* User ID */}
                <div>
                  <label style={label("User ID")}>User ID</label>
                  <input id="reg-userid" type="text" value={form.userId} onChange={set("userId")}
                    onFocus={() => setFocused("userId")} onBlur={() => setFocused(null)}
                    placeholder="Choose a unique user ID" autoComplete="username"
                    style={inp("userId", !!errors.userId)} />
                  {errMsg("userId")}
                </div>

                {/* Email */}
                <div>
                  <label style={label("Email Address")}>Email Address</label>
                  <input id="reg-email" type="email" value={form.email} onChange={set("email")}
                    onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                    placeholder="you@example.com" autoComplete="email"
                    style={inp("email", !!errors.email)} />
                  {errMsg("email")}
                </div>

                {/* Password */}
                <div>
                  <label style={label("Password")}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input id="reg-password" type={showPass ? "text" : "password"} value={form.password} onChange={set("password")}
                      onFocus={() => setFocused("password")} onBlur={() => setFocused(null)}
                      placeholder="Min 8 characters" autoComplete="new-password"
                      style={{ ...inp("password", !!errors.password), paddingRight: 42 }} />
                    <button type="button" onClick={() => setShowPass(v => !v)} aria-label="Toggle password"
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 13, padding: 4, lineHeight: 1 }}>
                      {showPass ? "◉" : "○"}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {form.password && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, display: "flex", gap: 3 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} style={{
                            flex: 1, height: 3, borderRadius: 2,
                            background: n <= pwStrength.score ? pwStrength.color : "#1a1a1e",
                            transition: "background 0.3s",
                          }} />
                        ))}
                      </div>
                      <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: pwStrength.color, letterSpacing: 1 }}>
                        {pwStrength.label}
                      </span>
                    </div>
                  )}
                  {errMsg("password")}
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={label("Confirm Password")}>Confirm Password</label>
                  <div style={{ position: "relative" }}>
                    <input id="reg-confirm-password" type={showConfirmPass ? "text" : "password"} value={form.confirmPassword} onChange={set("confirmPassword")}
                      onFocus={() => setFocused("confirmPassword")} onBlur={() => setFocused(null)}
                      placeholder="Re-enter your password" autoComplete="new-password"
                      style={{ ...inp("confirmPassword", !!errors.confirmPassword), paddingRight: 42 }} />
                    <button type="button" onClick={() => setShowConfirmPass(v => !v)} aria-label="Toggle confirm password"
                      style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 13, padding: 4, lineHeight: 1 }}>
                      {showConfirmPass ? "◉" : "○"}
                    </button>
                  </div>
                  {errMsg("confirmPassword")}
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 2 — PROFILE ══════════════════════════════════════════════════ */}
          {step === "profile" && (
            <div key={`step-${animKey}`} style={{ animation: "fadeInStep 0.35s ease both" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Full Name */}
                <div>
                  <label style={label("Full Name")}>Full Name</label>
                  <input id="reg-fullname" type="text" value={form.fullName} onChange={set("fullName")}
                    onFocus={() => setFocused("fullName")} onBlur={() => setFocused(null)}
                    placeholder="As per PAN card" autoComplete="name"
                    style={inp("fullName", !!errors.fullName)} />
                  {errMsg("fullName")}
                </div>

                {/* Phone */}
                <div>
                  <label style={label("Mobile Number")}>Mobile Number</label>
                  <div style={{ position: "relative" }}>
                    <div style={{
                      position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                      fontFamily: "'Share Tech Mono', monospace", fontSize: 13, color: "#555",
                    }}>+91</div>
                    <input id="reg-phone" type="tel" value={form.phone} onChange={(e) => { set("phone")(e); }} inputMode="numeric"
                      onFocus={() => setFocused("phone")} onBlur={() => setFocused(null)}
                      placeholder="10-digit mobile" maxLength={10}
                      style={{ ...inp("phone", !!errors.phone), paddingLeft: 44 }} />
                  </div>
                  {errMsg("phone")}
                </div>

                {/* PAN Card */}
                <div>
                  <label style={label("PAN Card")}>PAN Card Number</label>
                  <input id="reg-pan" type="text" value={form.panCard.toUpperCase()} onChange={(e) => setForm(f => ({ ...f, panCard: e.target.value.toUpperCase() }))}
                    onFocus={() => setFocused("panCard")} onBlur={() => setFocused(null)}
                    placeholder="ABCDE1234F" maxLength={10}
                    style={{ ...inp("panCard", !!errors.panCard), letterSpacing: 4 }} />
                  {errMsg("panCard")}
                </div>

                {/* Broker */}
                <div>
                  <label style={label("Preferred Broker")}>Preferred Broker</label>
                  <select id="reg-broker" value={form.broker}
                    onChange={(e) => { setForm(f => ({ ...f, broker: e.target.value })); setErrors(err => ({ ...err, broker: undefined })); }}
                    style={{
                      ...inp("broker", !!errors.broker),
                      appearance: "none",
                      cursor: "pointer",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23555' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 14px center",
                    }}>
                    <option value="" disabled>Select broker</option>
                    {BROKERS.map(b => <option key={b} value={b} style={{ background: "#0f0f12", color: "#f0f0f0" }}>{b}</option>)}
                  </select>
                  {errMsg("broker")}
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 3 — SECURITY ═════════════════════════════════════════════════ */}
          {step === "security" && (
            <div key={`step-${animKey}`} style={{ animation: "fadeInStep 0.35s ease both" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* MPIN */}
                <div>
                  <label style={label("Trading MPIN")}>Trading MPIN (6-digit)</label>
                  <input id="reg-mpin" type="password" value={form.mpin} onChange={(e) => setForm(f => ({ ...f, mpin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    onFocus={() => setFocused("mpin")} onBlur={() => setFocused(null)}
                    placeholder="••••••" inputMode="numeric" maxLength={6}
                    style={{ ...inp("mpin", !!errors.mpin), textAlign: "center", fontSize: 22, letterSpacing: 10 }} />
                  {errMsg("mpin")}
                </div>

                {/* Confirm MPIN */}
                <div>
                  <label style={label("Confirm MPIN")}>Confirm MPIN</label>
                  <input id="reg-confirm-mpin" type="password" value={form.confirmMpin} onChange={(e) => setForm(f => ({ ...f, confirmMpin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                    onFocus={() => setFocused("confirmMpin")} onBlur={() => setFocused(null)}
                    placeholder="••••••" inputMode="numeric" maxLength={6}
                    style={{ ...inp("confirmMpin", !!errors.confirmMpin), textAlign: "center", fontSize: 22, letterSpacing: 10 }} />
                  {errMsg("confirmMpin")}
                </div>

                {/* TOTP hint */}
                <div style={{
                  background: "rgba(200,169,110,0.05)", border: "1px solid rgba(200,169,110,0.15)",
                  borderRadius: 6, padding: "12px 14px",
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#c8a96e", textTransform: "uppercase", marginBottom: 6 }}>
                    Two-Factor Authentication
                  </div>
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#888", lineHeight: 1.7 }}>
                    A TOTP authenticator app (Google Authenticator, Authy) will be linked after account creation.
                    Your QR code will be shown on first login.
                  </div>
                </div>

                {/* Terms */}
                <label id="terms-label" style={{
                  display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                  padding: "12px 14px",
                  background: errors.general ? "rgba(255,23,68,0.04)" : "transparent",
                  border: `1px solid ${errors.general ? "rgba(255,23,68,0.2)" : "#1a1a1e"}`,
                  borderRadius: 6, transition: "all 0.2s",
                }}>
                  <div style={{ position: "relative", flexShrink: 0, marginTop: 1 }}>
                    <input type="checkbox" id="reg-terms" checked={form.agreedTerms}
                      onChange={(e) => { setForm(f => ({ ...f, agreedTerms: e.target.checked })); setErrors(err => ({ ...err, general: undefined })); }}
                      style={{ opacity: 0, position: "absolute", width: 0, height: 0 }} />
                    <div style={{
                      width: 16, height: 16, borderRadius: 4,
                      border: `1px solid ${form.agreedTerms ? "#c8a96e" : "#333"}`,
                      background: form.agreedTerms ? "rgba(200,169,110,0.15)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.2s",
                    }}>
                      {form.agreedTerms && <span style={{ color: "#c8a96e", fontSize: 11, lineHeight: 1 }}>✓</span>}
                    </div>
                  </div>
                  <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: "#666", lineHeight: 1.7, letterSpacing: 0.3 }}>
                    I agree to the <span style={{ color: "#c8a96e", textDecoration: "underline" }}>Terms of Service</span> and{" "}
                    <span style={{ color: "#c8a96e", textDecoration: "underline" }}>Privacy Policy</span>.
                    I confirm I am a SEBI-registered trader.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* ══ DONE ══════════════════════════════════════════════════════════════ */}
          {step === "done" && (
            <div key="done" style={{ animation: "fadeInStep 0.5s ease both", textAlign: "center", padding: "12px 0 8px" }}>
              {/* Success icon */}
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(0,230,118,0.12), rgba(0,230,118,0.04))",
                border: "1px solid rgba(0,230,118,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 0 30px rgba(0,230,118,0.12)",
                animation: "pulseSuccess 2s ease infinite",
              }}>
                <span style={{ fontSize: 32, lineHeight: 1 }}>✓</span>
              </div>

              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 3, color: "#00e676", textTransform: "uppercase", marginBottom: 8 }}>
                Account Created
              </div>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 600, color: "#f0f0f0", marginBottom: 12 }}>
                Welcome, {form.fullName.split(" ")[0] || form.userId}!
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#555", lineHeight: 1.8, marginBottom: 28 }}>
                Your P-FnO account is ready.<br />
                Complete your broker setup on first login.
              </div>

              {/* Details summary */}
              <div style={{ background: "#050507", border: "1px solid #1a1a1e", borderRadius: 8, padding: "14px 16px", textAlign: "left", marginBottom: 24 }}>
                {[
                  { k: "User ID", v: form.userId },
                  { k: "Email", v: form.email },
                  { k: "Broker", v: form.broker },
                  { k: "MPIN", v: "••••••" },
                ].map(({ k, v }) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#555", textTransform: "uppercase" }}>{k}</span>
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "#c8a96e" }}>{v}</span>
                  </div>
                ))}
              </div>

              <button id="goto-login-btn" onClick={() => router.push("/login")} style={{
                width: "100%", padding: "13px",
                background: "linear-gradient(135deg, #c8a96e, #a0842a)",
                border: "none", borderRadius: 7, color: "#000",
                fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                letterSpacing: 2, cursor: "pointer", textTransform: "uppercase",
                boxShadow: "0 4px 24px rgba(200,169,110,0.25)",
                transition: "all 0.2s",
              }}>
                Sign In to Platform
              </button>
            </div>
          )}

          {/* ── Navigation buttons ── */}
          {step !== "done" && (
            <div style={{ marginTop: 22 }}>
              <div style={{ display: "flex", gap: 10 }}>
                {step !== "account" && (
                  <button id="reg-back-btn" onClick={handleBack} disabled={loading} style={{
                    flex: "0 0 auto", padding: "12px 20px",
                    background: "transparent", border: "1px solid #2a2a2e",
                    borderRadius: 7, color: "#555",
                    fontFamily: "'Share Tech Mono', monospace", fontSize: 11,
                    letterSpacing: 1, cursor: "pointer", transition: "all 0.2s",
                  }}>
                    ← Back
                  </button>
                )}
                <button id="reg-next-btn" onClick={handleNext} disabled={loading} style={{
                  flex: 1, padding: "13px",
                  background: loading ? "rgba(200,169,110,0.15)" : "linear-gradient(135deg, #c8a96e, #a0842a)",
                  border: "none", borderRadius: 7,
                  color: loading ? "#c8a96e" : "#000",
                  fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
                  letterSpacing: 2, cursor: loading ? "not-allowed" : "pointer",
                  textTransform: "uppercase", transition: "all 0.2s",
                  boxShadow: loading ? "none" : "0 4px 24px rgba(200,169,110,0.25)",
                }}>
                  {loading ? "Creating Account..." : step === "security" ? "Create Account" : "Continue →"}
                </button>
              </div>

              {/* ── Divider ── */}
              {step === "account" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0 10px" }}>
                    <div style={{ flex: 1, height: 1, background: "#1e1e22" }} />
                    <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#333", letterSpacing: 2, textTransform: "uppercase" }}>or</span>
                    <div style={{ flex: 1, height: 1, background: "#1e1e22" }} />
                  </div>

                  {/* ── Google Sign-Up ── */}
                  <button
                    id="google-register-btn"
                    type="button"
                    onClick={() => { window.location.href = "http://localhost:3001/api/auth/google"; }}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "#0f0f12",
                      border: "1px solid #2a2a2e",
                      borderRadius: 7,
                      color: "#d0d0d0",
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: 12,
                      letterSpacing: 1,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#3a3a3e";
                      (e.currentTarget as HTMLButtonElement).style.background = "#141418";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2e";
                      (e.currentTarget as HTMLButtonElement).style.background = "#0f0f12";
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      <path fill="none" d="M0 0h48v48H0z"/>
                    </svg>
                    Sign up with Google
                  </button>
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{
            marginTop: 24, paddingTop: 18, borderTop: "1px solid #1a1a1e",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: "#333", letterSpacing: 1, textTransform: "uppercase" }}>
              NSE · BSE · MCX Certified
            </span>
            <button onClick={() => router.push("/login")} style={{
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "'Share Tech Mono', monospace", fontSize: 9,
              color: "#c8a96e", letterSpacing: 1, opacity: 0.8, textDecoration: "underline",
            }}>
              Already have an account?
            </button>
          </div>
        </div>
      </div>

      {/* Step pills */}
      {step !== "done" && (
        <div style={{ position: "relative", zIndex: 10, display: "flex", gap: 6, marginTop: 16 }}>
          {STEPS.slice(0, 3).map((s, i) => (
            <div key={s} style={{
              width: step === s ? 24 : 8, height: 4, borderRadius: 2,
              background: i < stepIndex ? "#c8a96e80" : step === s ? "#c8a96e" : "#2a2a2e",
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>
      )}

      <TickerTape />

      <style>{`
        @keyframes loginSlideUp {
          from { transform: translateY(32px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes fadeInStep {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes pulseSuccess {
          0%, 100% { box-shadow: 0 0 30px rgba(0,230,118,0.12); }
          50%       { box-shadow: 0 0 50px rgba(0,230,118,0.22); }
        }
        .ticker-track {
          display: inline-flex; white-space: nowrap;
          animation: tickerScroll 28s linear infinite;
        }
        #reg-next-btn:not(:disabled):hover {
          filter: brightness(1.1); transform: translateY(-1px);
          box-shadow: 0 6px 28px rgba(200,169,110,0.35) !important;
        }
        #reg-back-btn:hover { border-color: #444 !important; color: #888 !important; }
        #goto-login-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
