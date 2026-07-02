import React, { useMemo } from 'react';
import { Button } from '@dynatrace/strato-components/buttons';
import { XYChart } from '@dynatrace/strato-components/charts';
import { PatternRow, TrendDirection } from '../../types/views';

interface ReliabilityRiskMatrixProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
  selectedPatternId?: string | null;
}

type RiskMarker = {
  id: string;
  name: string;
  recurrenceCount: number;
  blastRadius: number;
  trend: TrendDirection;
  trendValue: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};

function normalize(value: number, values: number[], fallback: number): number {
  const finiteValues = values.filter(Number.isFinite);
  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  if (!finiteValues.length || min === max) return fallback;
  return 12 + ((value - min) / (max - min)) * 76;
}

function trendValue(trend: TrendDirection): number {
  return trend === 'Increasing' ? 3 : trend === 'Stable' ? 2 : 1;
}

function selectAction(id: string, onPatternSelect?: (id: string) => void) {
  if (!onPatternSelect) return <></>;
  return (
    <Button variant="accent" onClick={() => onPatternSelect(id)}>
      Select risk
    </Button>
  );
}

export function ReliabilityRiskMatrix({ patterns, onPatternSelect, selectedPatternId }: ReliabilityRiskMatrixProps) {
  const data = useMemo<RiskMarker[]>(() => {
    const recurrences = patterns.map(pattern => pattern.recurrenceCount);
    const impacts = patterns.map(pattern => pattern.blastRadius);

    return patterns.map(pattern => {
      const x = normalize(pattern.recurrenceCount, recurrences, 70);
      const y = normalize(pattern.blastRadius, impacts, 70);
      const halfSize = pattern.id === selectedPatternId ? 2.8 : 2.2;

      return {
        id: pattern.id,
        name: pattern.name,
        recurrenceCount: pattern.recurrenceCount,
        blastRadius: pattern.blastRadius,
        trend: pattern.trend,
        trendValue: trendValue(pattern.trend),
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
        <XYChart.EmptyState>No reliability risks to display</XYChart.EmptyState>
      </XYChart>
    );
  }

  return (
    <XYChart data={data} height={320} colorPalette="red-green-inverted">
      <XYChart.XAxis
        id="recurrence-axis"
        type="numerical"
        position="bottom"
        label="Relative recurrence"
        min={0}
        max={100}
        formatter={(value) => `${Math.round(value)}%`}
        allowDecimals={false}
      />
      <XYChart.YAxis
        id="impact-axis"
        type="numerical"
        position="left"
        label="Relative reliability impact"
        min={0}
        max={100}
        formatter={(value) => `${Math.round(value)}%`}
        allowDecimals={false}
      />
      <XYChart.RectSeries
        xAxisId="recurrence-axis"
        yAxisId="impact-axis"
        x0Accessor="x0"
        x1Accessor="x1"
        y0Accessor="y0"
        y1Accessor="y1"
        valueAccessor="trendValue"
        valueAccessorLabel="Trend"
        valueMin={1}
        valueMax={3}
        actions={(point) => selectAction(String(point.id), onPatternSelect)}
      />
      <XYChart.RectSeries
        data={selectedData}
        xAxisId="recurrence-axis"
        yAxisId="impact-axis"
        x0Accessor="x0"
        x1Accessor="x1"
        y0Accessor="y0"
        y1Accessor="y1"
        valueAccessor="trendValue"
        valueAccessorLabel="Selected risk"
        valueMin={1}
        valueMax={3}
        colorPalette="blue"
        actions={(point) => selectAction(String(point.id), onPatternSelect)}
      />
      <XYChart.Tooltip />
      <XYChart.Legend position="bottom" />
    </XYChart>
  );
}

export default ReliabilityRiskMatrix;
