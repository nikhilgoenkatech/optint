import { ExtendedCostConfig, ProblemPattern } from '../models';
import { DEFAULT_EXTENDED_COST_CONFIG } from '../components/config/ConfigDialog';
import type { EvidenceValue } from '../types/views';
import { formatCurrency, formatMinutes, medianPositive } from './formatting';

export interface SignalLineage {
  sourceField: string;
  transformation: string;
  fallbackUsed?: string;
  missingReason?: string;
}

export interface PatternSignal<T = string | number | string[] | null> {
  value: T;
  label: string;
  lineage: SignalLineage;
}

export interface PatternSignals {
  occurrence_count: PatternSignal<number>;
  alert_event_count: PatternSignal<number>;
  operational_cost: PatternSignal<number>;
  potential_savings: PatternSignal<number>;
  affected_users: PatternSignal<number>;
  affected_entity_count: PatternSignal<number>;
  affected_services: PatternSignal<string[]>;
  event_category: PatternSignal<string>;
  scope_tier: PatternSignal<string>;
  trend: PatternSignal<string>;
  avg_duration: PatternSignal<string>;
  median_mttr: PatternSignal<string>;
  recommendation_type: PatternSignal<string>;
  rca_availability: PatternSignal<'Present' | 'Missing'>;
  root_cause_entity: PatternSignal<string | null>;
}

function unique(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function readableServiceName(value: string): boolean {
  const normalized = value.trim();
  if (!normalized || /^unknown\s/i.test(normalized)) return false;
  if (/^[A-Z_]+-[A-Za-z0-9]/.test(normalized)) return false;
  if (['SERVICE', 'HOST', 'APPLICATION', 'PROCESS_GROUP'].includes(normalized.toUpperCase())) return false;
  return true;
}

function scopeTier(entityCount: number): string {
  if (entityCount >= 8) return 'broad';
  if (entityCount >= 2) return 'scoped';
  return 'localized';
}

function resolvedDurations(pattern: ProblemPattern): number[] {
  return pattern.problems
    .filter(problem => problem.status === 'RESOLVED')
    .map(problem => Number(problem.duration))
    .filter(value => Number.isFinite(value) && value > 0);
}

export function configuredPatternCost(pattern: ProblemPattern, config: ExtendedCostConfig = DEFAULT_EXTENDED_COST_CONFIG): number {
  return Math.round(pattern.problems.reduce((sum, problem) => {
    const duration = Number.isFinite(problem.duration || NaN) && (problem.duration || 0) > 0 ? problem.duration! : 30;
    const users = Number(problem.affectedUsers || 0);
    const severityMultiplier = config.severityMultipliers[problem.severity] ?? 0.3;
    const userImpact = users * (config.affectedUserCostPerHr / 60) * duration * severityMultiplier;
    const entityFallback = users > 0 ? 0 : (problem.impactedEntities.length || 1) * config.fallbackEntityCost * severityMultiplier;
    const engineeringImpact = (duration / 60) * config.engineeringHourlyRate * config.defaultResponders;
    return sum + userImpact + entityFallback + engineeringImpact;
  }, 0));
}

export function extractPatternSignals(
  pattern: ProblemPattern,
  config: ExtendedCostConfig = DEFAULT_EXTENDED_COST_CONFIG,
): PatternSignals {
  const services = unique([
    ...pattern.dimensions.rootCauseEntities,
    ...pattern.affectedServices,
    ...pattern.dimensions.impactedServices,
    ...pattern.problems.map(problem => problem.rootCauseEntity?.name || ''),
    ...pattern.problems.flatMap(problem => problem.impactedEntities.map(entity => entity.name)),
  ]).filter(readableServiceName);
  const affectedEntityCount = unique(pattern.problems.flatMap(problem => problem.impactedEntities.map(entity => entity.entityId))).length || services.length;
  const affectedUsers = pattern.problems.reduce((sum, problem) => sum + (problem.affectedUsers || 0), 0);
  const operationalCost = configuredPatternCost(pattern, config);
  const recoveryRate = Math.max(0, Math.min(100, config.recoveryRatePct)) / 100;
  const durations = resolvedDurations(pattern);
  const avgDuration = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
  const medianDuration = medianPositive(durations);

  return {
    occurrence_count: {
      value: pattern.occurrences,
      label: 'Occurrences',
      lineage: { sourceField: 'ProblemPattern.occurrences', transformation: 'count grouped problems in pattern' },
    },
    alert_event_count: {
      value: pattern.problems.length,
      label: 'Problem records',
      lineage: { sourceField: 'ProblemPattern.problems.length', transformation: 'count normalized Davis records in pattern' },
    },
    operational_cost: {
      value: operationalCost,
      label: 'Operational cost',
      lineage: { sourceField: 'Pattern problems + ExtendedCostConfig', transformation: 'sum configured user, entity fallback, and engineering impact' },
    },
    potential_savings: {
      value: Math.round(operationalCost * recoveryRate),
      label: 'Recoverable value',
      lineage: { sourceField: 'operational_cost + recoveryRatePct', transformation: `${formatCurrency(operationalCost)} x ${config.recoveryRatePct}%` },
    },
    affected_users: {
      value: affectedUsers,
      label: 'Affected users',
      lineage: { sourceField: 'dt.davis.affected_users_count', transformation: 'sum over selected pattern problems', fallbackUsed: affectedUsers === 0 ? '0 when absent' : undefined },
    },
    affected_entity_count: {
      value: affectedEntityCount,
      label: 'Affected entities',
      lineage: { sourceField: 'affected_entity_ids / smartscape.affected_entity.ids', transformation: 'unique affected entity count' },
    },
    affected_services: {
      value: services.length ? services : ['Unknown Service'],
      label: 'Affected services',
      lineage: { sourceField: 'resolved affected entity names', transformation: 'unique readable service/entity names', fallbackUsed: services.length ? undefined : 'Unknown Service' },
    },
    event_category: {
      value: pattern.severity,
      label: 'Failure type',
      lineage: { sourceField: 'event.category', transformation: 'dominant pattern category from grouped problems' },
    },
    scope_tier: {
      value: scopeTier(affectedEntityCount),
      label: 'Scope',
      lineage: { sourceField: 'affected_entity_count', transformation: 'localized/scoped/broad tier' },
    },
    trend: {
      value: pattern.trend,
      label: 'Trend',
      lineage: { sourceField: 'ProblemPattern.trend', transformation: 'first-half versus second-half recurrence rate' },
    },
    avg_duration: {
      value: formatMinutes(avgDuration),
      label: 'Average duration',
      lineage: { sourceField: 'resolved_problem_duration', transformation: 'average valid resolved durations only', missingReason: durations.length ? undefined : 'No valid resolved durations' },
    },
    median_mttr: {
      value: formatMinutes(medianDuration),
      label: 'Median MTTR',
      lineage: { sourceField: 'resolved_problem_duration', transformation: 'median valid resolved durations only', missingReason: durations.length ? undefined : 'No valid resolved durations' },
    },
    recommendation_type: {
      value: pattern.recommendation.type,
      label: 'Recommended lever',
      lineage: { sourceField: 'ProblemPattern.recommendation.type', transformation: 'client recommendation classifier output' },
    },
    rca_availability: {
      value: pattern.hasRCA ? 'Present' : 'Missing',
      label: 'Root cause evidence',
      lineage: { sourceField: 'root_cause_entity_name / root_cause_entity_id', transformation: 'presence check only' },
    },
    root_cause_entity: {
      value: pattern.dimensions.primaryRootCause,
      label: 'Root cause entity',
      lineage: { sourceField: 'root_cause_entity_name', transformation: 'dominant resolved root cause entity name', missingReason: pattern.dimensions.primaryRootCause ? undefined : 'No root cause entity supplied by Davis' },
    },
  };
}

export function signalsToEvidence(signals: PatternSignals): Record<string, EvidenceValue> {
  return Object.fromEntries(Object.entries(signals).map(([key, signal]) => [key, signal.value]));
}
