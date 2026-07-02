import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, DeveloperKPIs, PatternRow, PatternDetail, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, samplePatternDetail } from '../../fixtures/patterns.sample';

interface DeveloperViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  viewModel?: WorkspaceViewModel<DeveloperKPIs>;
}

export function DeveloperView({ objective, onObjectiveChange, viewModel }: DeveloperViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const selectedPattern: PatternDetail | undefined = viewModel?.selectedPattern ?? samplePatternDetail;
  const loading = false;

  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center" style={{ height: '60vh' }}>
        <ProgressCircle />
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" gap={16} padding={24}>
      <Heading level={2}>Developer View</Heading>
      {/* KPI cards — Phase 6 */}
      {/* Developer Heat Map — Phase 7 */}
      {/* Pattern table — Phase 5 */}
      {/* Persistent right panel — Phase 8 */}
      <Text>
        {patterns.length} patterns · {objective} objective
      </Text>
      <Text color="text-secondary" style={{ fontSize: 12 }}>
        Shell — fixture data. Codex wires viewModel prop.
      </Text>
    </Flex>
  );
}
