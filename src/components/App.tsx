import React, { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@dynatrace/strato-components/layouts';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { Select, SelectOption } from '@dynatrace/strato-components/forms';
import { SettingIcon } from '@dynatrace/strato-icons';
import { PersonaType, ObjectiveType } from '../types/views';
import { ExecutiveView } from './views/ExecutiveView';
import { SREView } from './views/SREView';
import { DeveloperView } from './views/DeveloperView';
import { fetchProblems } from '../services/dynatraceService';
import { detectPatterns } from '../analytics';
import { DynatraceProblem, FilterState, CostConfig } from '../models';
import {
  buildDeveloperKPIs,
  buildExecKPIs,
  buildSREKPIs,
  buildWorkspaceViewModel,
} from '../lib/persona-view-models';
import { DEFAULT_COST_CONFIG } from '../cost/CostModel';
import { ConfigDialog, DEFAULT_WEIGHTS, WeightsConfig } from './config/ConfigDialog';

const PERSONA_LABELS: Record<PersonaType, string> = {
  executive: 'Executive',
  sre: 'SRE',
  developer: 'Developer',
};

const TIMEFRAME_OPTIONS = [
  { label: 'Last 24 hours', from: 'now-24h', to: 'now' },
  { label: 'Last 7 days',   from: 'now-7d',  to: 'now' },
  { label: 'Last 30 days',  from: 'now-30d', to: 'now' },
  { label: 'Last 90 days',  from: 'now-90d', to: 'now' },
];

function makeFilters(from: string, to: string, label: string): FilterState {
  return { timeRange: { from, to, label }, applications: [], tags: [], managementZones: [], severities: [], statuses: [], searchText: '' };
}

export function App() {
  const [personaIndex, setPersonaIndex] = useState(0);
  const [objective, setObjective] = useState<ObjectiveType>('cost_impact');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [problems, setProblems] = useState<DynatraceProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeframeIdx, setTimeframeIdx] = useState(1); // default: Last 7 days
  const [costConfig, setCostConfig] = useState<CostConfig>(DEFAULT_COST_CONFIG);
  const [weightsConfig, setWeightsConfig] = useState<WeightsConfig>(DEFAULT_WEIGHTS);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tf = TIMEFRAME_OPTIONS[timeframeIdx];

    async function loadProblems() {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await fetchProblems(makeFilters(tf.from, tf.to, tf.label));
        if (!cancelled) setProblems(rows);
      } catch (error) {
        console.error('[Strato preview] Failed to load live Davis problem data', error);
        if (!cancelled) setLoadError('Live Davis problem data is not available.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProblems();
    return () => {
      cancelled = true;
    };
  }, [timeframeIdx]);

  const patterns = useMemo(() => detectPatterns(problems).patterns, [problems]);

  useEffect(() => {
    if (selectedPatternId && !patterns.some((pattern) => pattern.patternId === selectedPatternId)) {
      setSelectedPatternId(null);
    }
  }, [patterns, selectedPatternId]);

  const executiveViewModel = useMemo(
    () => buildWorkspaceViewModel('executive', objective, patterns, buildExecKPIs(patterns), selectedPatternId),
    [objective, patterns, selectedPatternId],
  );
  const sreViewModel = useMemo(
    () => buildWorkspaceViewModel('sre', objective, patterns, buildSREKPIs(patterns), selectedPatternId),
    [objective, patterns, selectedPatternId],
  );
  const developerViewModel = useMemo(
    () => buildWorkspaceViewModel('developer', objective, patterns, buildDeveloperKPIs(patterns), selectedPatternId),
    [objective, patterns, selectedPatternId],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader>
        <AppHeader.Logo>Calibrate</AppHeader.Logo>
        <AppHeader.ActionItems>
          <Select
            value={String(timeframeIdx)}
            onChange={(v) => v != null && setTimeframeIdx(Number(v))}
          >
            {TIMEFRAME_OPTIONS.map((tf, i) => (
              <SelectOption key={i} value={String(i)}>{tf.label}</SelectOption>
            ))}
          </Select>
          <AppHeader.ActionButton
            prefixIcon={<SettingIcon />}
            onClick={() => setConfigOpen(true)}
            isSelected={configOpen}
          >
            Configure
          </AppHeader.ActionButton>
        </AppHeader.ActionItems>
      </AppHeader>

      <ConfigDialog
        show={configOpen}
        onDismiss={() => setConfigOpen(false)}
        costConfig={costConfig}
        onCostConfigChange={setCostConfig}
        weightsConfig={weightsConfig}
        onWeightsChange={setWeightsConfig}
        objective={objective}
      />

      {loading ? (
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
          <ProgressCircle />
        </div>
      ) : loadError ? (
        <div style={{ padding: 24 }}>{loadError}</div>
      ) : (
        <Tabs selectedIndex={personaIndex} onChange={setPersonaIndex}>
          <Tab title={PERSONA_LABELS.executive}>
            <ExecutiveView
              objective={objective}
              onObjectiveChange={setObjective}
              onPatternSelect={setSelectedPatternId}
              viewModel={executiveViewModel}
            />
          </Tab>
          <Tab title={PERSONA_LABELS.sre}>
            <SREView
              objective={objective}
              onObjectiveChange={setObjective}
              onPatternSelect={setSelectedPatternId}
              viewModel={sreViewModel}
            />
          </Tab>
          <Tab title={PERSONA_LABELS.developer}>
            <DeveloperView
              objective={objective}
              onObjectiveChange={setObjective}
              onPatternSelect={setSelectedPatternId}
              viewModel={developerViewModel}
            />
          </Tab>
        </Tabs>
      )}
    </div>
  );
}
