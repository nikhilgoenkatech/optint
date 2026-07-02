import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, DeveloperKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows } from '../../fixtures/patterns.sample';

interface DeveloperViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  viewModel?: WorkspaceViewModel<DeveloperKPIs>;
}

export function DeveloperView({ objective, onObjectiveChange, viewModel }: DeveloperViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
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
      <Heading level={2}>Developer View</Heading>
      {/* Phase 6: KPI cards */}
      {/* Phase 7: Developer Heat Map */}
      {/* Phase 5: Pattern table */}
      {/* Phase 8: Persistent right panel */}
      <Text>
        {patterns.length} patterns ·{' '}
        <strong>{objective === 'cost_impact' ? 'Cost Impact' : 'Alert Optimization'}</strong>
      </Text>
      <Text textStyle="small">
        Shell — fixture data. Codex wires viewModel prop.
      </Text>
    </Flex>
  );
}
