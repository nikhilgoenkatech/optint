import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ObjectiveType, PatternRow } from '../../types/views';
import { computePriorityScores, yAxisLabel } from '../../lib/pattern-priority';
import { DEFAULT_WEIGHTS, WeightsConfig } from '../config/ConfigDialog';

interface ReliabilityRiskMatrixProps {
  patterns: PatternRow[];
  objective?: ObjectiveType;
  weightsConfig?: WeightsConfig;
  onPatternSelect?: (id: string | null) => void;
  selectedPatternId?: string | null;
}

type RiskLevel = 'High' | 'Medium' | 'Low';

type MatrixPoint = {
  id: string;
  name: string;
  recurrenceCount: number;
  blastRadius: number;
  trend: string;
  priority: RiskLevel;
  x: number;
  y: number;
  radius: number;
};

const POPUP_WIDTH = 250;
const POPUP_GAP = 14;
const POPUP_HEIGHT = 130;
const CHART_HEIGHT = 320;
const PX_PER_PCT_X = 4.8;
const PX_PER_PCT_Y = 3.2;

const RISK_STYLE: Record<RiskLevel, { border: string; background: string; text: string; glow: string }> = {
  High: {
    border: 'var(--dt-colors-border-critical-default, #c41a00)',
    background: 'rgba(196, 26, 0, 0.16)',
    text: 'var(--dt-colors-text-critical-default, #c41a00)',
    glow: 'rgba(196, 26, 0, 0.24)',
  },
  Medium: {
    border: 'var(--dt-colors-border-warning-default, #b45309)',
    background: 'rgba(180, 83, 9, 0.16)',
    text: 'var(--dt-colors-text-warning-default, #b45309)',
    glow: 'rgba(180, 83, 9, 0.24)',
  },
  Low: {
    border: 'var(--dt-colors-border-success-default, #1a7a4a)',
    background: 'rgba(26, 122, 74, 0.14)',
    text: 'var(--dt-colors-text-success-default, #1a7a4a)',
    glow: 'rgba(26, 122, 74, 0.22)',
  },
};

function normalize(value: number, values: number[], fallback: number): number {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return fallback;
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  if (min === max) return fallback;
  return 12 + ((value - min) / (max - min)) * 76;
}

function riskFor(pattern: PatternRow): RiskLevel {
  if (pattern.severity === 'High' || pattern.priority === 'Immediate') return 'High';
  if (pattern.severity === 'Medium' || pattern.priority === 'Short term') return 'Medium';
  return 'Low';
}

function bubbleRadius(value: number, values: number[]): number {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return 14;
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  if (min === max) return 16;
  return 12 + ((value - min) / (max - min)) * 12;
}

function buildPoints(patterns: PatternRow[], objective: ObjectiveType = 'cost_impact', weights: WeightsConfig = DEFAULT_WEIGHTS): MatrixPoint[] {
  const recurrences = patterns.map(pattern => pattern.recurrenceCount);
  const priorityScores = computePriorityScores(patterns, objective, weights);

  return patterns.map(pattern => ({
    id: pattern.id,
    name: pattern.name,
    recurrenceCount: pattern.recurrenceCount,
    blastRadius: pattern.blastRadius,
    trend: pattern.trend,
    priority: riskFor(pattern),
    x: normalize(pattern.recurrenceCount, recurrences, 70),
    y: 12 + (priorityScores.get(pattern.id) ?? 0) * 76,
    radius: bubbleRadius(pattern.recurrenceCount, recurrences),
  }));
}

function resolveCollisions(points: ReadonlyArray<MatrixPoint>): Map<string, { x: number; y: number }> {
  const pos = new Map(points.map(p => [p.id, { x: p.x, y: p.y }]));

  for (let iter = 0; iter < 12; iter++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        const pa = pos.get(a.id)!;
        const pb = pos.get(b.id)!;

        const dpx = (pb.x - pa.x) * PX_PER_PCT_X;
        const dpy = (pb.y - pa.y) * PX_PER_PCT_Y;
        const distPx = Math.sqrt(dpx * dpx + dpy * dpy);
        const minDistPx = a.radius + b.radius + 4;

        if (distPx < minDistPx && distPx > 0.1) {
          const push = (minDistPx - distPx) / 2;
          const nx = dpx / distPx;
          const ny = dpy / distPx;
          pa.x = Math.max(6, Math.min(94, pa.x - (nx * push) / PX_PER_PCT_X));
          pa.y = Math.max(6, Math.min(94, pa.y - (ny * push) / PX_PER_PCT_Y));
          pb.x = Math.max(6, Math.min(94, pb.x + (nx * push) / PX_PER_PCT_X));
          pb.y = Math.max(6, Math.min(94, pb.y + (ny * push) / PX_PER_PCT_Y));
        }
      }
    }
  }

  return pos;
}

function getSafePopupPosition(displayX: number, displayY: number, radius: number) {
  const inset = 8;
  const left = `clamp(${inset}px, calc(${displayX}% - ${POPUP_WIDTH / 2}px), calc(100% - ${POPUP_WIDTH + inset}px))`;
  const verticalGap = radius + POPUP_GAP;

  const pixelFromTop = (1 - displayY / 100) * CHART_HEIGHT;
  const spaceBelow = CHART_HEIGHT - pixelFromTop - verticalGap;

  if (spaceBelow >= POPUP_HEIGHT) {
    return { left, top: `calc(${100 - displayY}% + ${verticalGap}px)` };
  }
  return { left, bottom: `calc(${displayY}% + ${verticalGap}px)` };
}

export function ReliabilityRiskMatrix({ patterns, objective = 'cost_impact', weightsConfig = DEFAULT_WEIGHTS, onPatternSelect, selectedPatternId }: ReliabilityRiskMatrixProps) {
  const matrixRef = useRef<HTMLDivElement>(null);
  const [closedPopupId, setClosedPopupId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const points = useMemo(() => buildPoints(patterns, objective, weightsConfig), [patterns, objective, weightsConfig]);
  const selectedPoint = points.find(point => point.id === selectedPatternId) ?? null;

  // Display positions after collision avoidance (visual only — scores unchanged).
  const displayPos = useMemo(() => resolveCollisions(points), [points]);

  useEffect(() => {
    setClosedPopupId(null);
  }, [selectedPatternId]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!matrixRef.current?.contains(event.target as Node)) {
        onPatternSelect?.(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onPatternSelect?.(null);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onPatternSelect]);

  if (patterns.length === 0) {
    return <div style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>No reliability risks to display</div>;
  }

  const selectedDisplayPos = selectedPoint ? displayPos.get(selectedPoint.id) : null;

  return (
    <div ref={matrixRef} style={{ position: 'relative', minHeight: 390, padding: '20px 24px 38px 54px' }}>
      <div
        style={{
          position: 'relative',
          height: CHART_HEIGHT,
          borderLeft: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
          borderBottom: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
          background:
            'linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% + 0.5px), transparent calc(50% + 0.5px)), ' +
            'linear-gradient(0deg, transparent calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% + 0.5px), transparent calc(50% + 0.5px))',
        }}
      >
        <QuadrantLabel label="Act Now" left="6%" top="8%" />
        <QuadrantLabel label="Strategic Investment" left="58%" top="8%" />
        <QuadrantLabel label="Monitor" left="6%" top="78%" />
        <QuadrantLabel label="Quick Win" left="58%" top="78%" />

        {points.map(point => {
          const selected = point.id === selectedPatternId;
          const hovered = point.id === hoveredPointId;
          const style = RISK_STYLE[point.priority];
          const diameter = selected ? point.radius + 8 : point.radius;
          const dp = displayPos.get(point.id)!;
          return (
            <button
              key={point.id}
              type="button"
              aria-label={`Select ${point.name}`}
              aria-pressed={selected}
              onMouseEnter={() => setHoveredPointId(point.id)}
              onMouseLeave={() => setHoveredPointId(null)}
              onClick={() => {
                setClosedPopupId(null);
                onPatternSelect?.(point.id);
              }}
              style={{
                position: 'absolute',
                left: `${dp.x}%`,
                bottom: `${dp.y}%`,
                width: diameter,
                height: diameter,
                transform: 'translate(-50%, 50%)',
                borderRadius: '999px',
                border: selected ? `2px solid ${style.border}` : `1px solid ${style.border}`,
                background: style.background,
                boxShadow: selected ? `0 0 0 5px ${style.glow}, 0 8px 22px rgba(31, 38, 46, 0.18)` : '0 4px 12px rgba(31, 38, 46, 0.10)',
                cursor: 'pointer',
                // Hovered bubble rises above all others so the pointer event always lands on the intended element.
                zIndex: hovered ? 10 : selected ? 4 : 3,
              }}
            />
          );
        })}

        {selectedPoint && closedPopupId !== selectedPoint.id && selectedDisplayPos && (
          <RiskPopup point={selectedPoint} displayX={selectedDisplayPos.x} displayY={selectedDisplayPos.y} onClose={() => setClosedPopupId(selectedPoint.id)} />
        )}
      </div>
      <AxisLabel bottom>Higher recurrence -&gt;</AxisLabel>
      <AxisLabel>{yAxisLabel(objective)}</AxisLabel>
    </div>
  );
}

function RiskPopup({ point, displayX, displayY, onClose }: { point: MatrixPoint; displayX: number; displayY: number; onClose: () => void }) {
  const style = RISK_STYLE[point.priority];
  const position = getSafePopupPosition(displayX, displayY, point.radius);

  return (
    <div
      role="dialog"
      aria-label={`${point.name} reliability risk summary`}
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        bottom: position.bottom,
        width: POPUP_WIDTH,
        padding: 12,
        border: `1px solid ${style.border}`,
        borderRadius: 8,
        background: 'var(--dt-colors-background-container-neutral-default, #ffffff)',
        boxShadow: `0 0 0 3px ${style.glow}, 0 16px 40px rgba(31, 38, 46, 0.18)`,
        zIndex: 5,
      }}
    >
      <PopupClose onClose={onClose} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, paddingRight: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{point.name}</div>
        <PriorityBadge level={point.priority} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <PopupStat label="Recurrence" value={point.recurrenceCount} />
        <PopupStat label="Blast radius" value={point.blastRadius} />
        <PopupStat label="Trend" value={point.trend} />
        <PopupStat label="Signal" value={point.priority} />
      </div>
    </div>
  );
}

function PriorityBadge({ level }: { level: RiskLevel }) {
  const style = RISK_STYLE[level];
  return (
    <span style={{ color: style.text, border: `1px solid ${style.border}`, background: style.background, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
      {level}
    </span>
  );
}

function PopupClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close popup"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      style={{ position: 'absolute', top: 6, right: 6, border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--dt-colors-text-neutral-subdued, #74777a)', fontSize: 14, lineHeight: 1 }}
    >
      x
    </button>
  );
}

function PopupStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ border: '1px solid var(--dt-colors-border-neutral-subdued, #e7e9ec)', borderRadius: 6, padding: '6px 8px', background: 'var(--dt-colors-background-container-neutral-subdued, #f7f8fa)' }}>
      <div style={{ fontSize: 10, color: 'var(--dt-colors-text-neutral-subdued, #74777a)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{String(value)}</div>
    </div>
  );
}

function QuadrantLabel({ label, left, top }: { label: string; left: string; top: string }) {
  return <div style={{ position: 'absolute', left, top, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--dt-colors-text-neutral-subdued, #74777a)', pointerEvents: 'none' }}>{label}</div>;
}

function AxisLabel({ children, bottom = false }: { children: React.ReactNode; bottom?: boolean }) {
  return (
    <div
      style={bottom
        ? { position: 'absolute', left: '50%', bottom: 4, transform: 'translateX(-50%)', fontSize: 12, color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }
        : { position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center', fontSize: 12, color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}
    >
      {children}
    </div>
  );
}

export default ReliabilityRiskMatrix;
