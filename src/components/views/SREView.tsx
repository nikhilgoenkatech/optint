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
      <Flex flexDirection="column" gap={0} style={{ flex: '0 0 72%', minWidth: 0, overflowY: 'auto', borderRight: '1px solid var(--dt-colors-border-neutral-subdued, #eee)' }}>

        <Flex
          justifyContent="space-between"
          alignItems="center"
          padding={16}
          style={{ borderBottom: '1px solid var(--dt-colors-border-neutral-subdued, #eee)' }}
        >
          <Flex flexDirection="column" gap={2}>
            <Heading level={2} style={{ margin: 0 }}>SRE View</Heading>
            <span style={{ fontSize: 12, color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}>
              Reliability risk and noise reduction
            </span>
          </Flex>
          <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
        </Flex>

        <div style={{ padding: '16px 16px 0' }}>
          <SREKpiRow kpis={kpis} />
        </div>

        <div style={{ padding: '0 16px 16px', flex: 1 }}>
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
        </div>
      </Flex>

      <div style={{ flex: '0 0 28%', minWidth: 280, height: '100%', overflow: 'hidden' }}>
        <PatternDetailPanel
          pattern={selectedPattern}
          onClose={() => onPatternSelect?.(null)}
        />
      </div>
    </Flex>
  );
}
