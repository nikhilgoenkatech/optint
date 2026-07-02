import React, { useMemo } from 'react';
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
      };
    });
  }, [patterns]);

  const selectedData = useMemo(
    () => data.filter(point => point.id === selectedPatternId),
    [data, selectedPatternId],
  );

  if (patterns.length === 0) {
    return (
      <XYChart data={[]} height={380}>
        <XYChart.EmptyState>No patterns to display</XYChart.EmptyState>
      </XYChart>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
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
    </div>
  );
}

export default ActFirstMap;
