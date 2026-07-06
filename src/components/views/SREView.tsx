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
  timeWindow?: string;
}

export function SREView({ objective, onObjectiveChange, onPatternSelect, viewModel, timeWindow }: SREViewProps) {
  const patterns: PatternRow[] = viewModel?.patterns ?? samplePatternRows;
  const kpis = viewModel?.kpis ?? sampleSREKPIs;
  const selectedPattern = viewModel?.selectedPattern ?? null;
  const rawProblemRecords = viewModel?.rawProblemRecords ?? [];
  const loading = false;
  const [viewTab, setViewTab] = useState(0);
  const objectiveLabel = objective === 'cost_impact' ? 'Cost Impact' : 'Alert Optimization';

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
          padding={20}
          style={{ borderBottom: '1px solid var(--dt-colors-border-neutral-subdued, #eee)' }}
        >
          <Flex flexDirection="column" gap={4}>
            <Heading level={2} style={{ margin: 0 }}>SRE View</Heading>
            <span style={{ fontSize: 12, color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}>
              Objective: {objectiveLabel}
            </span>
          </Flex>
          <ObjectiveToggle value={objective} onChange={onObjectiveChange} />
        </Flex>

        <div style={{ padding: '20px 20px 0' }}>
          <SREKpiRow kpis={kpis} />
        </div>

        <div style={{ padding: '0 20px 20px', flex: 1 }}>
          {patterns.length === 0 && rawProblemRecords.length > 0 ? (
            <RawDqlFallback records={rawProblemRecords} />
          ) : (
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
          )}
        </div>
      </Flex>

      <div style={{ flex: '0 0 28%', minWidth: 280, height: '100%', overflow: 'hidden' }}>
        <PatternDetailPanel
          pattern={selectedPattern}
          onClose={() => onPatternSelect?.(null)}
          timeWindow={timeWindow}
        />
      </div>
    </Flex>
  );
}

function RawDqlFallback({ records }: { records: NonNullable<WorkspaceViewModel<SREKPIs>['rawProblemRecords']> }) {
  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--dt-colors-text-neutral-subdued, #74777a)', marginBottom: 8 }}>
        Live DQL returned {records.length} problem record{records.length === 1 ? '' : 's'}, but no recurring pattern met the grouping threshold for this timeframe.
      </div>
      <div style={{ border: '1px solid var(--dt-colors-border-neutral-subdued, #d5d8df)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--dt-colors-background-container-neutral-subdued, #f7f8fa)' }}>
              {['Status', 'Problem', 'Category', 'Exposure', 'Users', 'Duration', 'Seen'].map(header => (
                <th key={header} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 25).map(record => (
              <tr key={record.id} style={{ borderTop: '1px solid var(--dt-colors-border-neutral-subdued, #d5d8df)' }}>
                <td style={{ padding: '8px 10px' }}>{record.status}</td>
                <td style={{ padding: '8px 10px', fontWeight: 600 }}>{record.title}</td>
                <td style={{ padding: '8px 10px' }}>{record.category}</td>
                <td style={{ padding: '8px 10px' }}>{record.exposure}</td>
                <td style={{ padding: '8px 10px' }}>{record.users}</td>
                <td style={{ padding: '8px 10px' }}>{record.duration}</td>
                <td style={{ padding: '8px 10px' }}>{record.seen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
