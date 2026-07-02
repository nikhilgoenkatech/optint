import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@dynatrace/strato-components/buttons';
import { XYChart } from '@dynatrace/strato-components/charts';
import { PatternRow } from '../../types/views';

interface ActFirstMapProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
  selectedPatternId?: string | null;
}

type MapMarker = {
  id: string;
  name: string;
  cost: number;
  costLabel: string;
  blastRadius: number;
  severityValue: number;
  recurrenceCount: number;
  openProblemCount: number;
  x0: number;
  y0: number;
  xPct: number;
  yPct: number;
};

function parseCost(costFormatted: string): number {
  const s = costFormatted.trim().replace(/^\$/, '');
  if (s.endsWith('K')) return parseFloat(s) * 1000;
  if (s.endsWith('M')) return parseFloat(s) * 1_000_000;
  return parseFloat(s) || 0;
}

function normalize(value: number, values: number[], fallback: number): number {
  const finiteValues = values.filter(Number.isFinite);
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  if (!finiteValues.length || min === max) return fallback;
  return 10 + ((value - min) / (max - min)) * 80;
}

function severityValue(pattern: PatternRow): number {
  return pattern.severity === 'High' ? 3 : pattern.severity === 'Medium' ? 2 : 1;
}

function actionButton(id: string, onPatternSelect?: (id: string) => void) {
  if (!onPatternSelect) return <></>;
  return (
    <Button variant="accent" onClick={() => onPatternSelect(id)}>
      Investigate
    </Button>
  );
}

// Quadrant label overlay — positioned over the chart SVG using absolute CSS
const QUADRANT_LABELS = [
  { label: 'Plan & Fund',   left: '5%',  top: '5%'  },
  { label: 'Act Now',       left: '55%', top: '5%'  },
  { label: 'Deprioritize',  left: '5%',  top: '55%' },
  { label: 'Quick Win',     left: '55%', top: '55%' },
];

export function ActFirstMap({ patterns, onPatternSelect, selectedPatternId }: ActFirstMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [closedPopupId, setClosedPopupId] = useState<string | null>(null);

  const data = useMemo<MapMarker[]>(() => {
    const costs = patterns.map(pattern => parseCost(pattern.costFormatted));
    const impacts = patterns.map(pattern => pattern.blastRadius);

    return patterns.map(pattern => {
      const cost = parseCost(pattern.costFormatted);
      const x = normalize(cost, costs, 55);
      const y = normalize(pattern.blastRadius, impacts, 55);

      return {
        id: pattern.id,
        name: pattern.name,
        cost,
        costLabel: pattern.costFormatted,
        blastRadius: pattern.blastRadius,
        severityValue: severityValue(pattern),
        recurrenceCount: pattern.recurrenceCount,
        openProblemCount: pattern.openProblemCount,
        x0: x,
        y0: y,
        xPct: x,
        yPct: y,
      };
    });
  }, [patterns]);

  const selectedData = useMemo(
    () => data.filter(point => point.id === selectedPatternId),
    [data, selectedPatternId],
  );
  const selectedPoint = selectedData[0] ?? null;

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

  function selectPattern(id: string) {
    setClosedPopupId(null);
    onPatternSelect?.(id);
  }

  if (patterns.length === 0) {
    return (
      <XYChart data={[]} height={380}>
        <XYChart.EmptyState>No patterns to display</XYChart.EmptyState>
      </XYChart>
    );
  }

  return (
    <div ref={mapRef} style={{ position: 'relative' }}>
      {/* Quadrant labels */}
      {QUADRANT_LABELS.map(q => (
        <div
          key={q.label}
          style={{
            position: 'absolute',
            left: q.left,
            top: q.top,
            zIndex: 1,
            pointerEvents: 'none',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--dt-colors-text-neutral-subdued, #74777a)',
            opacity: 0.7,
          }}
        >
          {q.label}
        </div>
      ))}
      <XYChart data={data} height={380} colorPalette="red-green-inverted">
        <XYChart.XAxis
          id="cost-axis"
          type="numerical"
          position="bottom"
          label="Cost impact →"
          min={0}
          max={100}
          formatter={(value) => value === 0 ? 'Low' : value === 50 ? 'Medium' : value === 100 ? 'High' : ''}
          allowDecimals={false}
        />
        <XYChart.YAxis
          id="impact-axis"
          type="numerical"
          position="left"
          label="Blast radius →"
          min={0}
          max={100}
          formatter={(value) => value === 0 ? 'Contained' : value === 50 ? 'Moderate' : value === 100 ? 'Widespread' : ''}
          allowDecimals={false}
        />
        <XYChart.DotSeries
          xAxisId="cost-axis"
          yAxisId="impact-axis"
          x0Accessor="x0"
          y0Accessor="y0"
          nameAccessor="name"
          seriesIdAccessor="id"
          shape="circle"
          actions={(point) => actionButton(String(point.id), onPatternSelect)}
        />
        {selectedData.length > 0 && (
          <XYChart.DotSeries
            data={selectedData}
            xAxisId="cost-axis"
            yAxisId="impact-axis"
            x0Accessor="x0"
            y0Accessor="y0"
            nameAccessor="name"
            seriesIdAccessor="id"
            shape="circle"
            colorPalette="blue"
            actions={(point) => actionButton(String(point.id), onPatternSelect)}
          />
        )}
        <XYChart.Tooltip />
        <XYChart.Legend position="bottom" />
      </XYChart>
      {data.map((point) => {
        const selected = point.id === selectedPatternId;
        const size = selected ? 18 : 14;
        return (
          <button
            key={point.id}
            type="button"
            aria-label={`Select ${point.name}`}
            aria-pressed={selected}
            onClick={() => selectPattern(point.id)}
            style={{
              position: 'absolute',
              left: `${point.xPct}%`,
              bottom: `${point.yPct}%`,
              width: size,
              height: size,
              transform: 'translate(-50%, 50%)',
              borderRadius: '999px',
              border: selected
                ? '2px solid var(--dt-colors-border-primary-default, #1496ff)'
                : '1px solid transparent',
              background: 'transparent',
              cursor: onPatternSelect ? 'pointer' : 'default',
              zIndex: 3,
              padding: 0,
              boxShadow: selected ? '0 0 0 4px rgba(20, 150, 255, 0.16)' : undefined,
            }}
          />
        );
      })}
      {selectedPoint && closedPopupId !== selectedPoint.id && (
        <div
          role="dialog"
          aria-label={`${selectedPoint.name} pattern summary`}
          style={{
            position: 'absolute',
            left: `${selectedPoint.xPct}%`,
            top: selectedPoint.yPct > 62 ? 'auto' : `${100 - selectedPoint.yPct}%`,
            bottom: selectedPoint.yPct > 62 ? `${selectedPoint.yPct}%` : 'auto',
            transform: selectedPoint.xPct > 72
              ? 'translate(-92%, 12px)'
              : selectedPoint.xPct < 28
                ? 'translate(-8%, 12px)'
                : 'translate(-50%, 12px)',
            width: 248,
            padding: 12,
            border: '1px solid var(--dt-colors-border-neutral-default, #d5d8dc)',
            borderRadius: 8,
            background: 'var(--dt-colors-background-container-neutral-default, #ffffff)',
            boxShadow: '0 16px 40px rgba(31, 38, 46, 0.18)',
            zIndex: 4,
          }}
        >
          <button
            type="button"
            aria-label="Close pattern popup"
            onClick={(event) => {
              event.stopPropagation();
              setClosedPopupId(selectedPoint.id);
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
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              {selectedPoint.name}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <PopupStat label="Exposure" value={selectedPoint.costLabel} />
              <PopupStat label="Blast radius" value={selectedPoint.blastRadius} />
              <PopupStat label="Occurrences" value={selectedPoint.recurrenceCount} />
              <PopupStat label="Open incidents" value={selectedPoint.openProblemCount} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActFirstMap;

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
