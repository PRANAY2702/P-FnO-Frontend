import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#0d0d0f',
    borderColor: '#2a2a2e',
    color: '#f0f0f0',
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    borderRadius: 4,
  },
  itemStyle: { color: '#f0f0f0', fontWeight: 700 },
  labelStyle: { color: '#888' }
};

const axisProps = {
  stroke: '#2a2a2e',
  tick: { fill: '#555', fontSize: 9, fontFamily: "'Share Tech Mono', monospace" },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <div style={{ width: 2, height: 12, background: '#c8a96e', borderRadius: 1 }} />
      <span style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 9,
        letterSpacing: 2,
        color: '#c8a96e',
        textTransform: 'uppercase' as const,
      }}>
        {children}
      </span>
    </div>
  );
}

export default function RiskCharts({ chain, spotPrice }: { chain: any[], spotPrice: number }) {
  const data = chain.map((row) => ({
    strike: row.strike,
    callDelta: row.call.delta,
    putDelta: row.put.delta,
    callGamma: row.call.gamma,
    putGamma: row.put.gamma,
  }));

  return (
    <div className="h-full w-full flex flex-col gap-6" style={{ minHeight: 400 }}>
      <div style={{ flex: 1, minHeight: 180 }}>
        <SectionTitle>Delta Surface — Strikes</SectionTitle>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
            <XAxis dataKey="strike" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 9, fontFamily: "'Share Tech Mono', monospace", color: '#888' }} />
            <ReferenceLine
              x={spotPrice}
              stroke="var(--green)"
              strokeDasharray="3 3"
              label={{ position: 'top', value: 'SPOT', fill: 'var(--green)', fontSize: 9 }}
            />
            <Line type="monotone" dataKey="callDelta" name="Call Δ" stroke="#00e676" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="putDelta"  name="Put Δ"  stroke="#ff1744" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ flex: 1, minHeight: 180 }}>
        <SectionTitle>Gamma Profile</SectionTitle>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e22" vertical={false} />
            <XAxis dataKey="strike" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 9, fontFamily: "'Share Tech Mono', monospace", color: '#888' }} />
            <ReferenceLine x={spotPrice} stroke="var(--green)" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="callGamma" name="Γ" stroke="#c8a96e" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
