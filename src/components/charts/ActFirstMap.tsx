import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ObjectiveType, PatternRow, DisplayLevel } from '../../types/views';
import { computePriorityScores, parseCostValue, yAxisLabel } from '../../lib/pattern-priority';
import { DEFAULT_WEIGHTS, WeightsConfig } from '../config/ConfigDialog';

interface ActFirstMapProps {
  patterns: PatternRow[];
  objective?: ObjectiveType;
  weightsConfig?: WeightsConfig;
  onPatternSelect?: (id: string | null) => void;
  selectedPatternId?: string | null;
}

type PriorityLevel = 'High' | 'Medium' | 'Low';

type MapPoint = {
  id: string;
  name: string;
  cost: number;
  costLabel: string;
  blastRadius: number;
  recurrenceCount: number;
  openProblemCount: number;
  priority: PriorityLevel;
  severity: DisplayLevel;
  x: number;
  y: number;
  radius: number;
};

type PopupPosition = {
  left: string;
  top?: string;
  bottom?: string;
};

const POPUP_WIDTH = 250;
const POPUP_GAP = 14;
const POPUP_HEIGHT = 130;
const CHART_HEIGHT = 320;
// Approximate px-per-percent for collision math (chart ~480px wide, 320px tall)
const PX_PER_PCT_X = 4.8;
const PX_PER_PCT_Y = 3.2;

const PRIORITY_STYLE: Record<PriorityLevel, { border: string; background: string; text: string; glow: string }> = {
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

function bubbleRadius(value: number, values: number[]): number {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) return 14;
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  if (min === max) return 16;
  return 12 + ((value - min) / (max - min)) * 12;
}

function priorityFor(pattern: PatternRow): PriorityLevel {
  if (pattern.severity === 'High' || pattern.priority === 'Immediate') return 'High';
  if (pattern.severity === 'Medium' || pattern.priority === 'Short term') return 'Medium';
  return 'Low';
}

function buildMapPoints(patterns: PatternRow[], objective: ObjectiveType = 'cost_impact', weights: WeightsConfig = DEFAULT_WEIGHTS): MapPoint[] {
  const costs = patterns.map(pattern => parseCostValue(pattern.costFormatted));
  const recurrences = patterns.map(pattern => pattern.recurrenceCount);
  const priorityScores = computePriorityScores(patterns, objective, weights);

  return patterns.map(pattern => {
    const cost = parseCostValue(pattern.costFormatted);
    return {
      id: pattern.id,
      name: pattern.name,
      cost,
      costLabel: pattern.costFormatted,
      blastRadius: pattern.blastRadius,
      recurrenceCount: pattern.recurrenceCount,
      openProblemCount: pattern.openProblemCount,
      priority: priorityFor(pattern),
      severity: pattern.severity,
      x: normalize(cost, costs, 72),
      y: 12 + (priorityScores.get(pattern.id) ?? 0) * 76,
      radius: bubbleRadius(pattern.recurrenceCount, recurrences),
    };
  });
}

// Iterative collision avoidance: separates overlapping bubbles visually while
// preserving underlying score coordinates (point.x / point.y remain unchanged).
function resolveCollisions(points: ReadonlyArray<MapPoint>): Map<string, { x: number; y: number }> {
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

function getSafePopupPosition(displayX: number, displayY: number, radius: number): PopupPosition {
  const inset = 8;
  const left = `clamp(${inset}px, calc(${displayX}% - ${POPUP_WIDTH / 2}px), calc(100% - ${POPUP_WIDTH + inset}px))`;
  const verticalGap = radius + POPUP_GAP;

  // Place popup below the bubble when there is enough room, otherwise above.
  const pixelFromTop = (1 - displayY / 100) * CHART_HEIGHT;
  const spaceBelow = CHART_HEIGHT - pixelFromTop - verticalGap;

  if (spaceBelow >= POPUP_HEIGHT) {
    return { left, top: `calc(${100 - displayY}% + ${verticalGap}px)` };
  }
  return { left, bottom: `calc(${displayY}% + ${verticalGap}px)` };
}

export function ActFirstMap({ patterns, objective = 'cost_impact', weightsConfig = DEFAULT_WEIGHTS, onPatternSelect, selectedPatternId }: ActFirstMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [closedPopupId, setClosedPopupId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);

  const points = useMemo(() => buildMapPoints(patterns, objective, weightsConfig), [patterns, objective, weightsConfig]);
  const selectedPoint = useMemo(
    () => points.find(point => point.id === selectedPatternId) ?? null,
    [points, selectedPatternId],
  );

  // Display positions after collision avoidance (visual only — scores unchanged).
  const displayPos = useMemo(() => resolveCollisions(points), [points]);

  useEffect(() => {
    setClosedPopupId(null);
  }, [selectedPatternId]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!mapRef.current?.contains(event.target as Node)) {
        onPatternSelect?.(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onPatternSelect?.(null);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onPatternSelect]);

  function selectPoint(point: MapPoint) {
    setClosedPopupId(null);
    onPatternSelect?.(point.id);
  }

  if (patterns.length === 0) {
    return (
      <div style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>
        No patterns to display
      </div>
    );
  }

  const selectedDisplayPos = selectedPoint ? displayPos.get(selectedPoint.id) : null;

  return (
    <div
      ref={mapRef}
      style={{
        position: 'relative',
        minHeight: 390,
        padding: '20px 24px 38px 54px',
      }}
    >
      <div
        style={{
          position: 'relative',
          height: CHART_HEIGHT,
          borderLeft: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
          borderBottom: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
          background:
            'linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% + 0.5px), transparent calc(50% + 0.5px)), ' +
            'linear-gradient(0deg, transparent calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% + 0.5px), transparent calc(50% + 0.5px)), ' +
            'linear-gradient(90deg, transparent calc(25% - 0.5px), rgba(104, 112, 122, 0.10) calc(25% - 0.5px), rgba(104, 112, 122, 0.10) calc(25% + 0.5px), transparent calc(25% + 0.5px)), ' +
            'linear-gradient(90deg, transparent calc(75% - 0.5px), rgba(104, 112, 122, 0.10) calc(75% - 0.5px), rgba(104, 112, 122, 0.10) calc(75% + 0.5px), transparent calc(75% + 0.5px))',
        }}
      >
        <QuadrantLabel label="Plan & Fund" left="6%" top="8%" />
        <QuadrantLabel label="Act Now" left="58%" top="8%" />
        <QuadrantLabel label="Deprioritize" left="6%" top="78%" />
        <QuadrantLabel label="Quick Win" left="58%" top="78%" />

        {points.map(point => {
          const selected = point.id === selectedPatternId;
          const hovered = point.id === hoveredPointId;
          const style = PRIORITY_STYLE[point.priority];
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
              onClick={() => selectPoint(point)}
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
                cursor: onPatternSelect ? 'pointer' : 'default',
                boxShadow: selected ? `0 0 0 5px ${style.glow}, 0 8px 22px rgba(31, 38, 46, 0.18)` : '0 4px 12px rgba(31, 38, 46, 0.10)',
                padding: 0,
                // Hovered bubble rises above all others so the pointer event always lands on the intended element.
                zIndex: hovered ? 10 : selected ? 4 : 3,
              }}
            />
          );
        })}

        {selectedPoint && closedPopupId !== selectedPoint.id && selectedDisplayPos && (
          <PatternPopup
            point={selectedPoint}
            displayX={selectedDisplayPos.x}
            displayY={selectedDisplayPos.y}
            onClose={() => setClosedPopupId(selectedPoint.id)}
          />
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 4,
          transform: 'translateX(-50%)',
          fontSize: 12,
          color: 'var(--dt-colors-text-neutral-subdued, #74777a)',
        }}
      >
        Higher operational cost -&gt;
      </div>
      <div
        style={{
          position: 'absolute',
          left: 4,
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          transformOrigin: 'center',
          fontSize: 12,
          color: 'var(--dt-colors-text-neutral-subdued, #74777a)',
        }}
      >
        {yAxisLabel(objective)}
      </div>
    </div>
  );
}

function QuadrantLabel({ label, left, top }: { label: string; left: string; top: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--dt-colors-text-neutral-subdued, #74777a)',
        pointerEvents: 'none',
      }}
    >
      {label}
    </div>
  );
}

function PatternPopup({ point, displayX, displayY, onClose }: { point: MapPoint; displayX: number; displayY: number; onClose: () => void }) {
  const style = PRIORITY_STYLE[point.priority];
  const position = getSafePopupPosition(displayX, displayY, point.radius);

  return (
    <div
      role="dialog"
      aria-label={`${point.name} pattern summary`}
      style={{
        position: 'absolute',
        left: position.left,
        top: position.top,
        bottom: position.bottom,
        width: POPUP_WIDTH,
        padding: 12,
        border: `1px solid ${style.border}`,
        borderRadius: 8,
        background: 'var(--dt-colors-background-surface-default, #ffffff)',
        boxShadow: `0 0 0 3px ${style.glow}, 0 16px 40px rgba(0, 0, 0, 0.32)`,
        zIndex: 5,
      }}
    >
      <button
        type="button"
        aria-label="Close pattern popup"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          border: 0,
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--dt-colors-text-neutral-subdued, #74777a)',
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        x
      </button>
      <div style={{ paddingRight: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{point.name}</div>
          <span
            style={{
              color: style.text,
              border: `1px solid ${style.border}`,
              background: style.background,
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            Priority: {point.priority}
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <PopupStat label="Exposure" value={point.costLabel} />
          <PopupStat label="Blast radius" value={point.blastRadius} />
          <PopupStat label="Occurrences" value={point.recurrenceCount} />
          <PopupStat label="Open incidents" value={point.openProblemCount} />
        </div>
      </div>
    </div>
  );
}

function PopupStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      style={{
        border: '1px solid var(--dt-colors-border-neutral-subdued, #e7e9ec)',
        borderRadius: 6,
        padding: '6px 8px',
        background: 'var(--dt-colors-background-container-neutral-subdued, #f7f8fa)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--dt-colors-text-neutral-subdued, #74777a)',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{String(value)}</div>
    </div>
  );
}

export default ActFirstMap;
