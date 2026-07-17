import { DynatraceProblem, ProblemPattern, ExtendedCostConfig } from '../models';
import { ObjectiveType, PatternRow } from '../types/views';
import { WeightsConfig } from '../components/config/ConfigDialog';
import { debugPriorityScores } from './pattern-priority';
import { patternsToRows } from './pattern-adapter';

const STYLE = 'font-weight:bold;color:#1a6af4';

/** Snapshot of all top-level app state — quick triage in customer support. */
export function calibrateState(
  persona: string,
  objective: ObjectiveType,
  timeframe: { from?: string; to?: string } | null,
  problems: DynatraceProblem[],
  patterns: ProblemPattern[],
  developerPatterns: ProblemPattern[],
  weightsConfig: WeightsConfig,
  costConfig: ExtendedCostConfig,
  loadError: string | null,
): void {
  try {
    const activePatterns = persona === 'developer' ? developerPatterns : patterns;
    console.group('%c[Calibrate] App state snapshot', STYLE);
    console.table([{
      persona,
      objective,
      timeframe_from: timeframe?.from ?? '(default)',
      timeframe_to: timeframe?.to ?? '(default)',
      total_problems: problems.length,
      patterns_all: patterns.length,
      patterns_developer: developerPatterns.length,
      active_patterns: activePatterns.length,
      load_error: loadError ?? 'none',
    }]);
    console.log('Cost config:', costConfig);
    console.log('Weights config:', weightsConfig);
    console.groupEnd();
  } catch (e) {
    console.warn('[Calibrate] calibrateState failed', e);
  }
}

/** Per-pattern summary: occurrences, cost, trend, evidence, affected services. */
export function calibratePatterns(
  patterns: ProblemPattern[],
  costConfig: ExtendedCostConfig,
): void {
  try {
    if (!patterns.length) {
      console.warn('[Calibrate] calibratePatterns: no patterns available');
      return;
    }
    const rows: PatternRow[] = patternsToRows(patterns, costConfig);
    console.group('%c[Calibrate] Pattern summary', STYLE);
    console.table(patterns.map((p, i) => ({
      id: p.patternId,
      title: p.title,
      occurrences: p.occurrences,
      open_problems: p.problems.filter(x => x.status === 'OPEN').length,
      total_problems: p.problems.length,
      total_cost: `$${Math.round(p.totalCost)}`,
      avg_mttr_min: p.avgMTTR,
      auto_resolve_rate: `${Math.round(p.autoResolveRate * 100)}%`,
      trend: p.trend,
      severity: p.severity,
      evidence_quality: p.evidenceQuality,
      investigation_readiness: p.investigationReadiness,
      has_rca: p.hasRCA,
      affected_services: p.affectedServices.join(', ') || '(none)',
      cost_formatted: rows[i]?.costFormatted ?? '—',
    })));
    console.groupEnd();
  } catch (e) {
    console.warn('[Calibrate] calibratePatterns failed', e);
  }
}

/** Raw problems from Grail: IDs, status, severity, duration, entity count. */
export function calibrateProblems(problems: DynatraceProblem[]): void {
  try {
    if (!problems.length) {
      console.warn('[Calibrate] calibrateProblems: no problems loaded yet');
      return;
    }
    console.group('%c[Calibrate] Raw problems', STYLE);
    console.log(`Total: ${problems.length}  |  Open: ${problems.filter(p => p.status === 'OPEN').length}  |  Resolved: ${problems.filter(p => p.status !== 'OPEN').length}`);
    console.table(problems.map(p => ({
      id: p.problemId,
      title: p.title.slice(0, 60),
      status: p.status,
      severity: p.severity,
      duration_min: p.duration ?? '—',
      impacted_entities: p.impactedEntities.length,
      affected_users: p.affectedUsers ?? 0,
      management_zones: p.managementZones.join(', ') || '(none)',
      has_root_cause: p.hasRootCause,
      start: new Date(p.startTime).toISOString(),
    })));
    console.groupEnd();
  } catch (e) {
    console.warn('[Calibrate] calibrateProblems failed', e);
  }
}

/** Priority score breakdown — delegates to pattern-priority debugger. */
export function calibrateScores(
  patterns: ProblemPattern[],
  objective: ObjectiveType,
  weightsConfig: WeightsConfig,
  costConfig: ExtendedCostConfig,
): void {
  try {
    if (!patterns.length) {
      console.warn('[Calibrate] calibrateScores: no patterns available');
      return;
    }
    debugPriorityScores(patternsToRows(patterns, costConfig), objective, weightsConfig);
  } catch (e) {
    console.warn('[Calibrate] calibrateScores failed', e);
  }
}

/** Cost config breakdown: rates, multipliers, recovery pct. */
export function calibrateCostConfig(costConfig: ExtendedCostConfig): void {
  try {
    console.group('%c[Calibrate] Cost config', STYLE);
    console.table([{
      affected_user_cost_per_hr: `$${costConfig.affectedUserCostPerHr}`,
      fallback_entity_cost: `$${costConfig.fallbackEntityCost}`,
      engineering_hourly_rate: `$${costConfig.engineeringHourlyRate}`,
      default_responders: costConfig.defaultResponders,
      recovery_rate_pct: `${costConfig.recoveryRatePct}%`,
    }]);
    console.log('Severity multipliers:', costConfig.severityMultipliers);
    console.groupEnd();
  } catch (e) {
    console.warn('[Calibrate] calibrateCostConfig failed', e);
  }
}
