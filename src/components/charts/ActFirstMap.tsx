import React, { useMemo } from 'react';
import { Button } from '@dynatrace/strato-components/buttons';
import { XYChart } from '@dynatrace/strato-components/charts';
import { PatternRow, DisplayLevel } from '../../types/views';

interface ActFirstMapProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
  selectedPatternId?: string | null;
}

type MapPoint = {
  id: string;
  name: string;
  cost: number;
  blastRadius: number;
  severity: DisplayLevel;
  priority: string;
  recurrenceCount: number;
  openProblemCount: number;
  selectedCost: number | null;
  selectedBlastRadius: number | null;
};

const SEVERITY_COLOR: Record<DisplayLevel, string> = {
  High: 'var(--dt-colors-text-critical-default, #e84626)',
  Medium: 'var(--dt-colors-text-warning-default, #f5a623)',
  Low: 'var(--dt-colors-text-success-default, #2ab06f)',
};

function parseCost(costFormatted: string): number {
  const s = costFormatted.trim().replace(/^\$/, '');
  if (s.endsWith('K')) return parseFloat(s) * 1000;
  if (s.endsWith('M')) return parseFloat(s) * 1_000_000;
  return parseFloat(s) || 0;
}

function fmtCost(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
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
  const data = useMemo<MapPoint[]>(
    () => patterns.map(pattern => {
      const cost = parseCost(pattern.costFormatted);
      return {
        id: pattern.id,
        name: pattern.name,
        cost,
        blastRadius: pattern.blastRadius,
        severity: pattern.severity,
        priority: pattern.priority,
        recurrenceCount: pattern.recurrenceCount,
        openProblemCount: pattern.openProblemCount,
        selectedCost: pattern.id === selectedPatternId ? cost : null,
        selectedBlastRadius: pattern.id === selectedPatternId ? pattern.blastRadius : null,
      };
    }),
    [patterns, selectedPatternId],
  );

  if (patterns.length === 0) {
    return (
      <XYChart data={[]} height={220}>
        <XYChart.EmptyState>No patterns to display</XYChart.EmptyState>
      </XYChart>
    );
  }

  return (
    <XYChart data={data} height={280} colorPalette="categorical">
      <XYChart.XAxis
        id="cost-axis"
        type="numerical"
        position="bottom"
        label="Estimated cost"
        formatter={(value) => fmtCost(value)}
        allowDecimals={false}
      />
      <XYChart.YAxis
        id="blast-axis"
        type="numerical"
        position="left"
        label="Blast radius"
        allowDecimals={false}
      />
      <XYChart.DotSeries
        xAxisId="cost-axis"
        yAxisId="blast-axis"
        x0Accessor="cost"
        y0Accessor="blastRadius"
        seriesIdAccessor="id"
        nameAccessor="name"
        color={(point) => SEVERITY_COLOR[(point.severity as DisplayLevel) || 'Low']}
        actions={(point) => actionButton(String(point.id), onPatternSelect)}
      />
      <XYChart.DotSeries
        data={data.filter(point => point.id === selectedPatternId)}
        xAxisId="cost-axis"
        yAxisId="blast-axis"
        x0Accessor="selectedCost"
        y0Accessor="selectedBlastRadius"
        seriesIdAccessor="id"
        nameAccessor="name"
        color="var(--dt-colors-border-primary-default, #1496ff)"
        shape="diamond"
        actions={(point) => actionButton(String(point.id), onPatternSelect)}
      />
      <XYChart.Tooltip />
      <XYChart.Legend position="bottom" />
    </XYChart>
  );
}

export default ActFirstMap;
