"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { getApiBaseUrl } = useAuth();
  
  const [step, setStep] = useState<"request" | "verify" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setError("Please enter your email");
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccess("OTP sent to your email!");
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Failed to request OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword) return setError("Please enter OTP and new password");
    
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setSuccess("Password reset successfully! Redirecting...");
      setStep("reset");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    background: "#0f0f12",
    border: "1px solid #2a2a2e",
    borderRadius: 6,
    padding: "12px 16px",
    color: "#f0f0f0",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 14,
    marginBottom: 16,
    outline: "none"
  };

  const btnStyle = {
    width: "100%",
    padding: "13px",
    background: "linear-gradient(135deg, #c8a96e, #a0842a)",
    border: "none",
    borderRadius: 7,
    color: "#000",
    fontFamily: "'Space Mono', monospace",
    fontWeight: 700 as const,
    cursor: "pointer",
    marginTop: 8
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080808", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 400, background: "#0f0f10", padding: 30, borderRadius: 12, border: "1px solid #222" }}>
        <h2 style={{ color: "#f0f0f0", fontFamily: "'Rajdhani', sans-serif", marginBottom: 20 }}>
          {step === "request" ? "Reset Password" : "Enter OTP"}
        </h2>
        
        {error && <div style={{ color: "#ff1744", fontSize: 12, marginBottom: 16, fontFamily: "monospace" }}>{error}</div>}
        {success && <div style={{ color: "#00e676", fontSize: 12, marginBottom: 16, fontFamily: "monospace" }}>{success}</div>}

        {step === "request" && (
          <form onSubmit={handleRequestOtp}>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerifyReset}>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={() => router.push("/login")} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", textDecoration: "underline" }}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
