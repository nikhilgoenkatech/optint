import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, SREKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleSREKPIs } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
import { SREKpiRow } from '../kpis/SREKpiRow';
import { PatternTable } from '../table/PatternTable';

interface SREViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  viewModel?: WorkspaceViewModel<SREKPIs>;
}

export function SREView({ objective, onObjectiveChange, viewModel }: SREViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const kpis = viewModel?.kpis ?? sampleSREKPIs;
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
        <Heading level={2}>SRE View</Heading>
        <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
      </Flex>

      {/* Phase 6: KPI cards */}
      <SREKpiRow kpis={kpis} />
      {/* Phase 7: Reliability Risk Matrix */}

      {/* Phase 5: Pattern Explorer Table */}
      <PatternTable data={patterns} />

      {/* Phase 8: Persistent right panel */}
      <Text textStyle="small">Pattern rows and KPIs from persona view model</Text>
    </Flex>
  );
}
