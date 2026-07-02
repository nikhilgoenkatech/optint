import React, { useMemo } from 'react';
import { PatternRow } from '../../types/views';

interface ReliabilityRiskMatrixProps {
  patterns: PatternRow[];
}

const SVG_WIDTH = 560;
const SVG_HEIGHT = 320;
const MARGIN = { left: 48, right: 24, top: 24, bottom: 40 };

const PLOT_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

const TREND_COLORS: Record<string, string> = {
  Increasing: 'var(--dt-colors-background-container-critical-default)',
  Stable: 'var(--dt-colors-background-container-warning-default)',
  Decreasing: 'var(--dt-colors-background-container-success-default)',
};

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

export const ReliabilityRiskMatrix: React.FC<ReliabilityRiskMatrixProps> = ({ patterns }) => {
  const { yMin, yMax, yMedian, points, xTicks, yTicks } = useMemo(() => {
    if (patterns.length === 0) {
      return { yMin: 0, yMax: 10, yMedian: 5, points: [], xTicks: [], yTicks: [] };
    }

    const counts = patterns.map((p) => p.recurrenceCount);
    const yMin = 0;
    const yMax = Math.max(...counts, 1);

    const sorted = [...counts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const yMedian =
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    const toX = (v: number) => MARGIN.left + v * PLOT_WIDTH;
    const toY = (v: number) => MARGIN.top + PLOT_HEIGHT - ((v - yMin) / (yMax - yMin || 1)) * PLOT_HEIGHT;

    const pts = patterns.map((p) => ({
      cx: toX(p.evidenceQualityScore),
      cy: toY(p.recurrenceCount),
      color: TREND_COLORS[p.trend] ?? 'var(--dt-colors-background-container-warning-default)',
      label: truncate(p.name, 18),
    }));

    const xTicks = [0, 0.25, 0.5, 0.75, 1.0].map((v) => ({
      x: toX(v),
      label: v.toFixed(2),
    }));

    const yTickCount = 5;
    const yTicks = Array.from({ length: yTickCount }, (_, i) => {
      const v = yMin + (i / (yTickCount - 1)) * (yMax - yMin);
      return { y: toY(v), label: Math.round(v).toString() };
    });

    return { yMin, yMax, yMedian, points: pts, xTicks, yTicks };
  }, [patterns]);

  const toX = (v: number) => MARGIN.left + v * PLOT_WIDTH;
  const toY = (v: number) =>
    MARGIN.top + PLOT_HEIGHT - ((v - yMin) / (yMax - yMin || 1)) * PLOT_HEIGHT;

  const quadrantLineX = toX(0.5);
  const quadrantLineY = toY(yMedian);

  const textStyle = {
    fontFamily: 'inherit',
    fontSize: 10,
    fill: 'var(--dt-colors-text-neutral-subdued)',
  };

  return (
    <div style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block' }}
      >
        {/* Title */}
        <text
          x={MARGIN.left}
          y={14}
          fontSize={14}
          fontWeight="bold"
          fill="var(--dt-colors-text-neutral-default)"
          fontFamily="inherit"
        >
          Reliability Risk Matrix
        </text>

        {/* Plot area border */}
        <rect
          x={MARGIN.left}
          y={MARGIN.top}
          width={PLOT_WIDTH}
          height={PLOT_HEIGHT}
          fill="none"
          stroke="var(--dt-colors-border-neutral-subdued)"
          strokeWidth={1}
        />

        {/* Quadrant dashed lines */}
        <line
          x1={quadrantLineX}
          y1={MARGIN.top}
          x2={quadrantLineX}
          y2={MARGIN.top + PLOT_HEIGHT}
          stroke="var(--dt-colors-border-neutral-subdued)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
        <line
          x1={MARGIN.left}
          y1={quadrantLineY}
          x2={MARGIN.left + PLOT_WIDTH}
          y2={quadrantLineY}
          stroke="var(--dt-colors-border-neutral-subdued)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />

        {/* Quadrant labels */}
        <text x={MARGIN.left + 4} y={MARGIN.top + 12} style={textStyle}>
          Low evidence / High recurrence
        </text>
        <text x={quadrantLineX + 4} y={MARGIN.top + 12} style={textStyle}>
          High evidence / High recurrence
        </text>
        <text x={MARGIN.left + 4} y={quadrantLineY + 12} style={textStyle}>
          Low evidence / Low recurrence
        </text>
        <text x={quadrantLineX + 4} y={quadrantLineY + 12} style={textStyle}>
          High evidence / Low recurrence
        </text>

        {/* X axis ticks + labels */}
        {xTicks.map((t) => (
          <g key={t.label}>
            <line
              x1={t.x}
              y1={MARGIN.top + PLOT_HEIGHT}
              x2={t.x}
              y2={MARGIN.top + PLOT_HEIGHT + 4}
              stroke="var(--dt-colors-border-neutral-subdued)"
              strokeWidth={1}
            />
            <text
              x={t.x}
              y={MARGIN.top + PLOT_HEIGHT + 14}
              textAnchor="middle"
              style={textStyle}
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Y axis ticks + labels */}
        {yTicks.map((t) => (
          <g key={t.label}>
            <line
              x1={MARGIN.left - 4}
              y1={t.y}
              x2={MARGIN.left}
              y2={t.y}
              stroke="var(--dt-colors-border-neutral-subdued)"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 6}
              y={t.y + 4}
              textAnchor="end"
              style={textStyle}
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text
          x={MARGIN.left + PLOT_WIDTH / 2}
          y={SVG_HEIGHT - 4}
          textAnchor="middle"
          fontSize={11}
          fill="var(--dt-colors-text-neutral-subdued)"
          fontFamily="inherit"
        >
          Evidence Quality
        </text>
        <text
          x={10}
          y={MARGIN.top + PLOT_HEIGHT / 2}
          textAnchor="middle"
          fontSize={11}
          fill="var(--dt-colors-text-neutral-subdued)"
          fontFamily="inherit"
          transform={`rotate(-90, 10, ${MARGIN.top + PLOT_HEIGHT / 2})`}
        >
          Recurrences
        </text>

        {/* Data points */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.cx}
              cy={pt.cy}
              r={7}
              fill={pt.color}
              stroke="var(--dt-colors-border-neutral-default)"
              strokeWidth={1}
            />
            <text
              x={pt.cx + 10}
              y={pt.cy + 4}
              fontSize={10}
              fill="var(--dt-colors-text-neutral-subdued)"
              fontFamily="inherit"
            >
              {pt.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Legend */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          marginTop: 4,
          fontSize: 11,
          color: 'var(--dt-colors-text-neutral-subdued)',
          fontFamily: 'inherit',
        }}
      >
        {(['Increasing', 'Stable', 'Decreasing'] as const).map((trend) => (
          <div key={trend} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width={12} height={12} style={{ flexShrink: 0 }}>
              <circle cx={6} cy={6} r={5} fill={TREND_COLORS[trend]} stroke="var(--dt-colors-border-neutral-default)" strokeWidth={1} />
            </svg>
            <span>{trend}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReliabilityRiskMatrix;
