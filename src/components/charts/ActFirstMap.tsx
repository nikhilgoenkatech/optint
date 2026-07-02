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
  x1: number;
  y0: number;
  y1: number;
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
  return 12 + ((value - min) / (max - min)) * 76;
}

function severityValue(pattern: PatternRow): number {
  return pattern.severity === 'High' ? 3 : pattern.severity === 'Medium' ? 2 : 1;
}

function actionButton(id: string, onPatternSelect?: (id: string) => void) {
  if (!onPatternSelect) return <></>;
  return (
    <Button variant="accent" onClick={() => onPatternSelect(id)}>
      Select pattern
    </Button>
  );
}

export function ActFirstMap({ patterns, onPatternSelect, selectedPatternId }: ActFirstMapProps) {
  const data = useMemo<MapMarker[]>(() => {
    const costs = patterns.map(pattern => parseCost(pattern.costFormatted));
    const impacts = patterns.map(pattern => pattern.blastRadius);

    return patterns.map(pattern => {
      const cost = parseCost(pattern.costFormatted);
      const x = normalize(cost, costs, 72);
      const y = normalize(pattern.blastRadius, impacts, 72);
      const halfSize = pattern.id === selectedPatternId ? 2.8 : 2.2;

      return {
        id: pattern.id,
        name: pattern.name,
        cost,
        costLabel: pattern.costFormatted,
        blastRadius: pattern.blastRadius,
        severityValue: severityValue(pattern),
        recurrenceCount: pattern.recurrenceCount,
        openProblemCount: pattern.openProblemCount,
        x0: Math.max(0, x - halfSize),
        x1: Math.min(100, x + halfSize),
        y0: Math.max(0, y - halfSize),
        y1: Math.min(100, y + halfSize),
      };
    });
  }, [patterns, selectedPatternId]);

  const selectedData = useMemo(
    () => data.filter(point => point.id === selectedPatternId),
    [data, selectedPatternId],
  );

  if (patterns.length === 0) {
    return (
      <XYChart data={[]} height={260}>
        <XYChart.EmptyState>No patterns to display</XYChart.EmptyState>
      </XYChart>
    );
  }

  return (
    <XYChart data={data} height={320} colorPalette="red-green-inverted">
      <XYChart.XAxis
        id="cost-axis"
        type="numerical"
        position="bottom"
        label="Relative cost impact"
        min={0}
        max={100}
        formatter={(value) => `${Math.round(value)}%`}
        allowDecimals={false}
      />
      <XYChart.YAxis
        id="impact-axis"
        type="numerical"
        position="left"
        label="Relative blast radius"
        min={0}
        max={100}
        formatter={(value) => `${Math.round(value)}%`}
        allowDecimals={false}
      />
      <XYChart.RectSeries
        xAxisId="cost-axis"
        yAxisId="impact-axis"
        x0Accessor="x0"
        x1Accessor="x1"
        y0Accessor="y0"
        y1Accessor="y1"
        valueAccessor="severityValue"
        valueAccessorLabel="Severity"
        valueMin={1}
        valueMax={3}
        actions={(point) => actionButton(String(point.id), onPatternSelect)}
      />
      <XYChart.RectSeries
        data={selectedData}
        xAxisId="cost-axis"
        yAxisId="impact-axis"
        x0Accessor="x0"
        x1Accessor="x1"
        y0Accessor="y0"
        y1Accessor="y1"
        valueAccessor="severityValue"
        valueAccessorLabel="Selected pattern"
        valueMin={1}
        valueMax={3}
        colorPalette="blue"
        actions={(point) => actionButton(String(point.id), onPatternSelect)}
      />
      <XYChart.Tooltip />
      <XYChart.Legend position="bottom" />
    </XYChart>
  );
}

export default ActFirstMap;
