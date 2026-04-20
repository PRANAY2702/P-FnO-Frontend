"use client";

import { useEffect, useRef } from "react";

interface LiveChartProps {
  data: { time: string; price: number }[];
  color?: string;
}

export default function LiveChart({ data, color = "var(--green)" }: LiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Resolve CSS variable to actual hex if needed
    const resolvedColor = color.startsWith("var(")
      ? getComputedStyle(document.documentElement)
          .getPropertyValue(color.slice(4, -1).trim())
          .trim() || "#00e676"
      : color;

    function resize() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx!.scale(dpr, dpr);
      draw();
    }

    function draw() {
      if (!canvas || !ctx) return;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      if (data.length < 2) {
        // Awaiting ticks placeholder
        ctx.fillStyle = "rgba(85,85,85,0.08)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#555";
        ctx.font = "11px 'Share Tech Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("AWAITING TICKS...", W / 2, H / 2);
        return;
      }

      const prices = data.map((d) => d.price);
      const minV = Math.min(...prices);
      const maxV = Math.max(...prices);
      const range = maxV - minV || 1;

      const pad = { top: 90, bottom: 32, left: 60, right: 20 };
      const w = W - pad.left - pad.right;
      const h = H - pad.top - pad.bottom;

      const xOf = (i: number) => pad.left + (i / (prices.length - 1)) * w;
      const yOf = (v: number) => pad.top + h - ((v - minV) / range) * h;

      // ── Grid lines ──
      ctx.strokeStyle = "#1e1e22";
      ctx.lineWidth = 1;
      for (let g = 0; g <= 5; g++) {
        const y = pad.top + (g / 5) * h;
        ctx.beginPath();
        ctx.moveTo(pad.left, y);
        ctx.lineTo(W - pad.right, y);
        ctx.stroke();

        // Y-axis labels
        const val = maxV - (g / 5) * range;
        ctx.fillStyle = "#555";
        ctx.font = "9px 'Share Tech Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(0), pad.left - 6, y + 3);
      }

      // ── Gradient fill ──
      const gradient = ctx.createLinearGradient(0, pad.top, 0, H - pad.bottom);
      gradient.addColorStop(0, resolvedColor + "35");
      gradient.addColorStop(0.65, resolvedColor + "10");
      gradient.addColorStop(1, resolvedColor + "00");

      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(prices[0]));
      for (let i = 1; i < prices.length; i++) {
        const x0 = xOf(i - 1),
          y0 = yOf(prices[i - 1]);
        const x1 = xOf(i),
          y1 = yOf(prices[i]);
        const cpx = (x0 + x1) / 2;
        ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
      }
      ctx.lineTo(xOf(prices.length - 1), H - pad.bottom);
      ctx.lineTo(xOf(0), H - pad.bottom);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // ── Line ──
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(prices[0]));
      for (let i = 1; i < prices.length; i++) {
        const x0 = xOf(i - 1),
          y0 = yOf(prices[i - 1]);
        const x1 = xOf(i),
          y1 = yOf(prices[i]);
        const cpx = (x0 + x1) / 2;
        ctx.bezierCurveTo(cpx, y0, cpx, y1, x1, y1);
      }
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = resolvedColor;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // ── Glowing end dot ──
      const lastX = xOf(prices.length - 1);
      const lastY = yOf(prices[prices.length - 1]);

      // Outer glow ring
      const glowGrad = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 12);
      glowGrad.addColorStop(0, resolvedColor + "60");
      glowGrad.addColorStop(1, resolvedColor + "00");
      ctx.beginPath();
      ctx.arc(lastX, lastY, 12, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      // Solid dot
      ctx.beginPath();
      ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
      ctx.fillStyle = resolvedColor;
      ctx.shadowBlur = 16;
      ctx.shadowColor = resolvedColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      // ── X-axis time labels ──
      ctx.fillStyle = "#444";
      ctx.font = "9px 'Share Tech Mono', monospace";
      ctx.textAlign = "center";
      const labelStep = Math.max(1, Math.floor(prices.length / 6));
      for (let i = 0; i < prices.length; i += labelStep) {
        ctx.fillText(data[i].time, xOf(i), H - pad.bottom + 14);
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [data, color]);

  return (
    <canvas
      ref={canvasRef}
      id="live-chart-canvas"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
