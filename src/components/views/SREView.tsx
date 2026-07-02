import React, { useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { ObjectiveType, SREKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleSREKPIs } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
import { SREKpiRow } from '../kpis/SREKpiRow';
import { ReliabilityRiskMatrix } from '../charts/ReliabilityRiskMatrix';
import { PatternTable } from '../table/PatternTable';
import { PatternDetailPanel } from '../panels/PatternDetailPanel';

interface SREViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  onPatternSelect?: (id: string | null) => void;
  viewModel?: WorkspaceViewModel<SREKPIs>;
}

export function SREView({ objective, onObjectiveChange, onPatternSelect, viewModel }: SREViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const kpis = viewModel?.kpis ?? sampleSREKPIs;
  const selectedPattern = viewModel?.selectedPattern ?? null;
  const loading = false;
  const [viewTab, setViewTab] = useState(0);

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
          <Heading level={2}>SRE View</Heading>
          <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
        </Flex>

        <SREKpiRow kpis={kpis} />

        <Tabs selectedIndex={viewTab} onChange={setViewTab}>
          <Tab title="Reliability Risk Matrix">
            <ReliabilityRiskMatrix
              patterns={patterns}
              selectedPatternId={viewModel?.selectedPatternId ?? null}
              onPatternSelect={onPatternSelect}
            />
          </Tab>
          <Tab title="Pattern Explorer">
            <PatternTable
              data={patterns}
              selectedPatternId={viewModel?.selectedPatternId ?? null}
              onPatternSelect={onPatternSelect}
            />
          </Tab>
        </Tabs>
      </Flex>

      <PatternDetailPanel
        pattern={selectedPattern}
        onClose={() => onPatternSelect?.(null)}
      />
    </Flex>
  );
}
