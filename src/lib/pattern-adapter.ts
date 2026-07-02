import { ProblemPattern } from '../models';
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

const DEFAULT_RECOVERY_RATE = 0.35;

function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '$0';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value)}`;
}

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

function severityToLevel(pattern: ProblemPattern): DisplayLevel {
  if (pattern.totalCost >= 10_000 || pattern.severity === 'AVAILABILITY') return 'High';
  if (pattern.totalCost >= 2_500 || pattern.severity === 'ERROR') return 'Medium';
  return 'Low';
}

function statusForPattern(pattern: ProblemPattern): PatternStatus {
  const openCount = pattern.problems.filter(problem => problem.status === 'OPEN').length;
  if (openCount === 0) return 'Resolved';
  if (openCount === pattern.problems.length) return 'Open';
  return 'Mixed';
}

function recommendationPriority(pattern: ProblemPattern): PatternRow['priority'] {
  if (pattern.totalCost >= 10_000 || pattern.trend === 'INCREASING') return 'Immediate';
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

export function patternToRow(pattern: ProblemPattern): PatternRow {
  const openProblemCount = pattern.problems.filter(problem => problem.status === 'OPEN').length;
  const recoverable = pattern.totalCost * DEFAULT_RECOVERY_RATE;

  return {
    id: pattern.patternId,
    name: pattern.title,
    category: pattern.severity,
    status: statusForPattern(pattern),
    costFormatted: formatCurrency(pattern.totalCost),
    recoverableFormatted: formatCurrency(recoverable),
    recurrenceCount: pattern.occurrences,
    openProblemCount,
    totalProblemCount: pattern.problems.length,
    blastRadius: pattern.affectedServices.length,
    affectedServices: pattern.affectedServices,
    severity: severityToLevel(pattern),
    priority: recommendationPriority(pattern),
    trend: trendToView(pattern.trend),
    evidenceQuality: confidenceToDisplayLevel(pattern.evidenceQuality),
    evidenceQualityScore: levelToScore(pattern.evidenceQuality),
    investigationReadiness: confidenceToDisplayLevel(pattern.investigationReadiness),
    investigationReadinessScore: levelToScore(pattern.investigationReadiness),
    rcaAvailability: pattern.hasRCA ? 'Present' : 'Missing',
    rootCauseEntity: pattern.dimensions.primaryRootCause || undefined,
    primaryAction: primaryAction(pattern),
    lastSeen: pattern.lastSeen,
  };
}

export function patternToDetail(
  pattern: ProblemPattern,
  persona = 'executive' as PatternDetail['assistContext']['persona'],
  objective: ObjectiveType = 'cost_impact',
): PatternDetail {
  const row = patternToRow(pattern);
  const affectedUsers = pattern.problems.reduce((sum, problem) => sum + (problem.affectedUsers || 0), 0);
  const problemIds = pattern.problems.map(problem => problem.problemId).filter(Boolean);

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
    recommendedAction: row.primaryAction,
    assistContext: {
      persona,
      objective,
      problemIds,
      evidence: {
        occurrence_count: pattern.occurrences,
        alert_event_count: pattern.problems.length,
        operational_cost: Math.round(pattern.totalCost),
        affected_users: affectedUsers,
        affected_entity_count: pattern.affectedServices.length,
        affected_services: pattern.affectedServices,
        event_category: pattern.severity,
        trend: pattern.trend,
        rca_availability: pattern.hasRCA ? 'Present' : 'Missing',
        root_cause_entity: pattern.dimensions.primaryRootCause,
      },
    },
  };
}

export function patternsToRows(patterns: ProblemPattern[]): PatternRow[] {
  return patterns.map(patternToRow);
}
