"use client";

import React, { useEffect, useRef } from "react";

interface LiveChartProps {
  data: { time: string; timestamp?: number; price: number }[];
  previousClose?: number;
}

const LiveChart = React.memo(function LiveChart({ data, previousClose }: LiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
        ctx.fillStyle = "rgba(85,85,85,0.08)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#555";
        ctx.font = "11px 'Share Tech Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("AWAITING TICKS...", W / 2, H / 2);
        return;
      }

      const prices = data.map((d) => d.price);
      const timestamps = data.map((d, i) => d.timestamp ?? i);
      let minV = Math.min(...prices);
      let maxV = Math.max(...prices);
      if (maxV === minV) {
        minV -= 10;
        maxV += 10;
      } else {
        const p = (maxV - minV) * 0.1;
        minV -= p;
        maxV += p;
      }
      const range = maxV - minV;

      let minT = Math.min(...timestamps);
      let maxT = Math.max(...timestamps);
      
      const span = maxT - minT;
      if (span > 0 && span <= 24 * 60 * 60 * 1000) {
        const d = new Date(timestamps[timestamps.length - 1]);
        const openT = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 15, 0).getTime();
        const closeT = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 15, 30, 0).getTime();
        minT = Math.min(minT, openT);
        maxT = Math.max(maxT, closeT);
      }
      const timeRange = maxT - minT || 1;

      const pad = { top: 90, bottom: 10, left: 0, right: 0 };
      const w = W - pad.left - pad.right;
      const h = H - pad.top - pad.bottom;

      const xOf = (i: number) => pad.left + ((timestamps[i] - minT) / timeRange) * w;
      const yOf = (v: number) => pad.top + h - ((v - minV) / range) * h;

      // Determine dynamic color
      let baseColorStr = "var(--green)";
      const lastPrice = prices[prices.length - 1];
      if (previousClose && lastPrice < previousClose) {
        baseColorStr = "var(--red)";
      }

      const resolvedColor = baseColorStr.startsWith("var(")
        ? getComputedStyle(document.documentElement)
            .getPropertyValue(baseColorStr.slice(4, -1).trim())
            .trim() || "#00e676"
        : baseColorStr;

      // ── Previous Close Line ──
      if (previousClose) {
        const py = yOf(previousClose);
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([3, 3]); // Dotted line
        ctx.moveTo(pad.left, py);
        ctx.lineTo(W - pad.right, py);
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      // ── Line ──
      ctx.beginPath();
      ctx.moveTo(xOf(0), yOf(prices[0]));
      for (let i = 1; i < prices.length; i++) {
        ctx.lineTo(xOf(i), yOf(prices[i]));
      }
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // ── End dot ──
      const lastX = xOf(prices.length - 1);
      const lastY = yOf(prices[prices.length - 1]);

      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = resolvedColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [data, previousClose]);

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
});

export default LiveChart;
