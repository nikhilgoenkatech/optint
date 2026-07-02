import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, ExecKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleExecKPIs } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
import { ExecKpiRow } from '../kpis/ExecKpiRow';
import { ActFirstMap } from '../charts/ActFirstMap';
import { PatternTable } from '../table/PatternTable';
import { PatternDetailPanel } from '../panels/PatternDetailPanel';

interface ExecutiveViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  onPatternSelect?: (id: string | null) => void;
  viewModel?: WorkspaceViewModel<ExecKPIs>;
}

export function ExecutiveView({ objective, onObjectiveChange, onPatternSelect, viewModel }: ExecutiveViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const kpis = viewModel?.kpis ?? sampleExecKPIs;
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
      {/* Main content */}
      <Flex flexDirection="column" gap={16} padding={24} style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <Flex justifyContent="space-between" alignItems="center">
          <Heading level={2}>Executive Overview</Heading>
          <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
        </Flex>

        <ExecKpiRow kpis={kpis} />
        <ActFirstMap patterns={patterns} />

        <PatternTable
          data={patterns}
          selectedPatternId={viewModel?.selectedPatternId ?? null}
          onPatternSelect={onPatternSelect}
        />
      </Flex>

      {/* Persistent right panel */}
      {selectedPattern && (
        <PatternDetailPanel
          pattern={selectedPattern}
          onClose={() => onPatternSelect?.(null)}
        />
      )}
    </Flex>
  );
}
