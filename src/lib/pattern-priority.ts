import { ObjectiveType, PatternRow } from '../types/views';
import { WeightsConfig, DEFAULT_WEIGHTS } from '../components/config/ConfigDialog';

export function parseCostValue(costFormatted: string): number {
  const s = costFormatted.trim().replace(/^\$/, '');
  if (s.endsWith('K')) return parseFloat(s) * 1000;
  if (s.endsWith('M')) return parseFloat(s) * 1_000_000;
  return parseFloat(s) || 0;
}

function normalise(value: number, values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (!finite.length) return 0.5;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (min === max) return 0.5;
  return (value - min) / (max - min);
}

function severityScore(severity: PatternRow['severity']): number {
  if (severity === 'High') return 1;
  if (severity === 'Medium') return 0.5;
  return 0;
}

function trendScore(trend: PatternRow['trend']): number {
  if (trend === 'Increasing') return 1;
  if (trend === 'Stable') return 0.5;
  return 0;
}

/** Maps a config label to its raw (un-normalised) scalar for a single pattern. */
function rawSignal(label: string, pattern: PatternRow): number {
  switch (label) {
    case 'Cost share':  return parseCostValue(pattern.costFormatted);
    case 'Recurrence':  return pattern.recurrenceCount;
    case 'Blast radius':return pattern.blastRadius;
    case 'Severity':    return severityScore(pattern.severity);
    case 'Open count':  return pattern.openProblemCount;
    case 'Readiness':   return pattern.investigationReadinessScore;
    case 'Trend':       return trendScore(pattern.trend);
    case 'Noise':       return pattern.autoResolveRate;
    case 'Duration':    return pattern.avgMttr;
    default:            return 0;
  }
}

/**
 * Returns a 0–1 priority score per pattern, normalised relative to the
 * supplied set, using the per-objective weights from the user's config.
 */
export function computePriorityScores(
  patterns: PatternRow[],
  objective: ObjectiveType,
  weights: WeightsConfig = DEFAULT_WEIGHTS,
): Map<string, number> {
  const segments = weights[objective];

  // Pre-compute per-label normalisation ranges across all patterns
  const rawValues: Map<string, number[]> = new Map();
  for (const seg of segments) {
    rawValues.set(seg.label, patterns.map(p => rawSignal(seg.label, p)));
  }

  const scores = new Map<string, number>();
  const totalPct = segments.reduce((sum, s) => sum + s.pct, 0) || 100;

  patterns.forEach(pattern => {
    let score = 0;
    for (const seg of segments) {
      const raw = rawSignal(seg.label, pattern);
      const norm = normalise(raw, rawValues.get(seg.label)!);
      score += norm * (seg.pct / totalPct);
    }
    scores.set(pattern.id, score);
  });
  return scores;
}

export function sortByObjective(
  patterns: PatternRow[],
  objective: ObjectiveType,
  weights: WeightsConfig = DEFAULT_WEIGHTS,
): PatternRow[] {
  const scores = computePriorityScores(patterns, objective, weights);
  return [...patterns].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));
}

export function yAxisLabel(objective: ObjectiveType): string {
  return objective === 'cost_impact'
    ? 'Higher cost impact →'
    : 'Higher alert noise →';
}

export interface PriorityDebugRow {
  rank: number;
  pattern: string;
  score: number;
  signals: Record<string, { raw: number; norm: number; weight: number; contribution: number }>;
}

export function debugPriorityScores(
  patterns: PatternRow[],
  objective: ObjectiveType,
  weights: WeightsConfig = DEFAULT_WEIGHTS,
): PriorityDebugRow[] {
  const segments = weights[objective];
  const totalPct = segments.reduce((sum, s) => sum + s.pct, 0) || 100;

  const rawValues: Map<string, number[]> = new Map();
  for (const seg of segments) {
    rawValues.set(seg.label, patterns.map(p => rawSignal(seg.label, p)));
  }

  const rows: PriorityDebugRow[] = patterns.map(pattern => {
    const signals: PriorityDebugRow['signals'] = {};
    let score = 0;
    for (const seg of segments) {
      const raw = rawSignal(seg.label, pattern);
      const norm = normalise(raw, rawValues.get(seg.label)!);
      const weight = seg.pct / totalPct;
      const contribution = norm * weight;
      score += contribution;
      signals[seg.label] = { raw: Math.round(raw * 1000) / 1000, norm: Math.round(norm * 1000) / 1000, weight: Math.round(weight * 1000) / 1000, contribution: Math.round(contribution * 1000) / 1000 };
    }
    return { rank: 0, pattern: pattern.name, score: Math.round(score * 1000) / 1000, signals };
  });

  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => { r.rank = i + 1; });

  console.group(`%c[Calibrate] Priority scores — objective: ${objective}`, 'font-weight:bold;color:#1a6af4');
  console.log('Weights:', Object.fromEntries(segments.map(s => [s.label, `${Math.round(s.pct)}%`])));
  console.table(rows.map(r => ({
    rank: r.rank,
    pattern: r.pattern,
    score: r.score,
    ...Object.fromEntries(Object.entries(r.signals).map(([k, v]) => [k, `${v.norm} × ${Math.round(v.weight * 100)}% = ${v.contribution}`])),
  })));
  console.groupEnd();

  return rows;
}
