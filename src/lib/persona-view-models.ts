import { DynatraceProblem, ExtendedCostConfig, ProblemPattern } from '../models';
import { DEFAULT_EXTENDED_COST_CONFIG } from '../components/config/ConfigDialog';
import { patternToDetail, patternsToRows } from './pattern-adapter';
import { configuredPatternCost } from './pattern-signals';
import { formatCurrency, formatMinutes, medianPositive } from './formatting';
import { estimateCost } from '../cost/CostModel';
import {
  DeveloperKPIs,
  ExecKPIs,
  MetricCardViewModel,
  ObjectiveType,
  PersonaType,
  SREKPIs,
  WorkspaceViewModel,
} from '../types/views';

function metric(id: string, label: string, value: string, helper?: string): MetricCardViewModel {
  return { id, label, value, helper };
}

function openProblems(patterns: ProblemPattern[]): number {
  return patterns.reduce((sum, pattern) => sum + pattern.problems.filter(problem => problem.status === 'OPEN').length, 0);
}

function resolvedDurations(patterns: ProblemPattern[]): number[] {
  return patterns.flatMap(pattern => pattern.problems
    .filter(problem => problem.status === 'RESOLVED')
    .map(problem => Number(problem.duration))
    .filter(value => Number.isFinite(value) && value > 0));
}

function totalConfiguredCost(patterns: ProblemPattern[], config: ExtendedCostConfig): number {
  return patterns.reduce((sum, pattern) => sum + configuredPatternCost(pattern, config), 0);
}

export function buildExecKPIs(patterns: ProblemPattern[], config: ExtendedCostConfig = DEFAULT_EXTENDED_COST_CONFIG): ExecKPIs {
  const exposure = totalConfiguredCost(patterns, config);
  const recoverable = exposure * (Math.max(0, Math.min(100, config.recoveryRatePct)) / 100);
  const durations = resolvedDurations(patterns);

  return {
    openRiskExposure: metric('open-risk-exposure', 'Open Risk Exposure', formatCurrency(exposure), `${openProblems(patterns)} open incidents`),
    recoverableNow: metric('recoverable-now', 'Recoverable Now', formatCurrency(recoverable), `Recovery model: ${config.recoveryRatePct}%`),
    activePatterns: metric('active-patterns', 'Active Patterns', String(patterns.length), 'Recurring patterns requiring attention'),
    resolutionTime: metric('resolution-time', 'Median MTTR', formatMinutes(medianPositive(durations)), `${durations.length} resolved`),
  };
}

export function buildSREKPIs(patterns: ProblemPattern[]): SREKPIs {
  const repeatOffenders = patterns.filter(pattern => pattern.occurrences >= 2);
  const automationCandidates = repeatOffenders.filter(pattern => pattern.investigationReadiness !== 'LOW');
  const debt = patterns.filter(pattern => pattern.evidenceQuality === 'LOW' || pattern.confidence === 'LOW');
  const durations = resolvedDurations(patterns);

  return {
    operationalDebt: metric('operational-debt', 'Operational Debt', String(debt.length), 'Low-evidence or low-confidence patterns'),
    automationCandidates: metric('automation-candidates', 'Automation Candidates', String(automationCandidates.length), 'Recurring patterns with enough evidence to automate'),
    repeatOffenders: metric('repeat-offenders', 'Repeat Offenders', String(repeatOffenders.length), 'Patterns recurring at least twice'),
    medianMttr: metric('median-mttr', 'Median MTTR', formatMinutes(medianPositive(durations)), `${durations.length} resolved`),
  };
}

export function buildDeveloperKPIs(patterns: ProblemPattern[]): DeveloperKPIs {
  const open = openProblems(patterns);
  const services = new Set(patterns.flatMap(pattern => pattern.affectedServices));
  const needsInvestigation = patterns.filter(pattern => pattern.evidenceQuality === 'LOW' || !pattern.hasRCA).length;
  const durations = resolvedDurations(patterns);

  return {
    openErrors: metric('open-errors', 'Open Problems', String(open), 'Total open problems across all categories'),
    servicesImpacted: metric('services-impacted', 'Services Impacted', String(services.size), 'Unique services or endpoints'),
    needsInvestigation: metric('needs-investigation', 'Needs Investigation', String(needsInvestigation), 'Missing RCA or low evidence quality'),
    medianResolutionTime: metric('median-resolution-time', 'Median MTTR', formatMinutes(medianPositive(durations)), `${durations.length} resolved`),
  };
}

export function buildWorkspaceViewModel<TKpis>(
  persona: PersonaType,
  objective: ObjectiveType,
  patterns: ProblemPattern[],
  kpis: TKpis,
  selectedPatternId: string | null,
  config: ExtendedCostConfig = DEFAULT_EXTENDED_COST_CONFIG,
  rawProblems: DynatraceProblem[] = [],
): WorkspaceViewModel<TKpis> {
  const selectedPattern = patterns.find(pattern => pattern.patternId === selectedPatternId);

  return {
    persona,
    objective,
    kpis,
    patterns: patternsToRows(patterns, config),
    selectedPatternId: selectedPattern ? selectedPatternId : null,
    selectedPattern: selectedPattern ? patternToDetail(selectedPattern, persona, objective, config) : undefined,
    rawProblemRecords: persona === 'sre' ? rawProblems.map(problem => ({
      id: problem.problemId,
      title: problem.businessTitle || problem.title,
      status: problem.status,
      category: problem.severity,
      exposure: formatCurrency(estimateCost(problem).total),
      users: problem.affectedUsers || 0,
      duration: formatMinutes(problem.duration || 0),
      seen: Number.isFinite(problem.startTime) ? new Date(problem.startTime).toLocaleString() : 'Unknown',
    })) : undefined,
    emptyState: {
      title: 'No pattern selected',
      description: 'Select a recurring pattern to review evidence, analysis, and remediation.',
      actionHint: 'Choose a matrix bubble, heat-map cell, or explorer row.',
    },
  };
}
