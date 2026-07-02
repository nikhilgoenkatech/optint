import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, DeveloperKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleDeveloperKPIs } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
import { DeveloperKpiRow } from '../kpis/DeveloperKpiRow';
import { DeveloperHeatMap } from '../charts/DeveloperHeatMap';
import { PatternTable } from '../table/PatternTable';
import { PatternDetailPanel } from '../panels/PatternDetailPanel';

interface DeveloperViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  onPatternSelect?: (id: string | null) => void;
  viewModel?: WorkspaceViewModel<DeveloperKPIs>;
}

export function DeveloperView({ objective, onObjectiveChange, onPatternSelect, viewModel }: DeveloperViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const kpis = viewModel?.kpis ?? sampleDeveloperKPIs;
  const selectedPattern = viewModel?.selectedPattern ?? null;
  const loading = false;

  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center">
        <ProgressCircle />
      </Flex>
    );
  }

  return (
    <Flex style={{ height: '100%', overflow: 'hidden' }}>
      <Flex flexDirection="column" gap={16} padding={24} style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <Flex justifyContent="space-between" alignItems="center">
          <Heading level={2}>Developer View</Heading>
          <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
        </Flex>

        <DeveloperKpiRow kpis={kpis} />
        <DeveloperHeatMap patterns={patterns} />

        <PatternTable
          data={patterns}
          selectedPatternId={viewModel?.selectedPatternId ?? null}
          onPatternSelect={onPatternSelect}
        />
      </Flex>

      {selectedPattern && (
        <PatternDetailPanel
          pattern={selectedPattern}
          onClose={() => onPatternSelect?.(null)}
        />
      )}
    </Flex>
  );
}
