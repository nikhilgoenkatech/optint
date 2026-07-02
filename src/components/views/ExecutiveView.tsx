import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, ExecKPIs, PatternRow, PatternDetail, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, samplePatternDetail } from '../../fixtures/patterns.sample';

interface ExecutiveViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  // Codex wires: real viewModel replacing fixture
  viewModel?: WorkspaceViewModel<ExecKPIs>;
}

export function ExecutiveView({ objective, onObjectiveChange, viewModel }: ExecutiveViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const selectedPattern: PatternDetail | undefined = viewModel?.selectedPattern ?? samplePatternDetail;
  const loading = false; // Codex wires: derive from query state

  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center" style={{ height: '60vh' }}>
        <ProgressCircle />
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" gap={16} padding={24}>
      <Heading level={2}>Executive Overview</Heading>
      {/* KPI cards — Phase 6 */}
      {/* Act-First Map — Phase 7 */}
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
