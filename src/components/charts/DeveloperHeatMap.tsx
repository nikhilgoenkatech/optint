import React from 'react';
import { PatternRow } from '../../types/views';

interface DeveloperHeatMapProps {
  patterns: PatternRow[];
}

const SEVERITY_COLOR: Record<PatternRow['severity'], string> = {
  High:   '#e84626',
  Medium: '#f5a623',
  Low:    '#2ab06f',
};

const CELL    = 28;
const GAP     = 2;
const LABEL_W = 140;
const COL_H   = 72;
const TITLE_H = 24;

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

export function DeveloperHeatMap({ patterns }: DeveloperHeatMapProps) {
  const muted  = 'var(--dt-colors-text-neutral-subdued, #74777a)';
  const strong = 'var(--dt-colors-text-neutral-default, #23282d)';
  const empty  = 'var(--dt-colors-background-container-neutral-subdued, #f5f5f5)';
  const border = 'var(--dt-colors-border-neutral-subdued, #e0e0e0)';

  if (patterns.length === 0) {
    return (
      <svg width="100%" viewBox="0 0 400 80">
        <text x={200} y={40} textAnchor="middle" dominantBaseline="middle"
          style={{ fill: muted, fontSize: 13 }}>No patterns to display</text>
      </svg>
    );
  }

  const servicesSet = new Set<string>();
  patterns.forEach(p => p.affectedServices.forEach(s => servicesSet.add(s)));
  const services = Array.from(servicesSet);

  const cols   = patterns.length;
  const rows   = services.length;
  const gridW  = cols * (CELL + GAP) - GAP;
  const gridH  = rows * (CELL + GAP) - GAP;
  const svgW   = LABEL_W + gridW + 16;
  const svgH   = TITLE_H + COL_H + gridH + 8;
  const gridX  = LABEL_W;
  const gridY  = TITLE_H + COL_H;

  return (
    <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: 'block' }}>
      <text x={0} y={16} style={{ fill: strong, fontSize: 13, fontWeight: 600 }}>
        Developer Heat Map
      </text>

      {/* Column labels */}
      {patterns.map((p, ci) => {
        const cx = gridX + ci * (CELL + GAP) + CELL / 2;
        const cy = gridY - 4;
        return (
          <text key={p.id} x={cx} y={cy} fontSize={10}
            style={{ fill: muted }}
            transform={`rotate(-45,${cx},${cy})`}
            textAnchor="start">
            {truncate(p.name, 16)}
          </text>
        );
      })}

      {/* Row labels */}
      {services.map((svc, ri) => {
        const cy = gridY + ri * (CELL + GAP) + CELL / 2;
        return (
          <text key={svc} x={LABEL_W - 8} y={cy} fontSize={11}
            style={{ fill: strong }}
            textAnchor="end" dominantBaseline="middle">
            {svc}
          </text>
        );
      })}

      {/* Cells */}
      {services.map((svc, ri) =>
        patterns.map((p, ci) => {
          const filled = p.affectedServices.includes(svc);
          const x = gridX + ci * (CELL + GAP);
          const y = gridY + ri * (CELL + GAP);
          return (
            <rect key={`${ri}-${ci}`} x={x} y={y} width={CELL} height={CELL}
              style={{
                fill: filled ? SEVERITY_COLOR[p.severity] : empty,
                fillOpacity: filled ? 0.85 : 1,
                stroke: border,
                strokeWidth: 1,
              }} />
          );
        })
      )}

      {/* Legend */}
      {(['High', 'Medium', 'Low'] as PatternRow['severity'][]).map((sev, i) => (
        <g key={sev} transform={`translate(${LABEL_W + i * 70}, ${svgH - 2})`}>
          <rect width={10} height={10} y={-10}
            style={{ fill: SEVERITY_COLOR[sev], fillOpacity: 0.85 }} />
          <text x={13} y={0} style={{ fill: muted, fontSize: 10 }}>{sev}</text>
        </g>
      ))}
    </svg>
  );
}

export default DeveloperHeatMap;
