import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { ObjectiveType, DeveloperKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
import { SeverityChip, EvidenceChip, StatusChip } from '../atoms/StatusChip';

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
      <Flex justifyContent="space-between" alignItems="center">
        <Heading level={2}>Developer View</Heading>
        <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
      </Flex>

      {/* Phase 6: KPI cards */}
      {/* Phase 7: Developer Heat Map */}

      {/* Phase 5: Pattern table — preview of chips from fixture */}
      <Flex flexDirection="column" gap={8}>
        {patterns.slice(0, 3).map(p => (
          <Flex key={p.id} gap={8} alignItems="center">
            <Text>{p.name}</Text>
            <SeverityChip value={p.severity} />
            <EvidenceChip value={p.evidenceQuality} />
            <StatusChip value={p.status} />
          </Flex>
        ))}
      </Flex>

      {/* Phase 8: Persistent right panel */}
      <Text textStyle="small">Fixture data · Codex wires viewModel prop</Text>
    </Flex>
  );
}
