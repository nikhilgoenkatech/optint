import React from 'react';
import { PatternRow, DisplayLevel } from '../../types/views';

interface ActFirstMapProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
  selectedPatternId?: string | null;
}

function parseCost(costFormatted: string): number {
  const s = costFormatted.trim().replace(/^\$/, '');
  if (s.endsWith('K')) return parseFloat(s) * 1000;
  if (s.endsWith('M')) return parseFloat(s) * 1_000_000;
  return parseFloat(s) || 0;
}

const SEVERITY_COLOR: Record<DisplayLevel, string> = {
  High:   '#e84626',
  Medium: '#f5a623',
  Low:    '#2ab06f',
};

const VIEW_W = 560;
const VIEW_H = 240;
const M = { left: 52, right: 24, top: 32, bottom: 44 };
const PW = VIEW_W - M.left - M.right;
const PH = VIEW_H - M.top - M.bottom;
const MIN_R = 8;
const MAX_R = 20;

function scale(v: number, dMin: number, dMax: number, rMin: number, rMax: number): number {
  if (dMax === dMin) return (rMin + rMax) / 2;
  return rMin + ((v - dMin) / (dMax - dMin)) * (rMax - rMin);
}

function expandDomain(min: number, max: number): [number, number] {
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.5;
    return [min - pad, max + pad];
  }
  return [min, max];
}

function fmtCost(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

export function ActFirstMap({ patterns, onPatternSelect, selectedPatternId }: ActFirstMapProps) {
  if (patterns.length === 0) {
    return (
      <svg viewBox={`0 0 ${VIEW_W} 120`} width="100%">
        <text x={VIEW_W / 2} y={60} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: '#74777a', fontSize: 13 }}>No patterns to display</text>
      </svg>
    );
  }

  const costs  = patterns.map(p => parseCost(p.costFormatted));
  const blasts = patterns.map(p => p.blastRadius);
  const recs   = patterns.map(p => p.recurrenceCount);

  const [costMin, costMax]   = expandDomain(Math.min(...costs),  Math.max(...costs));
  const [blastMin, blastMax] = expandDomain(Math.min(...blasts), Math.max(...blasts));
  const [recMin, recMax]     = expandDomain(Math.min(...recs),   Math.max(...recs));

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(t => costMin + t * (costMax - costMin));
  const yTicks = [0, 0.5, 1].map(t => blastMin + t * (blastMax - blastMin));

  const muted  = 'var(--dt-colors-text-neutral-subdued, #74777a)';
  const axis   = 'var(--dt-colors-border-neutral-subdued, #e0e0e0)';
  const strong = 'var(--dt-colors-text-neutral-default, #23282d)';

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" style={{ display: 'block' }}>
      <text x={M.left} y={16} style={{ fill: strong, fontSize: 13, fontWeight: 600 }}>Act-First Map</text>

      {/* Axes */}
      <line x1={M.left} y1={M.top + PH} x2={M.left + PW} y2={M.top + PH}
        stroke={axis} strokeWidth={1} />
      <line x1={M.left} y1={M.top} x2={M.left} y2={M.top + PH}
        stroke={axis} strokeWidth={1} />

      {/* X ticks */}
      {xTicks.map((v, i) => {
        const x = M.left + scale(v, costMin, costMax, 0, PW);
        return (
          <g key={i}>
            <line x1={x} y1={M.top + PH} x2={x} y2={M.top + PH + 4} stroke={axis} strokeWidth={1} />
            <text x={x} y={M.top + PH + 14} textAnchor="middle"
              style={{ fill: muted, fontSize: 10 }}>{fmtCost(v)}</text>
          </g>
        );
      })}

      {/* Y ticks */}
      {yTicks.map((v, i) => {
        const y = M.top + scale(v, blastMin, blastMax, PH, 0);
        return (
          <g key={i}>
            <line x1={M.left - 4} y1={y} x2={M.left} y2={y} stroke={axis} strokeWidth={1} />
            <text x={M.left - 8} y={y} textAnchor="end" dominantBaseline="middle"
              style={{ fill: muted, fontSize: 10 }}>{Math.round(v)}</text>
          </g>
        );
      })}

      {/* Axis labels */}
      <text x={M.left + PW / 2} y={VIEW_H - 4} textAnchor="middle"
        style={{ fill: muted, fontSize: 11 }}>Estimated Cost</text>
      <text x={12} y={M.top + PH / 2} textAnchor="middle"
        style={{ fill: muted, fontSize: 11 }}
        transform={`rotate(-90,12,${M.top + PH / 2})`}>Blast Radius</text>

      {/* Bubbles */}
      {patterns.map((p, i) => {
        const r  = scale(recs[i], recMin, recMax, MIN_R, MAX_R);
        const cx = Math.min(Math.max(M.left + scale(costs[i], costMin, costMax, 0, PW), M.left + r), M.left + PW - r);
        const cy = Math.min(Math.max(M.top + scale(blasts[i], blastMin, blastMax, PH, 0), M.top + r), M.top + PH - r);
        const label = p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name;
        const fill = SEVERITY_COLOR[p.severity];
        return (
          <g key={p.id} onClick={() => onPatternSelect?.(p.id)} style={{ cursor: onPatternSelect ? 'pointer' : 'default' }}>
            {p.id === selectedPatternId && (
              <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="#1496ff" strokeWidth={2} />
            )}
            <circle cx={cx} cy={cy} r={r}
              style={{ fill, fillOpacity: 0.85, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 1 }} />
            <text x={cx} y={cy + r + 11} textAnchor="middle"
              style={{ fill: muted, fontSize: 10 }}>{label}</text>
          </g>
        );
      })}

      {/* Legend */}
      {(['High', 'Medium', 'Low'] as DisplayLevel[]).map((sev, i) => (
        <g key={sev} transform={`translate(${M.left + i * 80}, ${VIEW_H - 6})`}>
          <circle cx={5} cy={-3} r={5} style={{ fill: SEVERITY_COLOR[sev] }} />
          <text x={13} y={0} style={{ fill: muted, fontSize: 10 }}>{sev}</text>
        </g>
      ))}
    </svg>
  );
}

export default ActFirstMap;
