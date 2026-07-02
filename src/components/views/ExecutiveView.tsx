import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, ExecKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleExecKPIs } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
import { ExecKpiRow } from '../kpis/ExecKpiRow';
import { PatternTable } from '../table/PatternTable';

interface ExecutiveViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  viewModel?: WorkspaceViewModel<ExecKPIs>;
}

export function ExecutiveView({ objective, onObjectiveChange, viewModel }: ExecutiveViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const kpis = viewModel?.kpis ?? sampleExecKPIs;
  const loading = false;

  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center">
        <ProgressCircle />
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" gap={16} padding={24}>
      <Flex justifyContent="space-between" alignItems="center">
        <Heading level={2}>Executive Overview</Heading>
        <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
      </Flex>

      {/* Phase 6: KPI cards */}
      <ExecKpiRow kpis={kpis} />
      {/* Phase 7: Act-First Map */}

      {/* Phase 5: Pattern Explorer Table */}
      <PatternTable data={patterns} />

      {/* Phase 8: Persistent right panel */}
      <Text textStyle="small">Fixture data · Codex wires viewModel prop</Text>
    </Flex>
  );
}
