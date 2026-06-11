// ============================================================
// DYNATRACE OPERATIONAL INTELLIGENCE - ANALYTICS UTILITIES
// ============================================================

import { DynatraceProblem, ProblemPattern, TrendPoint, Severity, PatternRecommendation, RecommendationType, PatternDimensions } from '../models';
import { normaliseTitle } from '../queries/dqlQueries';
import { estimateCost }   from '../cost/CostModel';

function level(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  return score >= 0.65 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'LOW';
}

// ── MTTR analytics ────────────────────────────────────────

export function calculateMTTR(problems: DynatraceProblem[]): {
  avg: number; median: number; p95: number;
} {
  const resolved  = problems.filter(p => p.status === 'RESOLVED' && p.duration);
  const durations = resolved.map(p => p.duration!).sort((a, b) => a - b);
  if (!durations.length) return { avg: 0, median: 0, p95: 0 };
  const avg    = durations.reduce((a, b) => a + b, 0) / durations.length;
  const median = durations[Math.floor(durations.length / 2)];
  const p95    = durations[Math.floor(durations.length * 0.95)] ?? durations[durations.length - 1];
  return { avg, median, p95 };
}

// ── Severity weights ──────────────────────────────────────

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  AVAILABILITY:        5,
  ERROR:               4,
  PERFORMANCE:         3,
  RESOURCE_CONTENTION: 2,
  CUSTOM_ALERT:        1,
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  AVAILABILITY:        '#e8463a',
  ERROR:               '#f4742d',
  PERFORMANCE:         '#f5c518',
  RESOURCE_CONTENTION: '#6db3f2',
  CUSTOM_ALERT:        '#9b8fe4',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  AVAILABILITY:        'Availability',
  ERROR:               'Error',
  PERFORMANCE:         'Performance',
  RESOURCE_CONTENTION: 'Resource',
  CUSTOM_ALERT:        'Custom',
};

// ── Pattern detection ─────────────────────────────────────

export function detectPatterns(problems: DynatraceProblem[]): {
  patterns: ProblemPattern[];
  oneOffs:  DynatraceProblem[];
} {
  const groups = new Map<string, DynatraceProblem[]>();
  problems.forEach(p => {
    const key = patternSignature(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  });

  const patterns: ProblemPattern[] = [];
  const oneOffs:  DynatraceProblem[] = [];

  groups.forEach(ps => {
    if (ps.length >= 2) patterns.push(buildPattern(ps));
    else                oneOffs.push(ps[0]);
  });

  return {
    patterns: patterns.sort((a, b) => b.recurrenceScore - a.recurrenceScore),
    oneOffs,
  };
}

function normaliseEntityKey(entity: string | undefined): string {
  return String(entity || 'unknown-entity').toLowerCase().replace(/\s+/g, ' ').trim();
}

function patternEntityKey(problem: DynatraceProblem): string {
  if (problem.rootCauseEntity?.name) return `rca:${normaliseEntityKey(problem.rootCauseEntity.name)}`;
  const primaryEntity = problem.impactedEntities.find(e => e.name)?.name;
  return `entity:${normaliseEntityKey(primaryEntity)}`;
}

function isGenericMultiEntityTitle(title: string): boolean {
  const normalized = normaliseTitle(title);
  return /\bmultiple\s+(services|entities|applications|problems)\b/.test(normalized)
    || /\bimpacted\s+services\b/.test(normalized);
}

function patternSignature(problem: DynatraceProblem): string {
  if (isGenericMultiEntityTitle(problem.title)) {
    return `${normaliseTitle(problem.title)}|severity:${problem.severity}`;
  }
  return `${normaliseTitle(problem.title)}|${patternEntityKey(problem)}`;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function uniqueValues(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))].sort();
}

function mode(values: Array<string | undefined | null>): string | null {
  const counts = new Map<string, number>();
  values.map(v => String(v || '').trim()).filter(Boolean).forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function purity(values: Array<string | undefined | null>): number {
  const clean = values.map(v => String(v || '').trim()).filter(Boolean);
  if (!clean.length) return 0.5;
  const top = mode(clean);
  return clean.filter(v => v === top).length / clean.length;
}

function buildPatternDimensions(problems: DynatraceProblem[]): PatternDimensions {
  const rootCauseEntities = uniqueValues(problems.filter(p => p.hasRootCause && p.rootCauseEntity?.name).map(p => p.rootCauseEntity?.name));
  const impactedServices = uniqueValues(problems.flatMap(p => p.impactedEntities.map(e => e.name)));
  const managementZones = uniqueValues(problems.flatMap(p => p.managementZones));
  const regions = uniqueValues(problems.map(p => p.region));
  const clouds = uniqueValues(problems.map(p => p.cloud ?? undefined).filter(Boolean));
  const severities = [...new Set(problems.map(p => p.severity))].sort() as Severity[];
  const causalEntities = uniqueValues(problems.map(patternEntityKey));
  const dimensionPurity = Math.max(0, Math.min(1, mean([
    purity(problems.map(patternEntityKey)),
    purity(problems.map(p => p.severity)),
    purity(problems.flatMap(p => p.managementZones)),
    purity(problems.map(p => p.region || p.cloud || 'unknown')),
  ])));

  return {
    rootCauseEntities,
    causalEntities,
    impactedServices,
    managementZones,
    regions,
    clouds,
    severities,
    primaryRootCause: mode(rootCauseEntities),
    primaryService: mode(impactedServices),
    primaryZone: mode(managementZones),
    primaryRegion: mode(regions),
    primaryCloud: mode(clouds),
    dimensionPurity,
  };
}

function buildPattern(problems: DynatraceProblem[]): ProblemPattern {
  const times      = problems.map(p => p.startTime).sort((a, b) => a - b);
  const durations  = problems.filter(p => p.duration).map(p => p.duration!);
  const avgMTTR    = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  const totalCost  = problems.reduce((s, p) => s + estimateCost(p).total, 0);
  const totalUsers = problems.reduce((s, p) => s + (p.affectedUsers ?? 0), 0);
  const autoRes    = problems.filter(p => p.status === 'RESOLVED' && p.duration && p.duration <= 15 && !p.affectedUsers).length;
  const hasRCA     = problems.some(p => p.hasRootCause);
  const rcaValues  = [...new Set(problems.filter(p => p.hasRootCause && p.rootCauseEntity).map(p => p.rootCauseEntity!.name))];

  // Hour cluster detection
  const hours = problems.map(p => new Date(p.startTime).getUTCHours());
  const hourCounts: Record<number, number> = {};
  hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
  const maxHourCount   = Math.max(...Object.values(hourCounts));
  const dominantHour   = parseInt(Object.keys(hourCounts).find(h => hourCounts[parseInt(h)] === maxHourCount) ?? '0');
  const hasTimeCluster = maxHourCount / problems.length >= 0.6 && problems.length >= 3;

  // Recurrence score
  const daySpan     = Math.max(1, (times[times.length - 1] - times[0]) / 86400000);
  const dailyRate   = problems.length / daySpan;
  const recScore    = Math.min(100, Math.round(
    dailyRate >= 3 ? 100 : dailyRate >= 1 ? 80 : dailyRate >= 0.5 ? 60 : dailyRate * 120
  ));

  // Trend
  const mid         = Math.floor(problems.length / 2);
  const firstSpan   = problems.length >= 4 ? ((times[mid - 1] - times[0]) / 86400000 || 1) : 1;
  const secondSpan  = problems.length >= 4 ? ((times[times.length - 1] - times[mid]) / 86400000 || 1) : 1;
  const firstRate   = mid / firstSpan;
  const secondRate  = (problems.length - mid) / secondSpan;
  const trend       = problems.length < 3          ? 'STABLE'
    : secondRate > firstRate * 1.3                 ? 'INCREASING'
    : secondRate < firstRate * 0.7                 ? 'DECREASING'
    : 'STABLE';

  const sparkData: TrendPoint[] = problems.map(p => ({
    timestamp: p.startTime,
    value:     estimateCost(p).total,
  }));
  const dimensions = buildPatternDimensions(problems);
  const uniqueTitles = new Set(problems.map(p => normaliseTitle(p.title))).size;
  const clusterPurity = Math.max(0, Math.min(1, 1 - ((uniqueTitles - 1) / problems.length)));
  const rcaConsistency = rcaValues.length === 1 ? 1 : rcaValues.length > 1 ? 0.5 : 0;
  const dimensionPurity = dimensions.dimensionPurity;
  const concentration = level(clusterPurity * 0.3 + (rcaConsistency || 0.2) * 0.3 + dimensionPurity * 0.4);
  const fixability = level(rcaConsistency * 0.45 + (recScore / 100) * 0.2 + clusterPurity * 0.15 + dimensionPurity * 0.2);
  const confidence = level(clusterPurity * 0.25 + rcaConsistency * 0.3 + dimensionPurity * 0.2 + Math.min(problems.length / 5, 1) * 0.25);

  const recommendation = recommendAction({
    recurrenceScore:     recScore,
    autoResolveRate:     autoRes / problems.length,
    avgDuration:         avgMTTR,
    avgUsersAffected:    totalUsers / problems.length,
    avgImpactScore:      problems.reduce((s, p) => s + (p.operationalImpactScore ?? 0), 0) / problems.length,
    hasTimeCluster,
    dominantHour,
    hasRCA,
    consistentRCA:       rcaValues.length === 1,
    rcaLabel:            rcaValues[0] ?? null,
    frequency:           problems.length,
    trend,
    totalCost,
  });

  return {
    patternId:       `pat-${patternSignature(problems[0]).replace(/\W+/g, '-').substring(0, 36)}`,
    signature:       patternSignature(problems[0]),
    causalEntity:    patternEntityKey(problems[0]),
    dimensions,
    title:           problems[0].businessTitle ?? problems[0].title,
    occurrences:     problems.length,
    firstSeen:       times[0],
    lastSeen:        times[times.length - 1],
    avgMTTR,
    maxMTTR:         Math.max(...durations, 0),
    totalCost,
    totalUsers,
    affectedServices:[...new Set(problems.flatMap(p => p.impactedEntities.map(e => e.name)))],
    severity:        problems[0].severity,
    problems,
    trend:           trend as ProblemPattern['trend'],
    concentration,
    fixability,
    confidence,
    recurrenceScore: recScore,
    hasTimeCluster,
    dominantHour,
    hasRCA,
    autoResolveRate: autoRes / problems.length,
    sparkData,
    recommendation,
  };
}

// ── Recommendation engine ─────────────────────────────────

interface RecommendationInput {
  recurrenceScore:  number;
  autoResolveRate:  number;
  avgDuration:      number;
  avgUsersAffected: number;
  avgImpactScore:   number;
  hasTimeCluster:   boolean;
  dominantHour:     number;
  hasRCA:           boolean;
  consistentRCA:    boolean;
  rcaLabel:         string | null;
  frequency:        number;
  trend:            string;
  totalCost:        number;
}

export function recommendAction(p: RecommendationInput): PatternRecommendation {
  // Noisy alert — auto-resolves, short, no users
  if (p.autoResolveRate >= 0.75 && p.avgDuration <= 15 && p.avgUsersAffected === 0) {
    return {
      type: 'DISABLE_ALERT', confidence: 92,
      text: `Fires ${p.frequency}× but resolves automatically in ≤15 min with zero user impact. Strong candidate for suppression.`,
      config: p.hasTimeCluster
        ? `alert.suppress(window="${String(p.dominantHour).padStart(2,'0')}:00–${String((p.dominantHour+2)%24).padStart(2,'0')}:00")`
        : `alert.disable(pattern="${p.rcaLabel ?? 'this-service'}", until_reviewed=true)`,
    };
  }

  // Time-windowed noise
  if (p.hasTimeCluster && p.avgDuration <= 20 && p.avgUsersAffected < 100) {
    return {
      type: 'ADD_TIME_WINDOW', confidence: 85,
      text: `Events cluster around ${String(p.dominantHour).padStart(2,'0')}:00 UTC — likely a batch job or deployment window.`,
      config: `alert.suppress_window(start="${String(p.dominantHour).padStart(2,'0')}:00", duration="2h", days="all")`,
    };
  }

  // Threshold too sensitive
  if (p.frequency >= 4 && p.avgImpactScore < 45 && p.avgDuration <= 30) {
    return {
      type: 'RAISE_THRESHOLD', confidence: 78,
      text: `Alert too sensitive — firing ${p.frequency}× with avg impact ${Math.round(p.avgImpactScore)} and ${Math.round(p.avgDuration)}m resolution.`,
      config: `alert.threshold(sensitivity="lower", min_duration="10m", eval_window="5m")`,
    };
  }

  // Known root cause — fix it
  if (p.hasRCA && p.consistentRCA && p.recurrenceScore >= 60 && p.avgUsersAffected >= 500) {
    return {
      type: 'FIX_ROOT_CAUSE', confidence: 91,
      text: `Same root cause (${p.rcaLabel}) every time. This is unresolved technical debt surfacing as repeated incidents.`,
      config: `problem.root_cause="${p.rcaLabel}" // assign to owning team for permanent fix`,
    };
  }

  // No RCA — investigate first
  if (!p.hasRCA && p.frequency >= 3) {
    return {
      type: 'INVESTIGATE_FIRST', confidence: 88,
      text: `Occurred ${p.frequency}× with no root cause ever documented. Attach Live Debugger to next occurrence.`,
      config: `live_debugger.arm(trigger="next_occurrence", capture=["variables","stack","request"])`,
    };
  }

  return {
    type: 'TUNE_FREQUENCY', confidence: 65,
    text: `Real problem worth alerting on, but may be firing before impact fully materialises.`,
    config: `alert.evaluation_window="5m", alert.consecutive_breaches=3`,
  };
}

// ── Trend detection ───────────────────────────────────────

export function detectTrend(points: TrendPoint[]): 'INCREASING' | 'STABLE' | 'DECREASING' {
  if (points.length < 3) return 'STABLE';
  const n     = points.length;
  const sumX  = points.reduce((a, _, i) => a + i, 0);
  const sumY  = points.reduce((a, p)    => a + p.value, 0);
  const sumXY = points.reduce((a, p, i) => a + i * p.value, 0);
  const sumX2 = points.reduce((a, _, i) => a + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  if (slope >  0.2) return 'INCREASING';
  if (slope < -0.2) return 'DECREASING';
  return 'STABLE';
}

// ── Format helpers ────────────────────────────────────────

export function formatMTTR(minutes: number): string {
  if (!minutes || minutes === 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatRelativeTime(epochMs: number): string {
  const diff    = Date.now() - epochMs;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60)  return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours   < 24)  return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function rankByImpact(problems: DynatraceProblem[]): DynatraceProblem[] {
  return [...problems].sort((a, b) =>
    (b.operationalImpactScore ?? 0) - (a.operationalImpactScore ?? 0)
  );
}
