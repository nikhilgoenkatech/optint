import React, { useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { ObjectiveType, DeveloperKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleDeveloperKPIs } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
import { DeveloperKpiRow } from '../kpis/DeveloperKpiRow';
import { DeveloperHeatMap } from '../charts/DeveloperHeatMap';
import { PatternTable } from '../table/PatternTable';
import { PatternDetailPanel } from '../panels/PatternDetailPanel';

interface DeveloperViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  onPatternSelect?: (id: string | null) => void;
  viewModel?: WorkspaceViewModel<DeveloperKPIs>;
}

export function DeveloperView({ objective, onObjectiveChange, onPatternSelect, viewModel }: DeveloperViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const kpis = viewModel?.kpis ?? sampleDeveloperKPIs;
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
          <Heading level={2}>Developer View</Heading>
          <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
        </Flex>

        <DeveloperKpiRow kpis={kpis} />

        <Tabs selectedIndex={viewTab} onChange={setViewTab}>
          <Tab title="Developer Heat Map">
            <DeveloperHeatMap
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
