import { CustomAlertEntityBindingLevel, DynatraceProblem, Entity, PatternTrendEnrichment, ProblemPattern, Severity } from '../models';

export const MTTR_TREND_NEUTRAL_TOLERANCE_PCT = 15;
export const MIN_PERIOD_OBSERVATIONS = 2;
export const MIN_SCHEDULE_OCCURRENCES = 3;
export const SCHEDULE_CONFIDENCE_THRESHOLD = 0.6;
export const SHORT_LIVED_THRESHOLD_MINUTES = 15;

export type TimeframeBounds = {
  from: number;
  to: number;
  evaluationNow: number;
};

export type PeriodSplit = {
  previousStart: number;
  previousEnd: number;
  currentStart: number;
  currentEnd: number;
};

export type ObjectiveInterpretation = {
  label: 'Tuning candidate' | 'Review candidate' | 'Impactful alert - retain' | 'Insufficient evidence';
  observations: string[];
};

const GENERIC_ENTITY_NAMES = new Set(['SERVICE', 'HOST', 'APPLICATION', 'PROCESS_GROUP', 'UNKNOWN']);

type CreationTrendDirection = NonNullable<PatternTrendEnrichment['creationRate']>['direction'];
type MedianMttrTrendDirection = NonNullable<PatternTrendEnrichment['mttrTrend']>['direction'];

function isFinitePositive(value: number | undefined): value is number {
  return Number.isFinite(value) && Number(value) > 0;
}

function pctDelta(current: number, previous: number): number | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

function directionFromCounts(current: number, previous: number): CreationTrendDirection {
  const delta = pctDelta(current, previous);
  if (current + previous < MIN_PERIOD_OBSERVATIONS || delta === undefined) return 'insufficient_data';
  if (delta > MTTR_TREND_NEUTRAL_TOLERANCE_PCT) return 'increasing';
  if (delta < -MTTR_TREND_NEUTRAL_TOLERANCE_PCT) return 'decreasing';
  return 'stable';
}

function mttrDirection(current: number | undefined, previous: number | undefined): MedianMttrTrendDirection {
  if (!isFinitePositive(current) || !isFinitePositive(previous)) return 'insufficient_data';
  const delta = pctDelta(current, previous);
  if (delta === undefined) return 'insufficient_data';
  if (delta > MTTR_TREND_NEUTRAL_TOLERANCE_PCT) return 'worsening';
  if (delta < -MTTR_TREND_NEUTRAL_TOLERANCE_PCT) return 'improving';
  return 'stable';
}

export function splitTimeframe(bounds?: Partial<TimeframeBounds>): PeriodSplit | null {
  if (!bounds || !Number.isFinite(bounds.from) || !Number.isFinite(bounds.to) || bounds.to! <= bounds.from!) return null;
  const midpoint = bounds.from! + ((bounds.to! - bounds.from!) / 2);
  if (midpoint <= bounds.from! || midpoint >= bounds.to!) return null;
  return {
    previousStart: bounds.from!,
    previousEnd: midpoint,
    currentStart: midpoint,
    currentEnd: bounds.to!,
  };
}

function inRange(value: number | undefined, start: number, end: number): boolean {
  return Number.isFinite(value) && value! >= start && value! < end;
}

function validStarts(problems: DynatraceProblem[]): number[] {
  return problems.map(problem => problem.startTime).filter(isFinitePositive).sort((a, b) => a - b);
}

function countStarts(problems: DynatraceProblem[], start: number, end: number): number {
  return problems.filter(problem => inRange(problem.startTime, start, end)).length;
}

export function median(values: number[]): number | undefined {
  const clean = values.filter(isFinitePositive).sort((a, b) => a - b);
  if (!clean.length) return undefined;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

export function percentile(values: number[], percentileValue: number): number | undefined {
  const clean = values.filter(isFinitePositive).sort((a, b) => a - b);
  if (!clean.length) return undefined;
  const index = Math.min(clean.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * clean.length) - 1));
  return clean[index];
}

function resolvedDurations(problems: DynatraceProblem[], start: number, end: number): number[] {
  return problems
    .filter(problem => (problem.status === 'RESOLVED' || problem.status === 'CLOSED') && inRange(problem.startTime, start, end))
    .map(problem => Number(problem.duration))
    .filter(isFinitePositive);
}

function buildCreationRate(problems: DynatraceProblem[], split: PeriodSplit | null): PatternTrendEnrichment['creationRate'] {
  if (!split) return { currentPeriodCount: 0, direction: 'insufficient_data' };
  const previous = countStarts(problems, split.previousStart, split.previousEnd);
  const current = countStarts(problems, split.currentStart, split.currentEnd);
  const direction = directionFromCounts(current, previous);
  return {
    currentPeriodCount: current,
    previousPeriodCount: previous,
    deltaPercent: pctDelta(current, previous),
    direction,
  };
}

function selectedTimeframeDays(problems: DynatraceProblem[], bounds?: TimeframeBounds): number | undefined {
  if (bounds && Number.isFinite(bounds.from) && Number.isFinite(bounds.to) && bounds.to > bounds.from) {
    return Math.max((bounds.to - bounds.from) / 86400000, 1 / 24);
  }
  const starts = validStarts(problems);
  if (starts.length < 2) return undefined;
  return Math.max((starts[starts.length - 1] - starts[0]) / 86400000, 1 / 24);
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildAlertQuality(problems: DynatraceProblem[], bounds?: TimeframeBounds): PatternTrendEnrichment['alertQuality'] {
  const timeframeDays = selectedTimeframeDays(problems, bounds);
  const resolvedWithDuration = problems.filter(problem =>
    (problem.status === 'RESOLVED' || problem.status === 'CLOSED') &&
    isFinitePositive(problem.duration)
  );
  const shortLivedResolvedCount = resolvedWithDuration.filter(problem =>
    Number(problem.duration) <= SHORT_LIVED_THRESHOLD_MINUTES
  ).length;
  const frequentObserved = problems.filter(problem => problem.isFrequentEvent !== undefined);
  const frequentEventCount = frequentObserved.filter(problem => problem.isFrequentEvent === true).length;

  return {
    fireRatePerDay: timeframeDays ? roundMetric(problems.length / timeframeDays) : undefined,
    shortLivedRate: resolvedWithDuration.length ? roundMetric(shortLivedResolvedCount / resolvedWithDuration.length) : undefined,
    shortLivedResolvedCount,
    resolvedOccurrenceCount: resolvedWithDuration.length,
    frequentEventRatio: frequentObserved.length ? roundMetric(frequentEventCount / frequentObserved.length) : undefined,
    frequentEventCount,
    frequentEventObservedCount: frequentObserved.length,
  };
}

function dominantSeverity(problems: DynatraceProblem[]): Severity | undefined {
  const counts = new Map<Severity, number>();
  problems.forEach(problem => counts.set(problem.severity, (counts.get(problem.severity) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function hasEntityId(entity: Entity | undefined): boolean {
  return Boolean(entity?.entityId && String(entity.entityId).trim());
}

function hasAnyEntityContext(entity: Entity | undefined): boolean {
  return Boolean(entity && (hasEntityId(entity) || readableEntityName(entity.name) || String(entity.type || '').trim()));
}

function hasConcreteEntityBinding(entity: Entity | undefined): boolean {
  return Boolean(hasEntityId(entity) && readableEntityName(entity?.name));
}

function buildCustomAlertEntityBinding(problems: DynatraceProblem[]): PatternTrendEnrichment['customAlertEntityBinding'] {
  if (dominantSeverity(problems) !== 'CUSTOM_ALERT') return undefined;

  const customAlerts = problems.filter(problem => problem.severity === 'CUSTOM_ALERT');
  const concreteCount = customAlerts.filter(problem =>
    hasConcreteEntityBinding(problem.rootCauseEntity) ||
    problem.impactedEntities.some(hasConcreteEntityBinding)
  ).length;
  const partialCount = customAlerts.filter(problem =>
    hasAnyEntityContext(problem.rootCauseEntity) ||
    problem.impactedEntities.some(hasAnyEntityContext)
  ).length;
  const rootCauseCount = customAlerts.filter(problem => hasAnyEntityContext(problem.rootCauseEntity)).length;
  const affectedEntityCount = customAlerts.reduce((sum, problem) => (
    sum + problem.impactedEntities.filter(hasAnyEntityContext).length
  ), 0);

  let level: CustomAlertEntityBindingLevel = 'Weak';
  if (concreteCount > 0) level = 'Strong';
  else if (partialCount > 0) level = 'Partial';

  const reason = level === 'Strong'
    ? `${concreteCount} of ${customAlerts.length} custom-alert records have concrete RCA or affected-entity binding.`
    : level === 'Partial'
      ? `${partialCount} of ${customAlerts.length} custom-alert records have entity context, but resolved names or types are limited.`
      : 'No usable RCA or affected entity is available for this custom-alert pattern.';

  const evidence = [
    'event_category=CUSTOM_ALERT',
    `custom_alert_records=${customAlerts.length}`,
    `concrete_entity_bindings=${concreteCount}`,
    `records_with_entity_context=${partialCount}`,
    `root_cause_entity_records=${rootCauseCount}`,
    `affected_entity_mentions=${affectedEntityCount}`,
  ];

  return { level, reason, evidence };
}

function buildCategoryTrend(problems: DynatraceProblem[], split: PeriodSplit | null): PatternTrendEnrichment['categoryTrend'] | undefined {
  const counts = new Map<Severity, number>();
  problems.forEach(problem => counts.set(problem.severity, (counts.get(problem.severity) ?? 0) + 1));
  const category = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!category) return undefined;
  if (!split) return { category, currentPeriodCount: 0, direction: 'insufficient_data' };
  const scoped = problems.filter(problem => problem.severity === category);
  const previous = countStarts(scoped, split.previousStart, split.previousEnd);
  const current = countStarts(scoped, split.currentStart, split.currentEnd);
  return {
    category,
    currentPeriodCount: current,
    previousPeriodCount: previous,
    deltaPercent: pctDelta(current, previous),
    direction: directionFromCounts(current, previous),
  };
}

function bucketIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

function buildOccurrenceSeries(problems: DynatraceProblem[]): Array<{ timestamp: string; count: number }> {
  const buckets = new Map<string, number>();
  problems.forEach(problem => {
    if (!isFinitePositive(problem.startTime)) return;
    const key = new Date(problem.startTime).toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  });
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ timestamp: `${date}T00:00:00.000Z`, count }));
}

function readableEntityName(name: string | undefined): boolean {
  const clean = String(name || '').trim();
  if (!clean) return false;
  if (GENERIC_ENTITY_NAMES.has(clean.toUpperCase())) return false;
  return true;
}

function buildServiceTrend(problems: DynatraceProblem[]): PatternTrendEnrichment['serviceTrend'] | undefined {
  const candidates = problems.flatMap(problem => [
    problem.rootCauseEntity,
    ...problem.impactedEntities,
  ]).filter(Boolean);
  const service = candidates.find(entity => readableEntityName(entity?.name));
  const activeCount = problems.filter(problem => problem.status === 'OPEN').length;
  const closedCount = problems.filter(problem => problem.status === 'RESOLVED' || problem.status === 'CLOSED').length;
  return {
    serviceId: service?.entityId,
    serviceName: service?.name,
    activeCount,
    closedCount,
    occurrenceSeries: buildOccurrenceSeries(problems),
  };
}

function buildLifecycle(problems: DynatraceProblem[], bounds?: TimeframeBounds): PatternTrendEnrichment['lifecycle'] {
  const evaluationNow = bounds?.evaluationNow ?? bounds?.to ?? Date.now();
  const events: Array<{ timestamp: number; delta: number }> = [];
  problems.forEach(problem => {
    if (!isFinitePositive(problem.startTime)) return;
    const end = isFinitePositive(problem.endTime) ? problem.endTime! : evaluationNow;
    if (end <= problem.startTime) return;
    events.push({ timestamp: problem.startTime, delta: 1 });
    events.push({ timestamp: end, delta: -1 });
  });
  events.sort((a, b) => a.timestamp - b.timestamp || b.delta - a.delta);
  let active = 0;
  let peak = 0;
  const activeOverTime: Array<{ timestamp: string; count: number }> = [];
  events.forEach(event => {
    active += event.delta;
    peak = Math.max(peak, active);
    activeOverTime.push({ timestamp: bucketIso(event.timestamp), count: active });
  });
  const currentlyActive = problems.filter(problem => problem.status === 'OPEN' && isFinitePositive(problem.startTime) && problem.startTime <= evaluationNow).length;
  return { currentlyActive, peakConcurrentActive: peak, activeOverTime };
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function maxCountEntry(values: number[]): [number, number] | undefined {
  const counts = new Map<number, number>();
  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
}

function buildSchedulePattern(problems: DynatraceProblem[]): PatternTrendEnrichment['schedulePattern'] {
  const starts = validStarts(problems);
  const total = starts.length;
  if (total < MIN_SCHEDULE_OCCURRENCES) {
    return { matchingOccurrences: 0, totalOccurrences: total, confidence: 0 };
  }
  const hours = starts.map(timestamp => new Date(timestamp).getUTCHours());
  const days = starts.map(timestamp => new Date(timestamp).getUTCDay());
  const peakHour = maxCountEntry(hours);
  const peakDay = maxCountEntry(days);
  const hourCount = peakHour?.[1] ?? 0;
  const dayCount = peakDay?.[1] ?? 0;
  const matchingOccurrences = starts.filter(timestamp => {
    const date = new Date(timestamp);
    return date.getUTCHours() === peakHour?.[0] && date.getUTCDay() === peakDay?.[0];
  }).length || Math.max(hourCount, dayCount);
  const confidence = Math.max(hourCount / total, dayCount / total);
  const label = confidence >= SCHEDULE_CONFIDENCE_THRESHOLD && peakHour && peakDay
    ? `${matchingOccurrences} of ${total} occurrences were observed around ${String(peakHour[0]).padStart(2, '0')}:00 UTC on ${DAY_NAMES[peakDay[0]]}s.`
    : undefined;
  return {
    peakHour: peakHour?.[0],
    peakDay: peakDay ? DAY_NAMES[peakDay[0]] : undefined,
    matchingOccurrences,
    totalOccurrences: total,
    confidence: Math.round(confidence * 100) / 100,
    label,
  };
}

function buildMttrTrend(problems: DynatraceProblem[], split: PeriodSplit | null): PatternTrendEnrichment['mttrTrend'] {
  if (!split) {
    return { direction: 'insufficient_data', resolvedCurrentCount: 0, resolvedPreviousCount: 0 };
  }
  const previousDurations = resolvedDurations(problems, split.previousStart, split.previousEnd);
  const currentDurations = resolvedDurations(problems, split.currentStart, split.currentEnd);
  const medianPrevious = median(previousDurations);
  const medianCurrent = median(currentDurations);
  const p85Previous = percentile(previousDurations, 85);
  const p85Current = percentile(currentDurations, 85);
  const enough = previousDurations.length >= MIN_PERIOD_OBSERVATIONS && currentDurations.length >= MIN_PERIOD_OBSERVATIONS;
  return {
    medianCurrent,
    medianPrevious,
    p85Current,
    p85Previous,
    deltaPercent: medianCurrent !== undefined && medianPrevious !== undefined ? pctDelta(medianCurrent, medianPrevious) : undefined,
    direction: enough ? mttrDirection(medianCurrent, medianPrevious) : 'insufficient_data',
    resolvedCurrentCount: currentDurations.length,
    resolvedPreviousCount: previousDurations.length,
  };
}

function nativeAffectedUser(problem: DynatraceProblem): number | undefined {
  if (problem.affectedUsers === undefined || problem.affectedUsers === null) return undefined;
  const value = Number(problem.affectedUsers);
  return Number.isFinite(value) ? value : undefined;
}

function userSum(problems: DynatraceProblem[], start: number, end: number): number {
  return problems
    .filter(problem => inRange(problem.startTime, start, end))
    .map(nativeAffectedUser)
    .filter((value): value is number => value !== undefined)
    .reduce((sum, value) => sum + value, 0);
}

function buildUserImpactTrend(problems: DynatraceProblem[], split: PeriodSplit | null): PatternTrendEnrichment['userImpactTrend'] {
  const nativeValues = problems.map(nativeAffectedUser).filter((value): value is number => value !== undefined);
  const totalAffectedUsers = nativeValues.reduce((sum, value) => sum + value, 0);
  if (!nativeValues.length || !split) {
    return {
      totalAffectedUsers,
      source: 'unavailable',
      direction: 'insufficient_data',
    };
  }
  const previous = userSum(problems, split.previousStart, split.previousEnd);
  const current = userSum(problems, split.currentStart, split.currentEnd);
  return {
    totalAffectedUsers,
    averageAffectedUsersPerProblem: totalAffectedUsers / nativeValues.length,
    currentPeriodUsers: current,
    previousPeriodUsers: previous,
    deltaPercent: pctDelta(current, previous),
    direction: directionFromCounts(current, previous),
    source: 'affected_users',
  };
}

function dataQuality(enrichment: Omit<PatternTrendEnrichment, 'dataQuality'>): PatternTrendEnrichment['dataQuality'] {
  const limitations: string[] = [];
  if (!enrichment.creationRate || enrichment.creationRate.direction === 'insufficient_data') limitations.push('Creation trend needs enough observations in both comparison periods.');
  if (!enrichment.mttrTrend || enrichment.mttrTrend.direction === 'insufficient_data') limitations.push('Median MTTR trend needs resolved problems with valid durations in both periods.');
  if (!enrichment.userImpactTrend || enrichment.userImpactTrend.source === 'unavailable') limitations.push('Native affected-user evidence is unavailable for this pattern.');
  if (!enrichment.schedulePattern?.label) limitations.push('Schedule evidence is limited to neutral occurrence timing and does not prove a scheduled job or deployment.');
  if (enrichment.alertQuality?.frequentEventRatio === undefined) limitations.push('Davis frequent-event evidence is unavailable for this pattern.');
  return {
    creationTrendAvailable: Boolean(enrichment.creationRate && enrichment.creationRate.direction !== 'insufficient_data'),
    lifecycleAvailable: Boolean(enrichment.lifecycle),
    mttrTrendAvailable: Boolean(enrichment.mttrTrend && enrichment.mttrTrend.direction !== 'insufficient_data'),
    userImpactAvailable: Boolean(enrichment.userImpactTrend && enrichment.userImpactTrend.source === 'affected_users'),
    scheduleEvidenceAvailable: Boolean(enrichment.schedulePattern?.label),
    alertQualityAvailable: Boolean(enrichment.alertQuality && (enrichment.alertQuality.fireRatePerDay !== undefined || enrichment.alertQuality.shortLivedRate !== undefined || enrichment.alertQuality.frequentEventRatio !== undefined)),
    limitations,
  };
}

export function buildTrendEnrichment(problems: DynatraceProblem[], bounds?: TimeframeBounds): PatternTrendEnrichment {
  const split = splitTimeframe(bounds);
  const partial = {
    alertQuality: buildAlertQuality(problems, bounds),
    customAlertEntityBinding: buildCustomAlertEntityBinding(problems),
    creationRate: buildCreationRate(problems, split),
    lifecycle: buildLifecycle(problems, bounds),
    categoryTrend: buildCategoryTrend(problems, split),
    serviceTrend: buildServiceTrend(problems),
    schedulePattern: buildSchedulePattern(problems),
    mttrTrend: buildMttrTrend(problems, split),
    userImpactTrend: buildUserImpactTrend(problems, split),
  };
  return {
    ...partial,
    dataQuality: dataQuality(partial),
  };
}

export function enrichPattern(pattern: ProblemPattern, bounds?: TimeframeBounds): ProblemPattern {
  return {
    ...pattern,
    trendEnrichment: buildTrendEnrichment(pattern.problems, bounds),
  };
}

export function enrichPatterns(patterns: ProblemPattern[], bounds?: TimeframeBounds): ProblemPattern[] {
  return patterns.map(pattern => enrichPattern(pattern, bounds));
}

export function compactTrendEvidence(enrichment?: PatternTrendEnrichment): Record<string, string | number | string[] | Record<string, string | number | string[]>> | undefined {
  if (!enrichment) return undefined;
  const evidence: Record<string, string | number | string[] | Record<string, string | number | string[]>> = {};
  if (enrichment.creationRate?.direction && enrichment.creationRate.direction !== 'insufficient_data') {
    evidence.creationDirection = enrichment.creationRate.direction;
    if (enrichment.creationRate.deltaPercent !== undefined) evidence.creationDeltaPercent = enrichment.creationRate.deltaPercent;
  }
  if (enrichment.lifecycle) {
    evidence.currentlyActive = enrichment.lifecycle.currentlyActive;
    if (enrichment.lifecycle.peakConcurrentActive !== undefined) evidence.peakConcurrentActive = enrichment.lifecycle.peakConcurrentActive;
  }
  if (enrichment.schedulePattern?.label) {
    evidence.peakWindow = enrichment.schedulePattern.label;
    evidence.peakWindowEvidence = `${enrichment.schedulePattern.matchingOccurrences} of ${enrichment.schedulePattern.totalOccurrences} occurrences`;
  }
  if (enrichment.mttrTrend?.direction && enrichment.mttrTrend.direction !== 'insufficient_data') {
    evidence.mttrDirection = enrichment.mttrTrend.direction;
    if (enrichment.mttrTrend.medianPrevious !== undefined) evidence.medianMttrPrevious = enrichment.mttrTrend.medianPrevious;
    if (enrichment.mttrTrend.medianCurrent !== undefined) evidence.medianMttrCurrent = enrichment.mttrTrend.medianCurrent;
    if (enrichment.mttrTrend.deltaPercent !== undefined) evidence.medianMttrDeltaPercent = enrichment.mttrTrend.deltaPercent;
    if (enrichment.mttrTrend.p85Previous !== undefined) evidence.p85MttrPrevious = enrichment.mttrTrend.p85Previous;
    if (enrichment.mttrTrend.p85Current !== undefined) evidence.p85MttrCurrent = enrichment.mttrTrend.p85Current;
    evidence.resolvedPreviousCount = enrichment.mttrTrend.resolvedPreviousCount;
    evidence.resolvedCurrentCount = enrichment.mttrTrend.resolvedCurrentCount;
    if (enrichment.mttrTrend.p85Current && enrichment.mttrTrend.p85Previous) {
      const p85Delta = pctDelta(enrichment.mttrTrend.p85Current, enrichment.mttrTrend.p85Previous);
      if (p85Delta !== undefined) evidence.p85MttrDeltaPercent = p85Delta;
    }
  }
  if (enrichment.userImpactTrend?.source === 'affected_users' && enrichment.userImpactTrend.direction !== 'insufficient_data') {
    evidence.affectedUsersDirection = enrichment.userImpactTrend.direction;
    if (enrichment.userImpactTrend.deltaPercent !== undefined) evidence.affectedUsersDeltaPercent = enrichment.userImpactTrend.deltaPercent;
  }
  if (enrichment.alertQuality) {
    if (enrichment.alertQuality.fireRatePerDay !== undefined) evidence.fireRatePerDay = enrichment.alertQuality.fireRatePerDay;
    if (enrichment.alertQuality.shortLivedRate !== undefined) {
      evidence.shortLivedRate = enrichment.alertQuality.shortLivedRate;
      evidence.shortLivedEvidence = `${enrichment.alertQuality.shortLivedResolvedCount} of ${enrichment.alertQuality.resolvedOccurrenceCount} resolved occurrences <= ${SHORT_LIVED_THRESHOLD_MINUTES}m`;
    }
    if (enrichment.alertQuality.frequentEventRatio !== undefined) {
      evidence.frequentEventRatio = enrichment.alertQuality.frequentEventRatio;
      evidence.frequentEventEvidence = `${enrichment.alertQuality.frequentEventCount} of ${enrichment.alertQuality.frequentEventObservedCount} records marked frequent by Davis`;
    }
  }
  if (enrichment.customAlertEntityBinding) {
    evidence.customAlertEntityBinding = {
      level: enrichment.customAlertEntityBinding.level,
      reason: enrichment.customAlertEntityBinding.reason,
      evidence: enrichment.customAlertEntityBinding.evidence,
    };
  }
  if (enrichment.dataQuality.limitations.length) evidence.limitations = enrichment.dataQuality.limitations.slice(0, 4);
  return Object.keys(evidence).length ? evidence : undefined;
}

export function trendObservation(enrichment?: PatternTrendEnrichment): string | null {
  if (!enrichment) return null;
  if (enrichment.creationRate?.direction === 'increasing' && enrichment.creationRate.deltaPercent !== undefined) {
    return `Occurrences increased ${enrichment.creationRate.deltaPercent}% compared with the preceding period.`;
  }
  if (enrichment.mttrTrend?.direction === 'worsening' && enrichment.mttrTrend.deltaPercent !== undefined) {
    return `Median MTTR worsened ${enrichment.mttrTrend.deltaPercent}% compared with the preceding period.`;
  }
  if (enrichment.userImpactTrend?.source === 'affected_users' && enrichment.userImpactTrend.direction === 'increasing' && enrichment.userImpactTrend.deltaPercent !== undefined) {
    return `Affected-user volume increased ${enrichment.userImpactTrend.deltaPercent}% compared with the preceding period.`;
  }
  if (enrichment.lifecycle && enrichment.lifecycle.currentlyActive > 0) {
    return `${enrichment.lifecycle.currentlyActive} problems remain active for this pattern.`;
  }
  if (enrichment.alertQuality?.shortLivedRate !== undefined && enrichment.alertQuality.shortLivedRate >= 0.75) {
    return `${Math.round(enrichment.alertQuality.shortLivedRate * 100)}% of resolved occurrences closed within ${SHORT_LIVED_THRESHOLD_MINUTES} minutes.`;
  }
  if (enrichment.alertQuality?.fireRatePerDay !== undefined && enrichment.alertQuality.fireRatePerDay >= 1) {
    return `This pattern appears ${enrichment.alertQuality.fireRatePerDay} times per day in the selected timeframe.`;
  }
  if (enrichment.schedulePattern?.label) return enrichment.schedulePattern.label;
  return null;
}

export function objectiveInterpretation(objective: 'cost_impact' | 'alert_optimization', enrichment?: PatternTrendEnrichment): ObjectiveInterpretation {
  const observations = [trendObservation(enrichment)].filter(Boolean) as string[];
  if (!enrichment) return { label: 'Insufficient evidence', observations };
  if (objective === 'alert_optimization') {
    if (enrichment.creationRate?.direction === 'increasing' || enrichment.schedulePattern?.label || (enrichment.alertQuality?.shortLivedRate ?? 0) >= 0.75 || (enrichment.alertQuality?.frequentEventRatio ?? 0) >= 0.5) {
      return { label: 'Review candidate', observations };
    }
    return { label: 'Insufficient evidence', observations };
  }
  if (enrichment.creationRate?.direction === 'increasing' || enrichment.mttrTrend?.direction === 'worsening' || enrichment.userImpactTrend?.direction === 'increasing') {
    return { label: 'Review candidate', observations };
  }
  return { label: 'Insufficient evidence', observations };
}
