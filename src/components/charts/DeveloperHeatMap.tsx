import React, { useMemo } from 'react';
import { Button } from '@dynatrace/strato-components/buttons';
import { XYChart } from '@dynatrace/strato-components/charts';
import { PatternRow } from '../../types/views';

interface DeveloperHeatMapProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
  selectedPatternId?: string | null;
}

type HeatCell = {
  id: string;
  name: string;
  service: string;
  patternIndex: number;
  serviceIndex: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  recurrence: number;
};

function selectAction(id: string, onPatternSelect?: (id: string) => void) {
  if (!onPatternSelect) return <></>;
  return (
    <Button variant="accent" onClick={() => onPatternSelect(id)}>
      Select service pattern
    </Button>
  );
}

function labelForIndex(labels: string[], value: number): string {
  const index = Math.max(0, Math.min(labels.length - 1, Math.floor(value)));
  const label = labels[index] ?? '';
  return label.length > 18 ? `${label.slice(0, 17)}...` : label;
}

export function DeveloperHeatMap({ patterns, onPatternSelect, selectedPatternId }: DeveloperHeatMapProps) {
  const services = useMemo(() => {
    const serviceSet = new Set<string>();
    patterns.forEach(pattern => {
      if (pattern.affectedServices.length === 0) {
        serviceSet.add('Unscoped service');
      } else {
        pattern.affectedServices.forEach(service => serviceSet.add(service));
      }
    });
    return Array.from(serviceSet);
  }, [patterns]);

  const cells = useMemo<HeatCell[]>(() => {
    return patterns.flatMap((pattern, patternIndex) => {
      const affectedServices = pattern.affectedServices.length > 0
        ? pattern.affectedServices
        : ['Unscoped service'];

      return affectedServices.map(service => {
        const serviceIndex = Math.max(0, services.indexOf(service));
        return {
          id: pattern.id,
          name: pattern.name,
          service,
          patternIndex,
          serviceIndex,
          x0: patternIndex,
          x1: patternIndex + 0.86,
          y0: serviceIndex,
          y1: serviceIndex + 0.86,
          recurrence: Math.max(1, pattern.recurrenceCount),
        };
      });
    });
  }, [patterns, services]);

  const selectedCells = useMemo(
    () => cells.filter(cell => cell.id === selectedPatternId),
    [cells, selectedPatternId],
  );

  const height = Math.max(240, Math.min(460, services.length * 34 + 130));
  const maxRecurrence = Math.max(1, ...cells.map(cell => cell.recurrence));

  if (patterns.length === 0 || services.length === 0) {
    return (
      <XYChart data={[]} height={220}>
        <XYChart.EmptyState>No service patterns to display</XYChart.EmptyState>
      </XYChart>
    );
  }

  return (
    <XYChart data={cells} height={height} colorPalette="red">
      <XYChart.XAxis
        id="pattern-axis"
        type="numerical"
        position="bottom"
        label="Recurring patterns"
        min={0}
        max={Math.max(1, patterns.length)}
        formatter={(value) => labelForIndex(patterns.map(pattern => pattern.name), value)}
        allowDecimals={false}
      />
      <XYChart.YAxis
        id="service-axis"
        type="numerical"
        position="left"
        label="Affected service"
        min={0}
        max={Math.max(1, services.length)}
        formatter={(value) => labelForIndex(services, value)}
        allowDecimals={false}
      />
      <XYChart.RectSeries
        xAxisId="pattern-axis"
        yAxisId="service-axis"
        x0Accessor="x0"
        x1Accessor="x1"
        y0Accessor="y0"
        y1Accessor="y1"
        valueAccessor="recurrence"
        valueAccessorLabel="Recurrences"
        valueMin={1}
        valueMax={maxRecurrence}
        actions={(cell) => selectAction(String(cell.id), onPatternSelect)}
      />
      <XYChart.RectSeries
        data={selectedCells}
        xAxisId="pattern-axis"
        yAxisId="service-axis"
        x0Accessor="x0"
        x1Accessor="x1"
        y0Accessor="y0"
        y1Accessor="y1"
        valueAccessor="recurrence"
        valueAccessorLabel="Selected"
        valueMin={1}
        valueMax={maxRecurrence}
        colorPalette="blue"
        actions={(cell) => selectAction(String(cell.id), onPatternSelect)}
      />
      <XYChart.Tooltip />
      <XYChart.Legend position="bottom" />
    </XYChart>
  );
}

export default DeveloperHeatMap;
