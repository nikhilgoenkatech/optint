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

const POPUP_HEIGHT = 130;
const CHART_HEIGHT = 320;

function getSafePopupPosition(point: MapPoint): PopupPosition {
  const inset = 8;
  const left = `clamp(${inset}px, calc(${point.x}% - ${POPUP_WIDTH / 2}px), calc(100% - ${POPUP_WIDTH + inset}px))`;
  const verticalGap = point.radius + POPUP_GAP;
  const pixelFromTop = (1 - point.y / 100) * CHART_HEIGHT;
  const spaceBelow = CHART_HEIGHT - pixelFromTop - verticalGap;
  if (spaceBelow >= POPUP_HEIGHT) {
    return { left, top: `calc(${100 - point.y}% + ${verticalGap}px)` };
  }
  return { left, bottom: `calc(${point.y}% + ${verticalGap}px)` };
}

export function ActFirstMap({ patterns, objective = 'cost_impact', weightsConfig = DEFAULT_WEIGHTS, onPatternSelect, selectedPatternId }: ActFirstMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [closedPopupId, setClosedPopupId] = useState<string | null>(null);
  const [hoveredPointId, setHoveredPointId] = useState<string | null>(null);
  const [clickedPoint, setClickedPoint] = useState<MapPoint | null>(null);

  const points = useMemo(() => buildMapPoints(patterns, objective, weightsConfig), [patterns, objective, weightsConfig]);

  // Prefer the exact clicked point (handles duplicate IDs); fall back to first match for external selection.
  const selectedPoint = selectedPatternId
    ? (clickedPoint?.id === selectedPatternId ? clickedPoint : (points.find(p => p.id === selectedPatternId) ?? null))
    : null;

  useEffect(() => {
    if (!selectedPatternId) setClickedPoint(null);
  }, [selectedPatternId]);

  useEffect(() => {
    setClosedPopupId(null);
  }, [selectedPatternId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onPatternSelect?.(null);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onPatternSelect]);

  function selectPoint(point: MapPoint) {
    setClickedPoint(point);
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
          height: 320,
          borderLeft: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
          borderBottom: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
          background:
            'linear-gradient(90deg, transparent calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% + 0.5px), transparent calc(50% + 0.5px)), ' +
            'linear-gradient(0deg, transparent calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% - 0.5px), rgba(104, 112, 122, 0.28) calc(50% + 0.5px), transparent calc(50% + 0.5px))',
        }}
      >
        <QuadrantLabel label="Plan & Fund" left="6%" top="8%" tooltip="High priority but root cause is unclear or cost impact is not yet confirmed. Investigate the failure mode, assign ownership, and secure budget before committing engineering effort." />
        <QuadrantLabel label="Act Now" left="58%" top="8%" tooltip="Root cause is known and the cost impact is high. Every recurrence burns budget and degrades reliability — escalate immediately and drive to resolution." />
        <QuadrantLabel label="Deprioritize" left="6%" top="78%" tooltip="Low cost and low priority signal. No immediate action needed — continue monitoring and revisit if recurrence or severity increases." />
        <QuadrantLabel label="Quick Win" left="58%" top="78%" tooltip="High operational cost but lower urgency. Strong candidates for quick fixes, threshold tuning, or automation — high return for minimal engineering investment." />

        {points.map(point => {
          const selected = point.id === selectedPatternId;
          const hovered = point.id === hoveredPointId;
          const style = PRIORITY_STYLE[point.priority];
          const diameter = selected ? point.radius + 8 : point.radius;
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
                left: `${point.x}%`,
                bottom: `${point.y}%`,
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

        {selectedPoint && closedPopupId !== selectedPoint.id && (
          <PatternPopup
            point={selectedPoint}
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

function QuadrantLabel({ label, left, top, tooltip }: { label: string; left: string; top: string; tooltip?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'absolute', left, top, display: 'flex', alignItems: 'center', gap: 4, pointerEvents: 'none' }}>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}>
        {label}
      </span>
      {tooltip && (
        <div style={{ position: 'relative', pointerEvents: 'auto' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--dt-colors-text-neutral-subdued, #74777a)', color: 'var(--dt-colors-text-neutral-subdued, #74777a)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'help', userSelect: 'none' }}>i</div>
          {show && (
            <div style={{ position: 'absolute', top: 18, left: 0, zIndex: 20, background: 'var(--dt-colors-background-container-neutral-default, #ffffff)', border: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--dt-colors-text-neutral-default, #1f262e)', maxWidth: 240, lineHeight: 1.5, boxShadow: '0 4px 12px rgba(31,38,46,0.14)' }}>
              {tooltip}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PatternPopup({ point, onClose }: { point: MapPoint; onClose: () => void }) {
  const style = PRIORITY_STYLE[point.priority];
  const position = getSafePopupPosition(point);

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
