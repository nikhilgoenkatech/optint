import React, { useMemo } from 'react';
import { Button } from '@dynatrace/strato-components/buttons';
import { XYChart } from '@dynatrace/strato-components/charts';
import { PatternRow, TrendDirection } from '../../types/views';

interface ReliabilityRiskMatrixProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
  selectedPatternId?: string | null;
}

type RiskPoint = {
  id: string;
  name: string;
  recurrenceCount: number;
  blastRadius: number;
  trend: TrendDirection;
};

const TREND_COLOR: Record<TrendDirection, string> = {
  Increasing: 'var(--dt-colors-text-critical-default, #e84626)',
  Stable: 'var(--dt-colors-text-warning-default, #f5a623)',
  Decreasing: 'var(--dt-colors-text-success-default, #2ab06f)',
};

function selectAction(id: string, onPatternSelect?: (id: string) => void) {
  if (!onPatternSelect) return <></>;
  return (
    <Button variant="accent" onClick={() => onPatternSelect(id)}>
      Select risk
    </Button>
  );
}

export function ReliabilityRiskMatrix({ patterns, onPatternSelect, selectedPatternId }: ReliabilityRiskMatrixProps) {
  const data = useMemo<RiskPoint[]>(
    () => patterns.map(pattern => ({
      id: pattern.id,
      name: pattern.name,
      recurrenceCount: pattern.recurrenceCount,
      blastRadius: pattern.blastRadius,
      trend: pattern.trend,
    })),
    [patterns],
  );

  if (patterns.length === 0) {
    return (
      <XYChart data={[]} height={220}>
        <XYChart.EmptyState>No reliability risks to display</XYChart.EmptyState>
      </XYChart>
    );
  }

  return (
    <XYChart data={data} height={280} colorPalette="categorical">
      <XYChart.XAxis
        id="recurrence-axis"
        type="numerical"
        position="bottom"
        label="Recurrences"
        allowDecimals={false}
      />
      <XYChart.YAxis
        id="impact-axis"
        type="numerical"
        position="left"
        label="Reliability impact"
        allowDecimals={false}
      />
      <XYChart.DotSeries
        xAxisId="recurrence-axis"
        yAxisId="impact-axis"
        x0Accessor="recurrenceCount"
        y0Accessor="blastRadius"
        seriesIdAccessor="id"
        nameAccessor="name"
        color={(point) => TREND_COLOR[(point.trend as TrendDirection) || 'Stable']}
        actions={(point) => selectAction(String(point.id), onPatternSelect)}
      />
      <XYChart.DotSeries
        data={data.filter(point => point.id === selectedPatternId)}
        xAxisId="recurrence-axis"
        yAxisId="impact-axis"
        x0Accessor="recurrenceCount"
        y0Accessor="blastRadius"
        seriesIdAccessor="id"
        nameAccessor="name"
        color="var(--dt-colors-border-primary-default, #1496ff)"
        shape="diamond"
        actions={(point) => selectAction(String(point.id), onPatternSelect)}
      />
      <XYChart.Tooltip />
      <XYChart.Legend position="bottom" />
    </XYChart>
  );
}

export default ReliabilityRiskMatrix;
