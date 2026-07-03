import React, { useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Heading } from '@dynatrace/strato-components/typography';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { ObjectiveType, ExecKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleExecKPIs } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
import { ExecKpiRow } from '../kpis/ExecKpiRow';
import { ActFirstMap } from '../charts/ActFirstMap';
import { PatternTable } from '../table/PatternTable';
import { PatternDetailPanel } from '../panels/PatternDetailPanel';

interface ExecutiveViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  onPatternSelect?: (id: string | null) => void;
  viewModel?: WorkspaceViewModel<ExecKPIs>;
}

export function ExecutiveView({ objective, onObjectiveChange, onPatternSelect, viewModel }: ExecutiveViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const kpis = viewModel?.kpis ?? sampleExecKPIs;
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
      {/* Primary decision workspace — 72% */}
      <Flex flexDirection="column" gap={0} style={{ flex: '0 0 72%', minWidth: 0, overflowY: 'auto', borderRight: '1px solid var(--dt-colors-border-neutral-subdued, #eee)' }}>

        {/* Decision control strip */}
        <Flex
          justifyContent="space-between"
          alignItems="center"
          padding={16}
          style={{ borderBottom: '1px solid var(--dt-colors-border-neutral-subdued, #eee)' }}
        >
          <Flex flexDirection="column" gap={2}>
            <Heading level={2} style={{ margin: 0 }}>Executive Overview</Heading>
            <span style={{ fontSize: 12, color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}>
              Objective: <strong style={{ color: 'var(--dt-colors-text-neutral-default, #23282d)' }}>{objective === 'cost_impact' ? 'Cost Impact' : 'Alert Optimization'}</strong>
            </span>
          </Flex>
          <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
        </Flex>

        {/* KPI row */}
        <div style={{ padding: '16px 16px 0' }}>
          <ExecKpiRow kpis={kpis} />
        </div>

        {/* Primary workspace tabs */}
        <div style={{ padding: '0 16px 16px', flex: 1 }}>
          <Tabs selectedIndex={viewTab} onChange={setViewTab}>
            <Tab title="Act-First Map">
              <ActFirstMap
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

      {/* Investigation panel — 28% */}
      <div style={{ flex: '0 0 28%', minWidth: 280, height: '100%', overflow: 'hidden' }}>
        <PatternDetailPanel
          pattern={selectedPattern}
          onClose={() => onPatternSelect?.(null)}
        />
      </div>
    </Flex>
  );
}
