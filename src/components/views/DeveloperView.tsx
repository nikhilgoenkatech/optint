import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, DeveloperKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleDeveloperKPIs } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
import { DeveloperKpiRow } from '../kpis/DeveloperKpiRow';
import { DeveloperHeatMap } from '../charts/DeveloperHeatMap';
import { PatternTable } from '../table/PatternTable';

interface DeveloperViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  viewModel?: WorkspaceViewModel<DeveloperKPIs>;
}

export function DeveloperView({ objective, onObjectiveChange, viewModel }: DeveloperViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const kpis = viewModel?.kpis ?? sampleDeveloperKPIs;
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
        <Heading level={2}>Developer View</Heading>
        <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
      </Flex>

      {/* Phase 6: KPI cards */}
      <DeveloperKpiRow kpis={kpis} />
      <DeveloperHeatMap patterns={patterns} />

      {/* Phase 5: Pattern Explorer Table */}
      <PatternTable data={patterns} />

      {/* Phase 8: Persistent right panel */}
      <Text textStyle="small">Pattern rows and KPIs from persona view model</Text>
    </Flex>
  );
}
