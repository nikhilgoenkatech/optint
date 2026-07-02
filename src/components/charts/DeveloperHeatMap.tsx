import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PatternRow } from '../../types/views';

interface DeveloperHeatMapProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
  selectedPatternId?: string | null;
}

type HeatLevel = 'High' | 'Medium' | 'Low';

type HeatTile = {
  id: string;
  service: string;
  category: string;
  recurrenceCount: number;
  trend: string;
  confidence: HeatLevel;
  level: HeatLevel;
  rowIndex: number;
  colIndex: number;
};

const CATEGORIES = ['AVAILABILITY', 'ERROR', 'PERFORMANCE', 'RESOURCE_CONTENTION', 'CUSTOM_ALERT', 'UNKNOWN'];
const POPUP_WIDTH = 260;

const HEAT_STYLE: Record<HeatLevel, { border: string; background: string; text: string; glow: string }> = {
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

function heatLevel(pattern: PatternRow): HeatLevel {
  if (pattern.severity === 'High' || pattern.recurrenceCount >= 5) return 'High';
  if (pattern.severity === 'Medium' || pattern.recurrenceCount >= 2) return 'Medium';
  return 'Low';
}

function confidenceLevel(pattern: PatternRow): HeatLevel {
  if (pattern.evidenceQuality === 'High') return 'Low';
  if (pattern.evidenceQuality === 'Medium') return 'Medium';
  return 'High';
}

function buildTiles(patterns: PatternRow[]): HeatTile[] {
  return patterns.map((pattern, index) => {
    const service = pattern.affectedServices[0] || 'Unscoped service';
    const category = CATEGORIES.includes(String(pattern.category)) ? String(pattern.category) : 'UNKNOWN';
    return {
      id: pattern.id,
      service,
      category,
      recurrenceCount: pattern.recurrenceCount,
      trend: pattern.trend,
      confidence: confidenceLevel(pattern),
      level: heatLevel(pattern),
      rowIndex: index,
      colIndex: CATEGORIES.indexOf(category),
    };
  });
}

function getSafePopupPosition(tile: HeatTile, rowCount: number) {
  const colCenter = 180 + (tile.colIndex + 0.5) * ((1000 - 180) / CATEGORIES.length);
  const left = `clamp(8px, calc(${colCenter / 10}% - ${POPUP_WIDTH / 2}px), calc(100% - ${POPUP_WIDTH + 8}px))`;
  const rowHeight = 46;
  const y = 44 + tile.rowIndex * rowHeight;
  const showAbove = tile.rowIndex > Math.max(1, rowCount - 3);
  return showAbove
    ? { left, bottom: `calc(100% - ${Math.max(52, y)}px)` }
    : { left, top: `${y + 36}px` };
}

export function DeveloperHeatMap({ patterns, onPatternSelect, selectedPatternId }: DeveloperHeatMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [closedPopupId, setClosedPopupId] = useState<string | null>(null);
  const tiles = useMemo(() => buildTiles(patterns), [patterns]);
  const selectedTile = tiles.find(tile => tile.id === selectedPatternId) ?? null;

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
      if (event.key === 'Escape') setClosedPopupId(selectedPatternId ?? null);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [selectedPatternId]);

  if (patterns.length === 0 || tiles.length === 0) {
    return <div style={{ minHeight: 320, display: 'grid', placeItems: 'center' }}>No service patterns to display</div>;
  }

  return (
    <div ref={mapRef} style={{ position: 'relative', minHeight: 360, padding: '14px 0 36px' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `180px repeat(${CATEGORIES.length}, minmax(86px, 1fr))`,
          gap: 6,
          alignItems: 'stretch',
        }}
      >
        <div />
        {CATEGORIES.map(category => (
          <HeaderCell key={category}>{category.replace('_', ' ')}</HeaderCell>
        ))}
        {tiles.map(tile => {
          const selected = tile.id === selectedPatternId;
          const style = HEAT_STYLE[tile.level];
          return (
            <React.Fragment key={`${tile.id}-${tile.service}`}>
              <div style={{ fontSize: 12, fontWeight: 700, padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {tile.service}
              </div>
              {CATEGORIES.map(category => {
                const active = category === tile.category;
                return (
                  <button
                    key={`${tile.id}-${category}`}
                    type="button"
                    disabled={!active}
                    aria-label={active ? `Select ${tile.service} ${tile.category}` : `${tile.service} no ${category} pattern`}
                    aria-pressed={active && selected}
                    onClick={() => {
                      if (!active) return;
                      setClosedPopupId(null);
                      onPatternSelect?.(tile.id);
                    }}
                    style={{
                      minHeight: 34,
                      borderRadius: 6,
                      border: active ? (selected ? `2px solid ${style.border}` : `1px solid ${style.border}`) : '1px solid var(--dt-colors-border-neutral-subdued, #e7e9ec)',
                      background: active ? style.background : 'var(--dt-colors-background-container-neutral-subdued, #f7f8fa)',
                      boxShadow: active && selected ? `0 0 0 4px ${style.glow}` : 'none',
                      color: active ? style.text : 'transparent',
                      cursor: active ? 'pointer' : 'default',
                      opacity: active ? 1 : 0.55,
                      fontWeight: 700,
                    }}
                  >
                    {active ? tile.recurrenceCount : ''}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      {selectedTile && closedPopupId !== selectedTile.id && (
        <HeatPopup
          tile={selectedTile}
          rowCount={tiles.length}
          onClose={() => setClosedPopupId(selectedTile.id)}
        />
      )}
      <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12, color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}>
        <LegendItem level="High" label="High recurrence or concern" />
        <LegendItem level="Medium" label="Medium" />
        <LegendItem level="Low" label="Lower concern" />
      </div>
    </div>
  );
}

function HeatPopup({ tile, rowCount, onClose }: { tile: HeatTile; rowCount: number; onClose: () => void }) {
  const style = HEAT_STYLE[tile.level];
  const position = getSafePopupPosition(tile, rowCount);
  return (
    <div
      role="dialog"
      aria-label={`${tile.service} developer pattern summary`}
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
        <div style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{tile.service}</div>
        <PriorityBadge level={tile.level} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <PopupStat label="Failure type" value={tile.category} />
        <PopupStat label="Occurrences" value={tile.recurrenceCount} />
        <PopupStat label="Trend" value={tile.trend} />
        <PopupStat label="Evidence concern" value={tile.confidence} />
      </div>
    </div>
  );
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--dt-colors-text-neutral-subdued, #74777a)', textTransform: 'uppercase', padding: '8px 6px', textAlign: 'center' }}>{children}</div>;
}

function PriorityBadge({ level }: { level: HeatLevel }) {
  const style = HEAT_STYLE[level];
  return <span style={{ color: style.text, border: `1px solid ${style.border}`, background: style.background, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{level}</span>;
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

function LegendItem({ level, label }: { level: HeatLevel; label: string }) {
  const style = HEAT_STYLE[level];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: style.border }} />
      {label}
    </span>
  );
}

export default DeveloperHeatMap;
