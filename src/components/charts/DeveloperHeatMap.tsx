import React, { useMemo } from 'react';
import { Button } from '@dynatrace/strato-components/buttons';
import { HoneycombChart } from '@dynatrace/strato-components/charts';
import { PatternRow } from '../../types/views';

interface DeveloperHeatMapProps {
  patterns: PatternRow[];
  onPatternSelect?: (id: string) => void;
  selectedPatternId?: string | null;
}

type HeatTile = {
  id: string;
  name: string;
  value: number;
  service: string;
  category: string;
  selected: string;
};

function selectAction(id: string, onPatternSelect?: (id: string) => void) {
  if (!onPatternSelect) return <></>;
  return (
    <Button variant="accent" onClick={() => onPatternSelect(id)}>
      Select service pattern
    </Button>
  );
}

function shortLabel(value: string): string {
  return value.length > 28 ? `${value.slice(0, 27)}...` : value;
}

export function DeveloperHeatMap({ patterns, onPatternSelect, selectedPatternId }: DeveloperHeatMapProps) {
  const tiles = useMemo<HeatTile[]>(() => {
    return patterns.flatMap(pattern => {
      const services = pattern.affectedServices.length > 0
        ? pattern.affectedServices
        : ['Unscoped service'];

      return services.map(service => ({
        id: pattern.id,
        name: shortLabel(`${service} · ${pattern.category}`),
        value: Math.max(1, pattern.recurrenceCount),
        service,
        category: pattern.category,
        selected: pattern.id === selectedPatternId ? 'Selected' : 'Not selected',
      }));
    });
  }, [patterns, selectedPatternId]);

  const maxValue = Math.max(1, ...tiles.map(tile => tile.value));

  if (patterns.length === 0 || tiles.length === 0) {
    return (
      <HoneycombChart data={[]} height={260}>
        <HoneycombChart.EmptyState>No service patterns to display</HoneycombChart.EmptyState>
      </HoneycombChart>
    );
  }

  return (
    <HoneycombChart
      data={tiles}
      height={320}
      shape="square"
      labelsDisplay="name"
      textSize="auto"
      min={1}
      max={maxValue}
      colorPalette="red"
      seriesActions={(tile) => selectAction(String(tile.id), onPatternSelect)}
    >
      <HoneycombChart.Tooltip />
      <HoneycombChart.Legend position="bottom" />
    </HoneycombChart>
  );
}

export default DeveloperHeatMap;
