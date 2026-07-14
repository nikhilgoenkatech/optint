import React, { useState } from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { ObjectiveType, DeveloperKPIs, PatternRow, WorkspaceViewModel } from '../../types/views';
import { samplePatternRows, sampleDeveloperKPIs } from '../../fixtures/patterns.sample';
import { ObjectiveToggle } from '../atoms/ObjectiveToggle';
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
  const objectiveLabel = objective === 'cost_impact' ? 'Cost Impact' : 'Alert Optimization';
  const scopeGroups: Array<{ type: DeveloperScopeOption['type']; label: string }> = [
    { type: 'service', label: 'Services' },
    { type: 'team', label: 'Teams' },
    { type: 'owner', label: 'Owners' },
    { type: 'namespace', label: 'Namespaces' },
    { type: 'application', label: 'Applications' },
    { type: 'environment', label: 'Environments' },
  ];

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
          style={{ padding: '4px 16px', borderBottom: '1px solid var(--dt-colors-border-neutral-subdued, #eee)', minHeight: 36 }}
        >
          {/* Left: scope filter */}
          <Flex alignItems="center" gap={6}>
            <span style={{ fontSize: 12, color: 'var(--dt-colors-text-neutral-subdued, #74777a)', whiteSpace: 'nowrap' }}>
              Scope
            </span>
            <select
              value={selectedDeveloperScopeId}
              onChange={(event) => onDeveloperScopeChange?.(event.target.value)}
              disabled={!developerScopes.length}
              style={{
                minWidth: 200,
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
                background: 'var(--dt-colors-background-container-neutral-default, #fff)',
                color: 'var(--dt-colors-text-neutral-default, #23282d)',
                fontSize: 12,
              }}
            >
              <option value="">{developerScopes.length ? 'All services' : 'No developer scopes found'}</option>
              {scopeGroups.map(group => {
                const scopes = developerScopes.filter(scope => scope.type === group.type);
                if (!scopes.length) return null;
                return (
                  <optgroup key={group.type} label={group.label}>
                    {scopes.map(scope => (
                      <option key={scope.id} value={scope.id}>{scope.label} ({scope.count})</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </Flex>

          {/* Right: objective toggle */}
          <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
        </Flex>

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
