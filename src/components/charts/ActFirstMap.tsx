import React from 'react';
import { PatternRow, DisplayLevel } from '../../types/views';

interface ActFirstMapProps {
  patterns: PatternRow[];
}

function parseCost(costFormatted: string): number {
  const s = costFormatted.trim().replace(/^\$/, '');
  if (s.endsWith('K')) {
    return parseFloat(s.slice(0, -1)) * 1000;
  }
  if (s.endsWith('M')) {
    return parseFloat(s.slice(0, -1)) * 1_000_000;
  }
  return parseFloat(s) || 0;
}

function severityColor(severity: DisplayLevel): string {
  switch (severity) {
    case 'High':
      return 'var(--dt-colors-background-container-critical-default)';
    case 'Medium':
      return 'var(--dt-colors-background-container-warning-default)';
    case 'Low':
    default:
      return 'var(--dt-colors-background-container-success-default)';
  }
}

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 320;
const MARGIN = { left: 48, right: 24, top: 24, bottom: 40 };
const PLOT_W = VIEW_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom;
const MIN_R = 8;
const MAX_R = 22;
const TICK_COUNT = 4;

function linScale(value: number, domainMin: number, domainMax: number, rangeMin: number, rangeMax: number): number {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  return rangeMin + ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin);
}

function niceTickValues(min: number, max: number, count: number): number[] {
  if (min === max) return [min];
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + i * step);
}

function formatCostLabel(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return `$${Math.round(value)}`;
}

export function ActFirstMap({ patterns }: ActFirstMapProps): React.ReactElement {
  if (patterns.length === 0) {
    return (
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width="100%">
        <text
          x={VIEW_WIDTH / 2}
          y={VIEW_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={13}
          fill="var(--dt-colors-text-neutral-subdued)"
        >
          No patterns to display
        </text>
      </svg>
    );
  }

  const costs = patterns.map((p) => parseCost(p.costFormatted));
  const blastRadii = patterns.map((p) => p.blastRadius);
  const recurrences = patterns.map((p) => p.recurrenceCount);

  const costMin = Math.min(...costs);
  const costMax = Math.max(...costs);
  const blastMin = Math.min(...blastRadii);
  const blastMax = Math.max(...blastRadii);
  const recMin = Math.min(...recurrences);
  const recMax = Math.max(...recurrences);

  const xTicks = niceTickValues(costMin, costMax, TICK_COUNT);
  const yTicks = niceTickValues(blastMin, blastMax, TICK_COUNT);

  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width="100%">
      {/* Chart title */}
      <text
        x={MARGIN.left}
        y={MARGIN.top - 6}
        fontSize={14}
        fontWeight="bold"
        fill="var(--dt-colors-text-neutral-default)"
      >
        Act-First Map
      </text>

      {/* X axis line */}
      <line
        x1={MARGIN.left}
        y1={MARGIN.top + PLOT_H}
        x2={MARGIN.left + PLOT_W}
        y2={MARGIN.top + PLOT_H}
        stroke="var(--dt-colors-border-neutral-subdued)"
        strokeWidth={1}
      />

      {/* Y axis line */}
      <line
        x1={MARGIN.left}
        y1={MARGIN.top}
        x2={MARGIN.left}
        y2={MARGIN.top + PLOT_H}
        stroke="var(--dt-colors-border-neutral-subdued)"
        strokeWidth={1}
      />

      {/* X axis ticks and labels */}
      {xTicks.map((tick, i) => {
        const cx = MARGIN.left + linScale(tick, costMin, costMax, 0, PLOT_W);
        return (
          <g key={`xtick-${i}`}>
            <line
              x1={cx}
              y1={MARGIN.top + PLOT_H}
              x2={cx}
              y2={MARGIN.top + PLOT_H + 4}
              stroke="var(--dt-colors-border-neutral-subdued)"
              strokeWidth={1}
            />
            <text
              x={cx}
              y={MARGIN.top + PLOT_H + 14}
              textAnchor="middle"
              fontSize={10}
              fill="var(--dt-colors-text-neutral-subdued)"
            >
              {formatCostLabel(tick)}
            </text>
          </g>
        );
      })}

      {/* X axis label */}
      <text
        x={MARGIN.left + PLOT_W / 2}
        y={VIEW_HEIGHT - 4}
        textAnchor="middle"
        fontSize={11}
        fill="var(--dt-colors-text-neutral-subdued)"
      >
        Estimated Cost
      </text>

      {/* Y axis ticks and labels */}
      {yTicks.map((tick, i) => {
        const cy = MARGIN.top + linScale(tick, blastMin, blastMax, PLOT_H, 0);
        return (
          <g key={`ytick-${i}`}>
            <line
              x1={MARGIN.left - 4}
              y1={cy}
              x2={MARGIN.left}
              y2={cy}
              stroke="var(--dt-colors-border-neutral-subdued)"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 7}
              y={cy}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--dt-colors-text-neutral-subdued)"
            >
              {Math.round(tick)}
            </text>
          </g>
        );
      })}

      {/* Y axis label */}
      <text
        x={10}
        y={MARGIN.top + PLOT_H / 2}
        textAnchor="middle"
        fontSize={11}
        fill="var(--dt-colors-text-neutral-subdued)"
        transform={`rotate(-90, 10, ${MARGIN.top + PLOT_H / 2})`}
      >
        Blast Radius
      </text>

      {/* Bubbles */}
      {patterns.map((pattern, i) => {
        const cost = costs[i];
        const radius = linScale(pattern.recurrenceCount, recMin, recMax, MIN_R, MAX_R);

        const rawCx = MARGIN.left + linScale(cost, costMin, costMax, 0, PLOT_W);
        const rawCy = MARGIN.top + linScale(pattern.blastRadius, blastMin, blastMax, PLOT_H, 0);

        // Clamp to keep bubbles within plot area
        const cx = Math.min(Math.max(rawCx, MARGIN.left + radius), MARGIN.left + PLOT_W - radius);
        const cy = Math.min(Math.max(rawCy, MARGIN.top + radius), MARGIN.top + PLOT_H - radius);

        const label = pattern.name.length > 20 ? pattern.name.slice(0, 20) + '…' : pattern.name;

        return (
          <g key={pattern.id}>
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill={severityColor(pattern.severity)}
              stroke="var(--dt-colors-border-neutral-default)"
              strokeWidth={1}
            />
            <text
              x={cx}
              y={cy + radius + 11}
              textAnchor="middle"
              fontSize={10}
              fill="var(--dt-colors-text-neutral-subdued)"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default ActFirstMap;
