import React, { useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { ObjectiveType, DeveloperKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleDeveloperKPIs } from '../../fixtures/patterns.sample';
import { DeveloperKpiRow } from '../kpis/DeveloperKpiRow';
import { DeveloperHeatMap } from '../charts/DeveloperHeatMap';
import { PatternTable } from '../table/PatternTable';
import { PatternDetailPanel } from '../panels/PatternDetailPanel';
import { DeveloperScopeOption } from '../../lib/developer-scope';
import type { DqlNotebookContext } from '../../lib/evidence-notebook-export';

interface DeveloperViewProps {
  objective: ObjectiveType;
  onObjectiveChange: (o: ObjectiveType) => void;
  onPatternSelect?: (id: string | null) => void;
  viewModel?: WorkspaceViewModel<DeveloperKPIs>;
  timeWindow?: string;
  dqlNotebookContext?: DqlNotebookContext;
  developerScopes?: DeveloperScopeOption[];
  selectedDeveloperScopeId?: string;
  onDeveloperScopeChange?: (scopeId: string) => void;
}

export function DeveloperView({
  objective,
  onObjectiveChange,
  onPatternSelect,
  viewModel,
  timeWindow,
  dqlNotebookContext,
  developerScopes = [],
  selectedDeveloperScopeId = '',
  onDeveloperScopeChange,
}: DeveloperViewProps) {
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
      <Flex flexDirection="column" gap={0} style={{ flex: '0 0 72%', minWidth: 0, overflowY: 'auto', borderRight: '1px solid var(--dt-colors-border-neutral-subdued, #eee)' }}>

        <div style={{ padding: '10px 16px 0' }}>
          <DeveloperKpiRow kpis={kpis} />
        </div>

        <div style={{ padding: '0 16px 16px', flex: 1 }}>
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
        </div>
      </Flex>

      <div style={{ flex: '0 0 28%', minWidth: 280, height: '100%', overflow: 'hidden' }}>
        <PatternDetailPanel
          pattern={selectedPattern}
          onClose={() => onPatternSelect?.(null)}
          timeWindow={timeWindow}
          dqlNotebookContext={dqlNotebookContext}
        />
      </div>
    </Flex>
  );
}
