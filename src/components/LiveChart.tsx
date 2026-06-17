"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, ColorType, AreaSeries } from "lightweight-charts";
import { Maximize, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";

interface LiveChartProps {
  data: { time: string; timestamp?: number; price: number }[];
  previousClose?: number;
}

const LiveChart = React.memo(function LiveChart({ data, previousClose }: LiveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const baselineRef = useRef<any>(null);
  const lastInitialTimeRef = useRef<number | null>(null);
  const customLinesRef = useRef<any[]>([]);

  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const [lines, setLines] = useState<number[]>([]);
  const linesRef = useRef<number[]>([]);
  const draggingLineIdxRef = useRef<number>(-1);

  // Load persistent lines on mount
  useEffect(() => {
    const saved = localStorage.getItem("p-fno-chart-lines");
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        setLines(parsed);
        linesRef.current = parsed;
      } catch(e) {}
    }
  }, []);

  // Save lines to local storage
  useEffect(() => {
    localStorage.setItem("p-fno-chart-lines", JSON.stringify(lines));
    linesRef.current = lines;
  }, [lines]);

  const toggleDrawMode = () => {
    isDrawingRef.current = !isDrawingRef.current;
    setIsDrawing(isDrawingRef.current);
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const handleResize = () => {
      chartRef.current?.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.4)",
        fontFamily: "'Inter', sans-serif",
      },
      grid: {
        vertLines: { visible: true, color: "rgba(255, 255, 255, 0.03)" },
        horzLines: { visible: true, color: "rgba(255, 255, 255, 0.03)" },
      },
      rightPriceScale: {
        borderVisible: false,
        visible: true, // Re-enable so price is visible
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          return date.toLocaleTimeString("en-IN", { hour12: false, hour: "2-digit", minute: "2-digit" });
        },
      },
      crosshair: {
        vertLine: {
          width: 1,
          color: "rgba(255, 255, 255, 0.4)",
          style: 3, // dashed
          labelBackgroundColor: "#222",
        },
        horzLine: {
          width: 1,
          color: "rgba(255, 255, 255, 0.4)",
          style: 3,
          labelBackgroundColor: "#222",
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#00d09c", // Groww Green
      topColor: "rgba(0, 208, 156, 0.2)",
      bottomColor: "rgba(0, 208, 156, 0.0)",
      lineWidth: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: "#ffffff",
      crosshairMarkerBackgroundColor: "#00d09c",
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });
    seriesRef.current = series;

    window.addEventListener("resize", handleResize);

    const crosshairMoveHandler = (param: any) => {
      if (!param.point || !seriesRef.current) return;
      if (draggingLineIdxRef.current !== -1) {
        const price = seriesRef.current.coordinateToPrice(param.point.y);
        if (price !== null) {
          const lineObj = customLinesRef.current[draggingLineIdxRef.current];
          if (lineObj) {
            lineObj.applyOptions({ price });
          }
        }
      }
    };

    const clickHandler = (param: any) => {
      if (!param.point || !seriesRef.current) return;
      const price = seriesRef.current.coordinateToPrice(param.point.y);
      if (price === null) return;

      // 1. Drawing a new line
      if (isDrawingRef.current) {
        setLines(prev => [...prev, price]);
        isDrawingRef.current = false;
        setIsDrawing(false);
        return;
      }

      // 2. Dropping a dragged line
      if (draggingLineIdxRef.current !== -1) {
        setLines(prev => {
          const copy = [...prev];
          copy[draggingLineIdxRef.current] = price;
          return copy;
        });
        draggingLineIdxRef.current = -1;
        return;
      }

      // 3. Picking up a line
      let bestIdx = -1;
      let minDiff = 15; // pixels
      linesRef.current.forEach((lPrice, idx) => {
        const lY = seriesRef.current.priceToCoordinate(lPrice);
        if (lY !== null) {
          const diff = Math.abs(lY - param.point.y);
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = idx;
          }
        }
      });

      if (bestIdx !== -1) {
        draggingLineIdxRef.current = bestIdx;
      }
    };

    chart.subscribeCrosshairMove(crosshairMoveHandler);
    chart.subscribeClick(clickHandler);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.unsubscribeCrosshairMove(crosshairMoveHandler);
      chart.unsubscribeClick(clickHandler);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    // Lightweight charts needs time in seconds (Unix timestamp)
    const formattedData = data.map((d, i) => {
      // Add 15 minutes (900 seconds) to compensate for Yahoo Finance 15-min delay
      let timeVal = d.timestamp ? Math.floor(d.timestamp / 1000) + 15 * 60 : i;
      return { time: timeVal as any, value: d.price };
    });

    // Remove duplicates
    const uniqueData = [];
    let lastTime = 0;
    for (const d of formattedData) {
      if (d.time > lastTime) {
        uniqueData.push(d);
        lastTime = d.time;
      }
    }

    const lastPrice = uniqueData.length > 0 ? uniqueData[uniqueData.length - 1].value : 0;
    
    // Update color based on trend (Groww specific colors)
    let lineColor = "#00d09c";
    let topColor = "rgba(0, 208, 156, 0.2)";
    let bottomColor = "rgba(0, 208, 156, 0.0)";

    if (previousClose && lastPrice < previousClose) {
      lineColor = "#eb5b3c"; // Groww Red
      topColor = "rgba(235, 91, 60, 0.2)";
      bottomColor = "rgba(235, 91, 60, 0.0)";
    }

    seriesRef.current.applyOptions({
      lineColor,
      topColor,
      bottomColor,
      crosshairMarkerBackgroundColor: lineColor,
    });

    seriesRef.current.setData(uniqueData);

    // Add baseline
    if (previousClose && !baselineRef.current) {
      baselineRef.current = seriesRef.current.createPriceLine({
        price: previousClose,
        color: "rgba(255, 255, 255, 0.3)",
        lineWidth: 1,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: "PREV CLOSE",
      });
    } else if (previousClose && baselineRef.current) {
      baselineRef.current.applyOptions({
        price: previousClose,
      });
    }

    // Sync custom lines
    if (seriesRef.current) {
      customLinesRef.current.forEach(l => {
        try { seriesRef.current.removePriceLine(l); } catch(e) {}
      });
      customLinesRef.current = [];
      lines.forEach(price => {
        const line = seriesRef.current.createPriceLine({
          price: price,
          color: "rgba(255, 255, 255, 0.8)",
          lineWidth: 1,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: "MARK",
        });
        customLinesRef.current.push(line);
      });
    }

    // Only fit content on initial load or if the start timeframe changes, so we don't break user zoom/pan
    if (uniqueData.length > 0 && uniqueData[0].time !== lastInitialTimeRef.current) {
      chartRef.current.timeScale().fitContent();
      lastInitialTimeRef.current = uniqueData[0].time;
    }
  }, [data, previousClose]);

  return (
    <>
      <div
        ref={chartContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
      />
      {/* Active Lines Panel */}
      {lines.length > 0 && (
        <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10, background: "rgba(20, 20, 24, 0.8)", backdropFilter: "blur(4px)", border: "1px solid var(--panel-border)", borderRadius: 6, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'Share Tech Mono', monospace", letterSpacing: 1 }}>SAVED MARKERS (CLICK TO DRAG)</div>
          {lines.map((price, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "'Share Tech Mono', monospace" }}>
              <span style={{ color: "#fff", width: 64 }}>{price.toFixed(1)}</span>
              <button onClick={() => setLines(p => p.filter((_, i) => i !== idx))} style={{ background: "transparent", border: "none", color: "var(--put-red)", cursor: "pointer", padding: 2, marginLeft: 4 }} title="Delete Line"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Floating Toolbar */}
      <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 10, display: "flex", gap: 8 }}>
        <button
          onClick={toggleDrawMode}
          title="Draw Horizontal Line"
          style={{
            background: isDrawing ? "var(--accent)" : "rgba(20, 20, 24, 0.8)",
            color: isDrawing ? "#000" : "var(--text-muted)",
            border: "1px solid var(--panel-border)",
            borderRadius: 6,
            padding: 8,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
            transition: "all 0.2s"
          }}
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => chartRef.current?.timeScale().fitContent()}
          title="Reset Zoom / Fit All"
          style={{
            background: "rgba(20, 20, 24, 0.8)",
            color: "var(--text-muted)",
            border: "1px solid var(--panel-border)",
            borderRadius: 6,
            padding: 8,
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            backdropFilter: "blur(4px)",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <Maximize size={16} />
        </button>
      </div>
    </>
  );
});

export default LiveChart;
