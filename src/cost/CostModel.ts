// ============================================================
// DYNATRACE OPERATIONAL INTELLIGENCE - COST MODEL
// Three-number simplified model:
//   Revenue Loss + Engineering Cost + Recurring Waste
// ============================================================

import { DynatraceProblem, Severity, CostEstimate, CostConfig } from '../models';

export const DEFAULT_COST_CONFIG: CostConfig = {
  revenuePerUserPerMinute: 0.08,
  engineeringHourlyRate:   150,
  avgIncidentResponders:   3,
};

const SEVERITY_REVENUE_MULTIPLIER: Record<Severity, number> = {
  AVAILABILITY:        1.0,
  ERROR:               0.7,
  PERFORMANCE:         0.3,
  RESOURCE_CONTENTION: 0.15,
  CUSTOM_ALERT:        0.05,
};

export function estimateCost(
  problem: DynatraceProblem,
  config:  CostConfig = DEFAULT_COST_CONFIG
): CostEstimate {
  const duration        = problem.duration ?? 30;
  const users           = problem.affectedUsers ?? 0;
  const sevMult         = SEVERITY_REVENUE_MULTIPLIER[problem.severity] ?? 0.3;
  const revenueLoss     = Math.round(users * config.revenuePerUserPerMinute * duration * sevMult);
  const engineeringCost = Math.round((duration / 60) * config.engineeringHourlyRate * config.avgIncidentResponders);
  const total           = revenueLoss + engineeringCost;
  const parts: string[] = [];
  if (revenueLoss     > 0) parts.push(`$${revenueLoss.toLocaleString()} revenue`);
  if (engineeringCost > 0) parts.push(`$${engineeringCost.toLocaleString()} eng`);
  return { problemId: problem.problemId, revenueLoss, engineeringCost, total, breakdown: parts.join(' + ') || '$0' };
}

export function calcRecurringWaste(problems: DynatraceProblem[], config?: CostConfig): number {
  return Math.round(
    problems
      .filter(p => (p.recurrenceScore ?? 0) >= 60)
      .reduce((sum, p) => sum + estimateCost(p, config).total * ((p.recurrenceScore ?? 0) / 100), 0)
  );
}

export function formatCost(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}
