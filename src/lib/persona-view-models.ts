import { ProblemPattern } from '../models';
import { patternToDetail, patternsToRows } from './pattern-adapter';
import {
  DeveloperKPIs,
  ExecKPIs,
  MetricCardViewModel,
  ObjectiveType,
  PersonaType,
  SREKPIs,
  WorkspaceViewModel,
} from '../types/views';

function currency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0';
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

function minutes(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '-';
  if (value < 60) return `${Math.round(value)}m`;
  return `${Math.round(value / 60)}h`;
}

function metric(id: string, label: string, value: string, helper?: string): MetricCardViewModel {
  return { id, label, value, helper };
}

function median(values: number[]): number {
  const clean = values.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (!clean.length) return 0;
  return clean[Math.floor(clean.length / 2)];
}

function openProblems(patterns: ProblemPattern[]): number {
  return patterns.reduce((sum, pattern) => sum + pattern.problems.filter(problem => problem.status === 'OPEN').length, 0);
}

export function buildExecKPIs(patterns: ProblemPattern[]): ExecKPIs {
  const exposure = patterns.reduce((sum, pattern) => sum + pattern.totalCost, 0);
  const recoverable = exposure * 0.35;
  const durations = patterns.flatMap(pattern => pattern.problems.map(problem => problem.duration || 0));

  return {
    openRiskExposure: metric('open-risk-exposure', 'Open Risk Exposure', currency(exposure), `${openProblems(patterns)} open incidents`),
    recoverableNow: metric('recoverable-now', 'Recoverable Now', currency(recoverable), 'Recovery model: 35%'),
    activePatterns: metric('active-patterns', 'Active Patterns', String(patterns.length), 'Recurring patterns requiring attention'),
    resolutionTime: metric('resolution-time', 'Median MTTR', minutes(median(durations)), 'Resolved problem duration'),
  };
}

export function buildSREKPIs(patterns: ProblemPattern[]): SREKPIs {
  const repeatOffenders = patterns.filter(pattern => pattern.occurrences >= 2);
  const automationCandidates = repeatOffenders.filter(pattern => pattern.investigationReadiness !== 'LOW');
  const debt = patterns.filter(pattern => pattern.evidenceQuality === 'LOW' || pattern.confidence === 'LOW');
  const durations = patterns.flatMap(pattern => pattern.problems.map(problem => problem.duration || 0));

  return {
    operationalDebt: metric('operational-debt', 'Operational Debt', String(debt.length), 'Low-evidence or low-confidence patterns'),
    automationCandidates: metric('automation-candidates', 'Automation Candidates', String(automationCandidates.length), 'Recurring patterns with enough evidence to automate'),
    repeatOffenders: metric('repeat-offenders', 'Repeat Offenders', String(repeatOffenders.length), 'Patterns recurring at least twice'),
    medianMttr: metric('median-mttr', 'Median MTTR', minutes(median(durations)), 'Median resolved duration'),
  };
}

export function buildDeveloperKPIs(patterns: ProblemPattern[]): DeveloperKPIs {
  const openErrors = patterns.reduce(
    (sum, pattern) => sum + pattern.problems.filter(problem => problem.status === 'OPEN' && problem.severity === 'ERROR').length,
    0,
  );
  const services = new Set(patterns.flatMap(pattern => pattern.affectedServices));
  const needsInvestigation = patterns.filter(pattern => pattern.evidenceQuality === 'LOW' || !pattern.hasRCA).length;
  const durations = patterns.flatMap(pattern => pattern.problems.map(problem => problem.duration || 0));

  return {
    openErrors: metric('open-errors', 'Open Errors', String(openErrors), 'Open ERROR-category problems'),
    servicesImpacted: metric('services-impacted', 'Services Impacted', String(services.size), 'Unique services or endpoints'),
    needsInvestigation: metric('needs-investigation', 'Needs Investigation', String(needsInvestigation), 'Missing RCA or low evidence quality'),
    medianResolutionTime: metric('median-resolution-time', 'Median Resolution Time', minutes(median(durations)), 'Median resolved duration'),
  };
}

export function buildWorkspaceViewModel<TKpis>(
  persona: PersonaType,
  objective: ObjectiveType,
  patterns: ProblemPattern[],
  kpis: TKpis,
  selectedPatternId: string | null,
): WorkspaceViewModel<TKpis> {
  const selectedPattern = patterns.find(pattern => pattern.patternId === selectedPatternId);

  return {
    persona,
    objective,
    kpis,
    patterns: patternsToRows(patterns),
    selectedPatternId,
    selectedPattern: selectedPattern ? patternToDetail(selectedPattern, persona, objective) : undefined,
    emptyState: {
      title: 'No pattern selected',
      description: 'Select a recurring pattern to review evidence, analysis, and remediation.',
      actionHint: 'Choose a matrix bubble, heat-map cell, or explorer row.',
    },
  };
}
