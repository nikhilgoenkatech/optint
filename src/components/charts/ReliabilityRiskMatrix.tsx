import React, { useMemo } from 'react';
import { PatternRow } from '../../types/views';

interface ReliabilityRiskMatrixProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
  selectedPatternId?: string | null;
}

const TREND_COLOR: Record<string, string> = {
  Increasing: '#e84626',
  Stable:     '#f5a623',
  Decreasing: '#2ab06f',
};

const W = 560;
const H = 240;
const M = { left: 52, right: 24, top: 32, bottom: 44 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

function expandDomain(min: number, max: number): [number, number] {
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.5;
    return [min - pad, max + pad];
  }
  return [min, max];
}

export function ReliabilityRiskMatrix({ patterns, onPatternSelect, selectedPatternId }: ReliabilityRiskMatrixProps) {
  const muted  = 'var(--dt-colors-text-neutral-subdued, #74777a)';
  const axis   = 'var(--dt-colors-border-neutral-subdued, #e0e0e0)';
  const strong = 'var(--dt-colors-text-neutral-default, #23282d)';

  const { points, xTicks, yTicks, qX, qY } = useMemo(() => {
    if (patterns.length === 0) return { points: [], xTicks: [], yTicks: [], qX: M.left + PW / 2, qY: M.top + PH / 2 };

    const counts = patterns.map(p => p.recurrenceCount);
    const [yMin, yMax] = expandDomain(Math.min(...counts), Math.max(...counts));

    const toX = (v: number) => M.left + v * PW;
    const toY = (v: number) => M.top + PH - ((v - yMin) / (yMax - yMin)) * PH;

    const sorted = [...counts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    return {
      points: patterns.map(p => ({
        id: p.id,
        cx: toX(p.evidenceQualityScore),
        cy: toY(p.recurrenceCount),
        color: TREND_COLOR[p.trend] ?? TREND_COLOR.Stable,
        label: p.name.length > 16 ? p.name.slice(0, 16) + '…' : p.name,
      })),
      xTicks: [0, 0.25, 0.5, 0.75, 1.0].map(v => ({ x: toX(v), label: v.toFixed(2) })),
      yTicks: [0, 0.5, 1].map(t => {
        const v = yMin + t * (yMax - yMin);
        return { y: toY(v), label: Math.round(v).toString() };
      }),
      qX: toX(0.5),
      qY: toY(median),
    };
  }, [patterns]);

  if (patterns.length === 0) {
    return (
      <svg viewBox={`0 0 ${W} 120`} width="100%">
        <text x={W / 2} y={60} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: muted, fontSize: 13 }}>No patterns to display</text>
      </svg>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <text x={M.left} y={16} style={{ fill: strong, fontSize: 13, fontWeight: 600 }}>
          Reliability Risk Matrix
        </text>

        {/* Plot border */}
        <rect x={M.left} y={M.top} width={PW} height={PH}
          style={{ fill: 'none', stroke: axis }} strokeWidth={1} />

        {/* Quadrant lines */}
        <line x1={qX} y1={M.top} x2={qX} y2={M.top + PH}
          stroke={axis} strokeDasharray="4 3" strokeWidth={1} />
        <line x1={M.left} y1={qY} x2={M.left + PW} y2={qY}
          stroke={axis} strokeDasharray="4 3" strokeWidth={1} />

        {/* Quadrant labels */}
        <text x={M.left + 4} y={M.top + 11} style={{ fill: muted, fontSize: 9 }}>Low evidence · High recurrence</text>
        <text x={qX + 4}    y={M.top + 11} style={{ fill: muted, fontSize: 9 }}>High evidence · High recurrence</text>
        <text x={M.left + 4} y={qY - 4}   style={{ fill: muted, fontSize: 9 }}>Low evidence · Low recurrence</text>
        <text x={qX + 4}    y={qY - 4}    style={{ fill: muted, fontSize: 9 }}>High evidence · Low recurrence</text>

        {/* X axis */}
        {xTicks.map(t => (
          <g key={t.label}>
            <line x1={t.x} y1={M.top + PH} x2={t.x} y2={M.top + PH + 4} stroke={axis} strokeWidth={1} />
            <text x={t.x} y={M.top + PH + 14} textAnchor="middle"
              style={{ fill: muted, fontSize: 10 }}>{t.label}</text>
          </g>
        ))}

        {/* Y axis */}
        {yTicks.map(t => (
          <g key={t.label}>
            <line x1={M.left - 4} y1={t.y} x2={M.left} y2={t.y} stroke={axis} strokeWidth={1} />
            <text x={M.left - 8} y={t.y} textAnchor="end" dominantBaseline="middle"
              style={{ fill: muted, fontSize: 10 }}>{t.label}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={M.left + PW / 2} y={H - 4} textAnchor="middle"
          style={{ fill: muted, fontSize: 11 }}>Evidence Quality</text>
        <text x={12} y={M.top + PH / 2} textAnchor="middle"
          style={{ fill: muted, fontSize: 11 }}
          transform={`rotate(-90,12,${M.top + PH / 2})`}>Recurrences</text>

        {/* Points */}
        {points.map((pt, i) => (
          <g key={i}
            onClick={() => onPatternSelect?.(pt.id)}
            style={{ cursor: onPatternSelect ? 'pointer' : 'default' }}>
            {pt.id === selectedPatternId && (
              <circle cx={pt.cx} cy={pt.cy} r={11} fill="none" stroke="#1496ff" strokeWidth={2} />
            )}
            <circle cx={pt.cx} cy={pt.cy} r={7}
              style={{ fill: pt.color, fillOpacity: 0.9, stroke: 'rgba(0,0,0,0.15)', strokeWidth: 1 }} />
            <text x={pt.cx + 10} y={pt.cy + 4}
              style={{ fill: muted, fontSize: 10 }}>{pt.label}</text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 4,
        fontSize: 11, color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}>
        {(['Increasing', 'Stable', 'Decreasing'] as const).map(trend => (
          <div key={trend} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width={12} height={12} style={{ flexShrink: 0 }}>
              <circle cx={6} cy={6} r={5}
                style={{ fill: TREND_COLOR[trend], stroke: 'rgba(0,0,0,0.15)', strokeWidth: 1 }} />
            </svg>
            <span>{trend}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReliabilityRiskMatrix;
