import { ExtendedCostConfig, ProblemPattern } from '../models';
import {
  DisplayLevel,
  ObjectiveType,
  PatternDetail,
  PatternRow,
  PatternStatus,
  PatternTimelineBucket,
  TrendDirection,
  confidenceToDisplayLevel,
} from '../types/views';
import { DEFAULT_EXTENDED_COST_CONFIG } from './default-cost-config';
import { extractPatternSignals, PatternSignals, signalsToEvidence } from './pattern-signals';
import { formatCurrency } from './formatting';
import { compactTrendEvidence, trendObservation } from './pattern-trend-enrichment';

function levelToScore(level: ProblemPattern['confidence']): number {
  if (level === 'HIGH') return 0.9;
  if (level === 'MEDIUM') return 0.6;
  return 0.3;
}

function trendToView(trend: ProblemPattern['trend']): TrendDirection {
  if (trend === 'INCREASING') return 'Increasing';
  if (trend === 'DECREASING') return 'Decreasing';
  return 'Stable';
}

function severityToLevel(pattern: ProblemPattern, signals: PatternSignals): DisplayLevel {
  const cost = Number(signals.operational_cost.value || 0);
  if (cost >= 10_000 || pattern.severity === 'AVAILABILITY') return 'High';
  if (cost >= 2_500 || pattern.severity === 'ERROR') return 'Medium';
  return 'Low';
}

function statusForPattern(pattern: ProblemPattern): PatternStatus {
  const openCount = pattern.problems.filter(problem => problem.status === 'OPEN').length;
  if (openCount === 0) return 'Resolved';
  if (openCount === pattern.problems.length) return 'Open';
  return 'Mixed';
}

function recommendationPriority(pattern: ProblemPattern, signals: PatternSignals): PatternRow['priority'] {
  const cost = Number(signals.operational_cost.value || 0);
  if (cost >= 10_000 || pattern.trend === 'INCREASING') return 'Immediate';
  if (pattern.recurrenceScore >= 60 || pattern.occurrences >= 3) return 'Short term';
  if (pattern.evidenceQuality === 'LOW') return 'Monitor';
  return 'Strategic';
}

function primaryAction(pattern: ProblemPattern): string {
  return pattern.recommendation?.text || 'Review recurring pattern evidence and define the next action.';
}

function buildTimeline(pattern: ProblemPattern): PatternTimelineBucket[] {
  const buckets = new Map<string, number>();
  pattern.problems.forEach(problem => {
    if (!Number.isFinite(problem.startTime) || problem.startTime <= 0) return;
    const date = new Date(problem.startTime);
    const label = date.toISOString().slice(0, 10);
    buckets.set(label, (buckets.get(label) || 0) + 1);
  });

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

function truncate(value: string, max = 120): string {
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
}

function formatEntity(entity: { entityId?: string; name?: string; type?: string }): string {
  const name = entity.name && entity.name.trim() ? entity.name.trim() : 'Unnamed entity';
  const type = entity.type || 'ENTITY';
  const id = entity.entityId ? ` (${entity.entityId})` : '';
  return truncate(`${type}: ${name}${id}`);
}

function buildProblemContext(pattern: ProblemPattern) {
  const sampledProblems = pattern.problems.slice(0, 8).map(problem => {
    const impacted = problem.impactedEntities.slice(0, 4).map(formatEntity);
    const extraImpacted = problem.impactedEntities.length > impacted.length
      ? `; +${problem.impactedEntities.length - impacted.length} more`
      : '';
    const rca = problem.rootCauseEntity ? formatEntity(problem.rootCauseEntity) : 'Missing';
    return [
      `problemId=${problem.problemId}`,
      `status=${problem.status}`,
      `category=${problem.severity}`,
      `start=${Number.isFinite(problem.startTime) ? new Date(problem.startTime).toISOString() : 'absent'}`,
      `end=${problem.endTime && Number.isFinite(problem.endTime) ? new Date(problem.endTime).toISOString() : 'absent'}`,
      `affectedUsers=${problem.affectedUsers ?? 0}`,
      `impactedEntities=${impacted.length ? impacted.join('; ') + extraImpacted : 'absent'}`,
      `rootCauseEntity=${rca}`,
    ].join(' | ');
  });
  const impactedEntities = [...new Map(
    pattern.problems
      .flatMap(problem => problem.impactedEntities)
      .filter(entity => entity.entityId || entity.name)
      .map(entity => [entity.entityId || entity.name, formatEntity(entity)])
  ).values()].slice(0, 20);
  const rootCauseEntities = [...new Map(
    pattern.problems
      .map(problem => problem.rootCauseEntity)
      .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity?.entityId || entity?.name))
      .map(entity => [entity.entityId || entity.name, formatEntity(entity)])
  ).values()].slice(0, 10);

  return {
    sampledProblems,
    impactedEntities,
    rootCauseEntities,
    omittedProblemCount: Math.max(0, pattern.problems.length - sampledProblems.length),
  };
}

export function patternToRow(pattern: ProblemPattern, config: ExtendedCostConfig = DEFAULT_EXTENDED_COST_CONFIG): PatternRow {
  const signals = extractPatternSignals(pattern, config);
  const openProblemCount = pattern.problems.filter(problem => problem.status === 'OPEN').length;
  const cost = Number(signals.operational_cost.value || 0);
  const recoverable = Number(signals.potential_savings.value || 0);
  const affectedServices = signals.affected_services.value;

  return {
    id: pattern.patternId,
    name: pattern.title,
    category: pattern.severity,
    status: statusForPattern(pattern),
    costFormatted: formatCurrency(cost),
    recoverableFormatted: formatCurrency(recoverable),
    recurrenceCount: pattern.occurrences,
    openProblemCount,
    totalProblemCount: pattern.problems.length,
    blastRadius: Number(signals.affected_entity_count.value || affectedServices.length),
    affectedServices,
    severity: severityToLevel(pattern, signals),
    priority: recommendationPriority(pattern, signals),
    trend: trendToView(pattern.trend),
    evidenceQuality: confidenceToDisplayLevel(pattern.evidenceQuality),
    evidenceQualityScore: levelToScore(pattern.evidenceQuality),
    investigationReadiness: confidenceToDisplayLevel(pattern.investigationReadiness),
    investigationReadinessScore: levelToScore(pattern.investigationReadiness),
    rcaAvailability: pattern.hasRCA ? 'Present' : 'Missing',
    rootCauseEntity: pattern.dimensions.primaryRootCause || undefined,
    primaryAction: primaryAction(pattern),
    lastSeen: pattern.lastSeen,
    avgMttr: pattern.avgMTTR,
    autoResolveRate: pattern.autoResolveRate,
  };
}

export function patternToDetail(
  pattern: ProblemPattern,
  persona = 'executive' as PatternDetail['assistContext']['persona'],
  objective: ObjectiveType = 'cost_impact',
  config: ExtendedCostConfig = DEFAULT_EXTENDED_COST_CONFIG,
): PatternDetail {
  const row = patternToRow(pattern, config);
  const signals = extractPatternSignals(pattern, config);
  const affectedUsers = Number(signals.affected_users.value || 0);
  const problemIds = pattern.problems.map(problem => problem.problemId).filter(Boolean);
  const evidence = signalsToEvidence(signals);
  const trendEvidence = compactTrendEvidence(pattern.trendEnrichment);
  if (trendEvidence) evidence.trendEvidence = trendEvidence;
  evidence.problem_context = buildProblemContext(pattern);
  const lineage = Object.fromEntries(Object.entries(signals).map(([key, signal]) => [key, signal.lineage]));

  return {
    id: row.id,
    title: row.name,
    businessImpact: {
      exposure: row.costFormatted,
      recoverableValue: row.recoverableFormatted,
      openIncidents: row.openProblemCount,
      affectedUsers,
    },
    technicalActionability: {
      remediationEffort: row.investigationReadiness,
      confidence: confidenceToDisplayLevel(pattern.confidence),
      investigationFriction: row.investigationReadiness,
      evidenceQuality: row.evidenceQuality,
      investigationReadiness: row.investigationReadiness,
    },
    recurrence: {
      occurrences: row.recurrenceCount,
      trend: row.trend,
      timeline: buildTimeline(pattern),
    },
    trendEnrichment: pattern.trendEnrichment,
    trendObservation: trendObservation(pattern.trendEnrichment),
    recommendedAction: row.primaryAction,
    assistContext: {
      persona,
      objective,
      problemIds,
      evidence,
      lineage,
    },
  };
}

export function patternsToRows(patterns: ProblemPattern[], config: ExtendedCostConfig = DEFAULT_EXTENDED_COST_CONFIG): PatternRow[] {
  return patterns.map(pattern => patternToRow(pattern, config));
}
