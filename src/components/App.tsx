import React, { useEffect, useMemo, useState } from 'react';
import { ProgressCircle } from '@dynatrace/strato-components/content';
import { TimeframeSelector } from '@dynatrace/strato-components/filters';
import type { Timeframe } from '@dynatrace/strato-components/core';

const DEFAULT_TIMEFRAME: Timeframe = {
  from: { absoluteDate: 'now-7d', value: 'now-7d', type: 'expression' },
  to:   { absoluteDate: 'now',    value: 'now',     type: 'expression' },
};
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
import { calibrateState, calibratePatterns, calibrateProblems, calibrateScores, calibrateCostConfig } from '../lib/calibrate-debug';
import { ExtendedCostConfig } from '../models';
import { applyDeveloperScopeFilter, buildDeveloperScopeTaxonomy } from '../lib/developer-scope';
import { DQL_QUERIES } from '../queries/dqlQueries';
import type { DqlNotebookContext } from '../lib/evidence-notebook-export';
import { enrichPatterns, TimeframeBounds } from '../lib/pattern-trend-enrichment';

const MUTED_COLOR = 'var(--dt-colors-text-neutral-subdued, #74777a)';

const HEADER_SELECT_STYLE: React.CSSProperties = {
  padding: '5px 24px 5px 10px',
  borderRadius: 4,
  border: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
  background: 'var(--dt-colors-background-container-neutral-default, #fff)',
  color: 'var(--dt-colors-text-neutral-default, #23282d)',
  fontSize: 13,
  fontWeight: 400,
  cursor: 'pointer',
  appearance: 'none' as const,
  WebkitAppearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2374777a'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
};

const HEADER_SELECT_DISABLED_STYLE: React.CSSProperties = {
  ...HEADER_SELECT_STYLE,
  cursor: 'default',
  color: MUTED_COLOR,
  backgroundImage: 'none',
  paddingRight: 10,
};
/** Inline "Label: [control]" pair — no stacking, no icons. */
function ContextGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
      <span style={{ fontSize: 12, color: MUTED_COLOR, whiteSpace: 'nowrap' }}>{label}:</span>
      {children}
    </div>
  );
}

const SCOPE_LABELS: Record<string, string> = {
  executive: 'Organisation-wide',
  sre: 'Platform-wide',
  developer: 'All services',
};

const PERSONA_LABELS: Record<PersonaType, string> = {
  executive: 'Executive',
  sre: 'SRE',
  developer: 'Developer',
};

function makeFilters(from: string, to: string, label: string): FilterState {
  return { timeRange: { from, to, label }, applications: [], tags: [], managementZones: [], severities: [], statuses: [], searchText: '' };
}

function resolveTimeExpression(value: string, evaluationNow: number): number | null {
  const trimmed = value.trim();
  if (trimmed === 'now') return evaluationNow;
  const relative = trimmed.match(/^now-(\d+)([dhw])$/i);
  if (relative) {
    const amount = Number(relative[1]);
    const unit = relative[2].toLowerCase();
    const unitMs = unit === 'h' ? 3600000 : unit === 'w' ? 7 * 86400000 : 86400000;
    return evaluationNow - (amount * unitMs);
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function resolveTimeframeBounds(from: string, to: string, evaluationNow: number): TimeframeBounds | undefined {
  const fromMs = resolveTimeExpression(from, evaluationNow);
  const toMs = resolveTimeExpression(to, evaluationNow);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs! <= fromMs!) return undefined;
  return { from: fromMs!, to: toMs!, evaluationNow };
}

export function App() {
  const theme = useCurrentTheme();

  useEffect(() => {
    document.documentElement.setAttribute('data-color-scheme', theme);
  }, [theme]);

  const [persona, setPersona] = useState<PersonaType>('executive');
  const [objective, setObjective] = useState<ObjectiveType>('cost_impact');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [problems, setProblems] = useState<DynatraceProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe | null>(DEFAULT_TIMEFRAME);
  const [costConfig, setCostConfig] = useState<ExtendedCostConfig>(DEFAULT_EXTENDED_COST_CONFIG);
  const [weightsConfig, setWeightsConfig] = useState<WeightsConfig>(DEFAULT_WEIGHTS);
  const [configOpen, setConfigOpen] = useState(false);
  const [openSourceNoticeOpen, setOpenSourceNoticeOpen] = useState(false);
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
  const evaluationNow = useMemo(() => Date.now(), [timeframe]);
  const trendBounds = useMemo(() => {
    const from = timeframe?.from?.absoluteDate ?? 'now-7d';
    const to = timeframe?.to?.absoluteDate ?? 'now';
    return resolveTimeframeBounds(from, to, evaluationNow);
  }, [timeframe, evaluationNow]);
  const patterns = useMemo(() => enrichPatterns(detectPatterns(problems).patterns, trendBounds), [problems, trendBounds]);
  const developerPatterns = useMemo(() => enrichPatterns(detectPatterns(scopedDeveloperProblems).patterns, trendBounds), [scopedDeveloperProblems, trendBounds]);

  useEffect(() => {
    const activePatterns = persona === 'developer' ? developerPatterns : patterns;
    const w = window as any;
    w.calibrateDebug    = () => calibrateScores(activePatterns, objective, weightsConfig, costConfig);
    w.calibrateState    = () => calibrateState(persona, objective, { from: timeframe?.from?.absoluteDate, to: timeframe?.to?.absoluteDate }, problems, patterns, developerPatterns, weightsConfig, costConfig, loadError);
    w.calibratePatterns = () => calibratePatterns(activePatterns, costConfig);
    w.calibrateProblems = () => calibrateProblems(problems);
    w.calibrateCost     = () => calibrateCostConfig(costConfig);
    w.calibrateHelp     = () => {
      console.group('%c[Calibrate] Debug utilities', 'font-weight:bold;color:#1a6af4');
      console.log('calibrateDebug()     — Priority scores with per-signal breakdown (current objective + weights)');
      console.log('calibrateState()     — Full app state snapshot: persona, objective, timeframe, problem/pattern counts, errors');
      console.log('calibratePatterns()  — Per-pattern summary: cost, MTTR, trend, evidence quality, affected services');
      console.log('calibrateProblems()  — Raw problems from Grail: IDs, status, severity, duration, entity count');
      console.log('calibrateCost()      — Cost config rates and severity multipliers');
      console.groupEnd();
    };
  }, [patterns, developerPatterns, objective, weightsConfig, costConfig, persona, problems, timeframe, loadError]);

  useEffect(() => {
    if (selectedPatternId) {
      const activePatterns = persona === 'developer' ? developerPatterns : patterns;
      if (!activePatterns.some((p) => p.patternId === selectedPatternId)) {
        setSelectedPatternId(null);
      }
    }
  }, [patterns, developerPatterns, selectedPatternId, persona]);

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
  const timeWindowLabel = `${timeframe?.from?.absoluteDate ?? 'now-7d'} to ${timeframe?.to?.absoluteDate ?? 'now'}`;
  const dqlNotebookContext: DqlNotebookContext = useMemo(() => {
    const from = timeframe?.from?.absoluteDate ?? 'now-7d';
    const to = timeframe?.to?.absoluteDate ?? 'now';
    const filters = makeFilters(from, to, `${from} to ${to}`);
    const activePatterns = persona === 'developer' ? developerPatterns : patterns;
    const selectedPattern = activePatterns.find(pattern => pattern.patternId === selectedPatternId);
    const selectedPatternContext = selectedPattern ? {
      problemIds: selectedPattern.problems.map(problem => problem.problemId).filter(Boolean),
      eventName: selectedPattern.problems[0]?.title,
      rootCauseEntityId: selectedPattern.problems.find(problem => problem.rootCauseEntity?.entityId)?.rootCauseEntity?.entityId,
      rootCauseEntityName: selectedPattern.dimensions.primaryRootCause ?? undefined,
      affectedEntityIds: selectedPattern.problems.flatMap(problem => problem.impactedEntities.map(entity => entity.entityId)).filter(Boolean),
    } : null;
    const validationQueries = selectedPatternContext ? [
      {
        name: 'problemCreationRateQuery',
        persona,
        purpose: 'Validation template for selected-pattern creation rate buckets from event.start. Not executed automatically and does not replace client-side values.',
        dql: DQL_QUERIES.problemCreationRateQuery(filters, selectedPatternContext),
        parameters: { from, to, patternId: selectedPattern?.patternId ?? null, problemIdsCount: selectedPatternContext.problemIds.length },
        lastExecutionTime: null,
        rowCount: null,
      },
      {
        name: 'peakProblemHoursQuery',
        persona,
        purpose: 'Validation template for selected-pattern peak UTC hour/day evidence from event.start. Not executed automatically.',
        dql: DQL_QUERIES.peakProblemHoursQuery(filters, selectedPatternContext),
        parameters: { from, to, patternId: selectedPattern?.patternId ?? null, problemIdsCount: selectedPatternContext.problemIds.length },
        lastExecutionTime: null,
        rowCount: null,
      },
      {
        name: 'fetchPatternMTTRTrend',
        persona,
        purpose: 'Selected-pattern MTTR trend validation. Uses exact problem IDs when available, resolved/closed problems only, resolved_problem_duration fallback to event.end - event.start, and does not replace client-side MTTR trend.',
        dql: DQL_QUERIES.fetchPatternMTTRTrend(filters, selectedPatternContext, trendBounds),
        parameters: { from, to, patternId: selectedPattern?.patternId ?? null, problemIdsCount: selectedPatternContext.problemIds.length },
        lastExecutionTime: null,
        rowCount: null,
      },
    ] : [];
    return {
      queries: [{
        name: 'rawProblemsQuery',
        persona: 'all',
        purpose: 'Retrieve non-duplicate Davis problem records that Calibrate normalizes before client-side pattern grouping.',
        dql: DQL_QUERIES.fetchProblems(filters),
        parameters: { from, to },
        lastExecutionTime: null,
        rowCount: problems.length,
      }, ...validationQueries],
    };
  }, [timeframe, problems.length, persona, patterns, developerPatterns, selectedPatternId, trendBounds]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Row 1: Logo + Persona tabs + centred Timeframe */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderBottom: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
          background: 'var(--dt-colors-background-base-default, #f2f2f5)',
          minHeight: 44,
        }}
      >
        <div style={{ flexShrink: 0, marginRight: 16 }}>
          <CalibrateLogo />
        </div>
        <div style={{ width: 1, height: 22, background: 'var(--dt-colors-border-neutral-subdued, #ddd)', marginRight: 4, flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {(['executive', 'sre', 'developer'] as PersonaType[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                if (p !== persona) {
                  setPersona(p);
                  setSelectedPatternId(null);
                }
              }}
              style={{
                padding: '0 14px',
                border: 'none',
                borderBottom: p === persona
                  ? '2px solid var(--dt-colors-background-container-primary-accent, #1496ff)'
                  : '2px solid transparent',
                borderTop: '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: p === persona ? 600 : 400,
                color: p === persona
                  ? 'var(--dt-colors-text-primary-default, #0b65c2)'
                  : MUTED_COLOR,
                height: 44,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {PERSONA_LABELS[p]}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            aria-expanded={openSourceNoticeOpen}
            onClick={() => setOpenSourceNoticeOpen((open) => !open)}
            onBlur={() => window.setTimeout(() => setOpenSourceNoticeOpen(false), 120)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--dt-colors-text-neutral-subdued, #74777a)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 0',
              whiteSpace: 'nowrap',
            }}
          >
            Open source app <span aria-hidden="true">i</span>
          </button>
          {openSourceNoticeOpen && (
            <div
              role="status"
              style={{
                position: 'absolute',
                right: 0,
                top: 34,
                width: 340,
                zIndex: 30,
                padding: '10px 12px',
                border: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
                borderRadius: 6,
                background: 'var(--dt-colors-background-container-neutral-default, #fff)',
                color: 'var(--dt-colors-text-neutral-default, #23282d)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
                fontSize: 12,
                fontWeight: 400,
                lineHeight: 1.45,
              }}
            >
              Calibrate is an open-source app and is not an officially maintained Dynatrace product.
              For issues, enhancements, or support, use the project repository instead of Dynatrace
              Support or Dynatrace product teams.
            </div>
          )}
        </div>

      </div>

      {/* Row 2: Analysis context — Objective and Scope */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '0 20px',
          borderBottom: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
          background: 'var(--dt-colors-background-base-default, #ffffff)',
          minHeight: 40,
        }}
      >
        <ContextGroup label="Objective">
          <select
            value={objective}
            onChange={e => setObjective(e.target.value as ObjectiveType)}
            style={HEADER_SELECT_STYLE}
          >
            <option value="cost_impact">Cost Impact</option>
            <option value="alert_optimization">Alert Optimization</option>
          </select>
        </ContextGroup>

        <ContextGroup label="Scope">
          {persona === 'developer' ? (
            <select
              value={developerScopeId}
              onChange={e => {
                setDeveloperScopeId(e.target.value);
                setSelectedPatternId(null);
              }}
              disabled={!developerScopes.length}
              style={HEADER_SELECT_STYLE}
            >
              <option value="">{developerScopes.length ? 'All Services' : 'No scopes found'}</option>
              {[
                { type: 'service', label: 'Services' },
                { type: 'team', label: 'Teams' },
                { type: 'owner', label: 'Owners' },
                { type: 'namespace', label: 'Namespaces' },
                { type: 'application', label: 'Applications' },
                { type: 'environment', label: 'Environments' },
              ].map(group => {
                const scopes = developerScopes.filter(s => s.type === group.type);
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
          ) : (
            <span style={{ fontSize: 13, color: 'var(--dt-colors-text-neutral-default, #23282d)', whiteSpace: 'nowrap' }}>
              {SCOPE_LABELS[persona]}
            </span>
          )}
        </ContextGroup>

        <div style={{ flex: 1 }} />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
          borderRadius: 4,
          background: 'var(--dt-colors-background-container-neutral-default, #fff)',
          overflow: 'hidden',
        }}>
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>
        <div style={{ width: 1, height: 22, background: 'var(--dt-colors-border-neutral-subdued, #ddd)', flexShrink: 0 }} />
        <button
          onClick={() => setConfigOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 4,
            border: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
            background: configOpen ? 'var(--dt-colors-background-container-neutral-accent, #e8f0fe)' : 'transparent',
            color: 'var(--dt-colors-text-neutral-default, #23282d)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <SettingIcon />
          Configure
        </button>
      </div>

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
          {persona === 'executive' && (
            <ExecutiveView
              objective={objective}
              weightsConfig={weightsConfig}
              onObjectiveChange={setObjective}
              onPatternSelect={setSelectedPatternId}
              viewModel={executiveViewModel}
              timeWindow={timeWindowLabel}
              dqlNotebookContext={dqlNotebookContext}
            />
          )}
          {persona === 'sre' && (
            <SREView
              objective={objective}
              weightsConfig={weightsConfig}
              onObjectiveChange={setObjective}
              onPatternSelect={setSelectedPatternId}
              viewModel={sreViewModel}
              timeWindow={timeWindowLabel}
              dqlNotebookContext={dqlNotebookContext}
            />
          )}
          {persona === 'developer' && (
            <DeveloperView
              objective={objective}
              weightsConfig={weightsConfig}
              onObjectiveChange={setObjective}
              onPatternSelect={setSelectedPatternId}
              viewModel={developerViewModel}
              timeWindow={timeWindowLabel}
              dqlNotebookContext={dqlNotebookContext}
              developerScopes={developerScopes}
              selectedDeveloperScopeId={developerScopeId}
              onDeveloperScopeChange={(scopeId: string) => {
                setDeveloperScopeId(scopeId);
                setSelectedPatternId(null);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
