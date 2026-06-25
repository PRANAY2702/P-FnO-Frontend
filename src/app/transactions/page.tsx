"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, History, Wallet } from "lucide-react";

export default function TransactionsPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading } = useAuth();
  
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!token) return;
    const fetchWallet = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== "undefined" ? `http://${window.location.hostname}:3001` : "http://localhost:3001");
        const res = await fetch(`${backendUrl}/api/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setBalance(data.balance);
          setTransactions(data.transactions);
        }
      } catch (err) {
        console.error("Failed to fetch wallet data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, [token]);

  if (isLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#060606", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#c8a96e", fontFamily: "'Share Tech Mono', monospace", letterSpacing: 2, fontSize: 14 }}>LOADING LEDGER...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#060606", color: "var(--text-primary)", display: "flex", flexDirection: "column", fontFamily: "'Rajdhani', sans-serif" }}>
      {/* ─── NAVBAR ────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(10, 10, 12, 0.9)",
          borderBottom: "1px solid var(--panel-border)",
          padding: "16px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button 
            onClick={() => router.push('/')}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
            }}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Logo box */}
            <div
              style={{
                width: 30,
                height: 30,
                background: "linear-gradient(135deg, #c8a96e, #8b6914)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#000",
              }}
            >
              <History size={16} strokeWidth={2.5} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1, margin: 0, color: "var(--text-primary)" }}>
              TRANSACTION LEDGER
            </h1>
          </div>
        </div>
        
        {/* Balance Display */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "6px 14px",
          background: "#0f0f10",
          border: "1px solid var(--panel-border)",
          borderRadius: 6
        }}>
          <Wallet size={14} color="var(--text-muted)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
            Available Balance:
          </span>
          <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            ₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </nav>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "32px 28px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <div style={{
          background: "#0a0a0c",
          border: "1px solid var(--panel-border)",
          borderRadius: 8,
          overflow: "hidden"
        }}>
          
          {/* Table Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 16,
            padding: "16px 24px",
            borderBottom: "1px solid var(--panel-border)",
            background: "#0f0f10",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            letterSpacing: 1.5,
            textTransform: "uppercase"
          }}>
            <div>Date & Time</div>
            <div>Transaction Type</div>
            <div>Reference / Order ID</div>
            <div style={{ textAlign: "right" }}>Amount</div>
          </div>

          {/* Table Body */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {transactions.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", color: "var(--text-muted)" }}>
                <History size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
                <div style={{ fontSize: 14, letterSpacing: 1 }}>NO TRANSACTIONS FOUND</div>
              </div>
            ) : (
              transactions.map((tx: any) => {
                const isPositive = tx.type === 'DEPOSIT' || tx.type === 'TRADE_SELL';
                const colorHex = isPositive ? "var(--green)" : "var(--red)";
                const sign = isPositive ? "+" : "-";

                return (
                  <div key={tx.id} style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: 16,
                    padding: "16px 24px",
                    borderBottom: "1px solid var(--panel-border)",
                    alignItems: "center"
                  }}>
                    
                    {/* Date */}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", letterSpacing: 0.5 }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                        {new Date(tx.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </div>

                    {/* Type */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 14,
                        background: isPositive ? "rgba(0, 230, 118, 0.1)" : "rgba(255, 59, 48, 0.1)",
                        color: colorHex,
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        {isPositive ? <ArrowDownCircle size={14} /> : <ArrowUpCircle size={14} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", letterSpacing: 0.5, textTransform: "capitalize" }}>
                          {tx.type.replace('_', ' ').toLowerCase()}
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: tx.status === 'COMPLETED' ? "var(--green)" : "#c8a96e", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>
                          {tx.status}
                        </div>
                      </div>
                    </div>

                    {/* Reference */}
                    <div>
                      <span style={{
                        fontFamily: "'Share Tech Mono', monospace",
                        fontSize: 11,
                        color: "var(--text-muted)",
                        background: "#060606",
                        border: "1px solid var(--panel-border)",
                        padding: "2px 6px",
                        borderRadius: 4
                      }}>
                        {tx.razorpayOrderId || tx.id.split('-')[0] || 'N/A'}
                      </span>
                    </div>

                    {/* Amount */}
                    <div style={{ textAlign: "right", fontFamily: "'Share Tech Mono', monospace", fontSize: 16, fontWeight: 700, color: colorHex }}>
                      {sign}₹{tx.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
