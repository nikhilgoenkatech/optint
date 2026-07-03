import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PatternRow, DisplayLevel } from '../../types/views';

interface ActFirstMapProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
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

function parseCost(costFormatted: string): number {
  const s = costFormatted.trim().replace(/^\$/, '');
  if (s.endsWith('K')) return parseFloat(s) * 1000;
  if (s.endsWith('M')) return parseFloat(s) * 1_000_000;
  return parseFloat(s) || 0;
}

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

function buildMapPoints(patterns: PatternRow[]): MapPoint[] {
  const costs = patterns.map(pattern => parseCost(pattern.costFormatted));
  const impacts = patterns.map(pattern => pattern.blastRadius);
  const recurrences = patterns.map(pattern => pattern.recurrenceCount);

  return patterns.map(pattern => {
    const cost = parseCost(pattern.costFormatted);
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
      y: normalize(pattern.blastRadius, impacts, 72),
      radius: bubbleRadius(pattern.recurrenceCount, recurrences),
    };
  });
}

function getSafePopupPosition(point: MapPoint): PopupPosition {
  const inset = 8;
  const left = `clamp(${inset}px, calc(${point.x}% - ${POPUP_WIDTH / 2}px), calc(100% - ${POPUP_WIDTH + inset}px))`;
  const verticalGap = point.radius + POPUP_GAP;

  if (point.y > 64) {
    return {
      left,
      top: `calc(${100 - point.y}% + ${verticalGap}px)`,
    };
  }

  if (point.y < 30) {
    return {
      left,
      bottom: `calc(${point.y}% + ${verticalGap}px)`,
    };
  }

  return {
    left,
    top: `calc(${100 - point.y}% + ${verticalGap}px)`,
  };
}

export function ActFirstMap({ patterns, onPatternSelect, selectedPatternId }: ActFirstMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [closedPopupId, setClosedPopupId] = useState<string | null>(null);

  const points = useMemo(() => buildMapPoints(patterns), [patterns]);
  const selectedPoint = useMemo(
    () => points.find(point => point.id === selectedPatternId) ?? null,
    [points, selectedPatternId],
  );

  useEffect(() => {
    setClosedPopupId(null);
  }, [selectedPatternId]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!mapRef.current?.contains(event.target as Node)) {
        setClosedPopupId(selectedPatternId ?? null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setClosedPopupId(selectedPatternId ?? null);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedPatternId]);

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
          const style = PRIORITY_STYLE[point.priority];
          const diameter = selected ? point.radius + 8 : point.radius;
          return (
            <button
              key={point.id}
              type="button"
              aria-label={`Select ${point.name}`}
              aria-pressed={selected}
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
                zIndex: selected ? 4 : 3,
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
        Lower remediation effort -&gt;
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
        Higher business impact -&gt;
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
