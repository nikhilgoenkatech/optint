import React, { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@dynatrace/strato-components/layouts';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { TimeframeSelector } from '@dynatrace/strato-components/filters';
import type { Timeframe } from '@dynatrace/strato-components/core';
import { useCurrentTheme } from '@dynatrace/strato-components/core';
import { SettingIcon } from '@dynatrace/strato-icons';
import { CalibrateLogo } from './atoms/CalibrateLogo';
import { PersonaType, ObjectiveType } from '../types/views';
import { ExecutiveView } from './views/ExecutiveView';
import { SREView } from './views/SREView';
import { DeveloperView } from './views/DeveloperView';
import { fetchProblems } from '../services/dynatraceService';
import { detectPatterns } from '../analytics';
import { DynatraceProblem, FilterState } from '../models';
import {
  buildDeveloperKPIs,
  buildExecKPIs,
  buildSREKPIs,
  buildWorkspaceViewModel,
} from '../lib/persona-view-models';
import { ConfigDialog, DEFAULT_EXTENDED_COST_CONFIG, DEFAULT_WEIGHTS, WeightsConfig } from './config/ConfigDialog';
import { ExtendedCostConfig } from '../models';
import { applyDeveloperScopeFilter, buildDeveloperScopeTaxonomy } from '../lib/developer-scope';

const PERSONA_LABELS: Record<PersonaType, string> = {
  executive: 'Executive',
  sre: 'SRE',
  developer: 'Developer',
};

function makeFilters(from: string, to: string, label: string): FilterState {
  return { timeRange: { from, to, label }, applications: [], tags: [], managementZones: [], severities: [], statuses: [], searchText: '' };
}

export function App() {
  const theme = useCurrentTheme();

  useEffect(() => {
    document.documentElement.setAttribute('data-color-scheme', theme);
  }, [theme]);

  const [personaIndex, setPersonaIndex] = useState(0);
  const [objective, setObjective] = useState<ObjectiveType>('cost_impact');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [problems, setProblems] = useState<DynatraceProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe | null>(null);
  const [costConfig, setCostConfig] = useState<ExtendedCostConfig>(DEFAULT_EXTENDED_COST_CONFIG);
  const [weightsConfig, setWeightsConfig] = useState<WeightsConfig>(DEFAULT_WEIGHTS);
  const [configOpen, setConfigOpen] = useState(false);
  const [developerScopeId, setDeveloperScopeId] = useState('');

  useEffect(() => {
    let cancelled = false;
    const from = timeframe?.from?.absoluteDate ?? 'now-7d';
    const to   = timeframe?.to?.absoluteDate   ?? 'now';

    async function loadProblems() {
      setLoading(true);
      setLoadError(null);
      try {
        const rows = await fetchProblems(makeFilters(from, to, `${from} to ${to}`));
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
  }, [timeframe]);

  const developerScopes = useMemo(() => buildDeveloperScopeTaxonomy(problems), [problems]);
  const selectedDeveloperScope = useMemo(
    () => developerScopes.find(scope => scope.id === developerScopeId) ?? null,
    [developerScopes, developerScopeId],
  );
  const scopedDeveloperProblems = useMemo(
    () => applyDeveloperScopeFilter(problems, selectedDeveloperScope),
    [problems, selectedDeveloperScope],
  );
  const patterns = useMemo(() => detectPatterns(problems).patterns, [problems]);
  const developerPatterns = useMemo(() => detectPatterns(scopedDeveloperProblems).patterns, [scopedDeveloperProblems]);

  useEffect(() => {
    if (selectedPatternId && !patterns.some((pattern) => pattern.patternId === selectedPatternId)) {
      setSelectedPatternId(null);
    }
  }, [patterns, developerPatterns, selectedPatternId]);

  useEffect(() => {
    if (developerScopeId && !developerScopes.some(scope => scope.id === developerScopeId)) {
      setDeveloperScopeId('');
    }
  }, [developerScopeId, developerScopes]);

  const executiveViewModel = useMemo(
    () => buildWorkspaceViewModel('executive', objective, patterns, buildExecKPIs(patterns, costConfig), selectedPatternId, costConfig),
    [objective, patterns, selectedPatternId, costConfig],
  );
  const sreViewModel = useMemo(
    () => buildWorkspaceViewModel('sre', objective, patterns, buildSREKPIs(patterns), selectedPatternId, costConfig, problems),
    [objective, patterns, selectedPatternId, costConfig, problems],
  );
  const developerViewModel = useMemo(
    () => buildWorkspaceViewModel('developer', objective, developerPatterns, buildDeveloperKPIs(developerPatterns), selectedPatternId, costConfig),
    [objective, developerPatterns, selectedPatternId, costConfig],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <AppHeader>
        <AppHeader.NavItems>
          <CalibrateLogo />
        </AppHeader.NavItems>
        <AppHeader.ActionItems>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 24 }}>
            <TimeframeSelector value={timeframe} onChange={setTimeframe} />
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.2)' }} />
            <AppHeader.ActionButton
              prefixIcon={<SettingIcon />}
              onClick={() => setConfigOpen(true)}
              isSelected={configOpen}
            >
              Configure
            </AppHeader.ActionButton>
          </div>
        </AppHeader.ActionItems>
      </AppHeader>

      <ConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
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
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Tabs selectedIndex={personaIndex} onChange={setPersonaIndex} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
              developerScopes={developerScopes}
              selectedDeveloperScopeId={developerScopeId}
              onDeveloperScopeChange={(scopeId: string) => {
                setDeveloperScopeId(scopeId);
                setSelectedPatternId(null);
              }}
            />
          </Tab>
        </Tabs>
        </div>
      )}
    </div>
  );
}
