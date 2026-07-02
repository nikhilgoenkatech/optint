import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, ExecKPIs, PatternRow, PatternDetail, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, samplePatternDetail } from '../../fixtures/patterns.sample';

interface ExecutiveViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  viewModel?: WorkspaceViewModel<ExecKPIs>;
}

export function ExecutiveView({ objective, onObjectiveChange, viewModel }: ExecutiveViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
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
      <Heading level={2}>Executive Overview</Heading>
      {/* Phase 6: KPI cards */}
      {/* Phase 7: Act-First Map */}
      {/* Phase 5: Pattern table */}
      {/* Phase 8: Persistent right panel */}
      <Text>
        {patterns.length} patterns · <strong>{objective === 'cost_impact' ? 'Cost Impact' : 'Alert Optimization'}</strong>
      </Text>
      <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>
        Shell — fixture data. Codex wires viewModel prop.
      </Text>
    </Flex>
  );
}
