import { MttrTrendDirection, PatternTrendEnrichment } from '../models';
import {
  MIN_PERIOD_OBSERVATIONS,
  MTTR_TREND_NEUTRAL_TOLERANCE_PCT,
  median,
  percentile,
} from './pattern-trend-enrichment';

export type MttrTrendStats = {
  previousResolvedCount: number;
  currentResolvedCount: number;
  medianPrevious?: number;
  medianCurrent?: number;
  p85Previous?: number;
  p85Current?: number;
  deltaPercent?: number;
  direction: MttrTrendDirection;
};

export type MttrTrendReconciliationStatus =
  | 'MATCH'
  | 'MINOR_DIFFERENCE'
  | 'MISMATCH'
  | 'INSUFFICIENT_DATA';

export type MttrTrendReconciliation = {
  status: MttrTrendReconciliationStatus;
  client: MttrTrendStats;
  dql?: MttrTrendStats;
  differences: {
    medianPrevious?: number;
    medianCurrent?: number;
    p85Previous?: number;
    p85Current?: number;
  };
  reason: string;
  lastRunTime?: string;
  rowCount?: number;
  error?: string;
};

export type DqlMttrTrendRecord = {
  period?: unknown;
  resolvedCount?: unknown;
  medianMttr?: unknown;
  p85Mttr?: unknown;
};

export type DqlMttrProblemRecord = {
  status?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  nativeDuration?: unknown;
};

function pctDelta(current: number, previous: number): number | undefined {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 100);
}

function directionForMedian(current: number | undefined, previous: number | undefined, currentCount: number, previousCount: number): MttrTrendDirection {
  if (currentCount < MIN_PERIOD_OBSERVATIONS || previousCount < MIN_PERIOD_OBSERVATIONS) return 'insufficient_data';
  if (!Number.isFinite(current) || !Number.isFinite(previous) || !current || !previous) return 'insufficient_data';
  const delta = pctDelta(current, previous);
  if (delta === undefined) return 'insufficient_data';
  if (delta > MTTR_TREND_NEUTRAL_TOLERANCE_PCT) return 'worsening';
  if (delta < -MTTR_TREND_NEUTRAL_TOLERANCE_PCT) return 'improving';
  return 'stable';
}

export function buildMttrTrendStats(previousDurations: number[], currentDurations: number[]): MttrTrendStats {
  const previous = previousDurations.filter(value => Number.isFinite(value) && value > 0);
  const current = currentDurations.filter(value => Number.isFinite(value) && value > 0);
  const medianPrevious = median(previous);
  const medianCurrent = median(current);
  const p85Previous = percentile(previous, 85);
  const p85Current = percentile(current, 85);
  const direction = directionForMedian(medianCurrent, medianPrevious, current.length, previous.length);
  return {
    previousResolvedCount: previous.length,
    currentResolvedCount: current.length,
    medianPrevious,
    medianCurrent,
    p85Previous,
    p85Current,
    deltaPercent: direction === 'insufficient_data' || medianCurrent === undefined || medianPrevious === undefined
      ? undefined
      : pctDelta(medianCurrent, medianPrevious),
    direction,
  };
}

export function clientMttrTrendStats(enrichment?: PatternTrendEnrichment): MttrTrendStats {
  const trend = enrichment?.mttrTrend;
  return {
    previousResolvedCount: trend?.resolvedPreviousCount ?? 0,
    currentResolvedCount: trend?.resolvedCurrentCount ?? 0,
    medianPrevious: trend?.medianPrevious,
    medianCurrent: trend?.medianCurrent,
    p85Previous: trend?.p85Previous,
    p85Current: trend?.p85Current,
    deltaPercent: trend?.deltaPercent,
    direction: trend?.direction ?? 'insufficient_data',
  };
}

export function coerceDurationMinutes(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return undefined;
    if (value > 10_000_000_000) return Math.round(value / 60_000_000_000);
    if (value > 10_000) return Math.round(value / 60_000);
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value.trim());
    if (Number.isFinite(numeric) && numeric > 0) return coerceDurationMinutes(numeric);
  }
  if (typeof value === 'object' && value && 'seconds' in value) {
    const duration = value as { seconds?: number; nanos?: number };
    const minutes = ((duration.seconds ?? 0) / 60) + ((duration.nanos ?? 0) / 60_000_000_000);
    return minutes > 0 ? Math.round(minutes) : undefined;
  }
  return undefined;
}

function coerceTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value > 1e15 ? Math.floor(value / 1e6) : value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function durationMinutesFromDqlProblemRecord(record: DqlMttrProblemRecord): number | undefined {
  const native = coerceDurationMinutes(record.nativeDuration);
  if (native !== undefined) return native;
  const start = coerceTimestamp(record.startTime);
  const end = coerceTimestamp(record.endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end! <= start!) return undefined;
  return Math.round((end! - start!) / 60000);
}

export function mttrStatsFromDqlProblemRecords(records: DqlMttrProblemRecord[], bounds: { from: number; to: number }): MttrTrendStats {
  const midpoint = bounds.from + ((bounds.to - bounds.from) / 2);
  const previous: number[] = [];
  const current: number[] = [];
  records.forEach(record => {
    const status = String(record.status ?? '').toUpperCase();
    if (status !== 'RESOLVED' && status !== 'CLOSED') return;
    const start = coerceTimestamp(record.startTime);
    if (!Number.isFinite(start) || start! < bounds.from || start! >= bounds.to) return;
    const duration = durationMinutesFromDqlProblemRecord(record);
    if (!Number.isFinite(duration) || !duration || duration <= 0) return;
    if (start! < midpoint) previous.push(duration);
    else current.push(duration);
  });
  return buildMttrTrendStats(previous, current);
}

function numberValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function mttrStatsFromDqlRecords(records: DqlMttrTrendRecord[]): MttrTrendStats {
  const previous = records.find(record => String(record.period ?? '').toLowerCase() === 'previous');
  const current = records.find(record => String(record.period ?? '').toLowerCase() === 'current');
  const previousResolvedCount = numberValue(previous?.resolvedCount);
  const currentResolvedCount = numberValue(current?.resolvedCount);
  const medianPrevious = coerceDurationMinutes(previous?.medianMttr);
  const medianCurrent = coerceDurationMinutes(current?.medianMttr);
  const p85Previous = coerceDurationMinutes(previous?.p85Mttr);
  const p85Current = coerceDurationMinutes(current?.p85Mttr);
  const direction = directionForMedian(medianCurrent, medianPrevious, currentResolvedCount, previousResolvedCount);
  return {
    previousResolvedCount,
    currentResolvedCount,
    medianPrevious,
    medianCurrent,
    p85Previous,
    p85Current,
    deltaPercent: direction === 'insufficient_data' || medianCurrent === undefined || medianPrevious === undefined
      ? undefined
      : pctDelta(medianCurrent, medianPrevious),
    direction,
  };
}

function diff(a?: number, b?: number): number | undefined {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return Math.round(Math.abs(a! - b!) * 100) / 100;
}

function aligned(a?: number, b?: number): boolean {
  const difference = diff(a, b);
  if (difference === undefined) return false;
  if (difference <= 1) return true;
  const baseline = Math.max(Math.abs(a ?? 0), Math.abs(b ?? 0), 1);
  return (difference / baseline) * 100 <= MTTR_TREND_NEUTRAL_TOLERANCE_PCT;
}

export function reconcileMttrTrend(client: MttrTrendStats, dql?: MttrTrendStats, meta: { lastRunTime?: string; rowCount?: number; error?: string } = {}): MttrTrendReconciliation {
  const differences = {
    medianPrevious: diff(client.medianPrevious, dql?.medianPrevious),
    medianCurrent: diff(client.medianCurrent, dql?.medianCurrent),
    p85Previous: diff(client.p85Previous, dql?.p85Previous),
    p85Current: diff(client.p85Current, dql?.p85Current),
  };

  if (!dql || meta.error) {
    return {
      status: 'INSUFFICIENT_DATA',
      client,
      dql,
      differences,
      reason: meta.error || 'DQL MTTR validation has not produced usable period statistics.',
      ...meta,
    };
  }

  if (client.direction === 'insufficient_data' || dql.direction === 'insufficient_data') {
    return {
      status: 'INSUFFICIENT_DATA',
      client,
      dql,
      differences,
      reason: 'One or both MTTR trend sources have too few resolved problems with valid durations.',
      ...meta,
    };
  }

  const medianAligned = aligned(client.medianPrevious, dql.medianPrevious) && aligned(client.medianCurrent, dql.medianCurrent);
  const p85Aligned = aligned(client.p85Previous, dql.p85Previous) && aligned(client.p85Current, dql.p85Current);
  if (client.direction === dql.direction && medianAligned && p85Aligned) {
    return { status: 'MATCH', client, dql, differences, reason: 'Client and DQL MTTR trend statistics align.', ...meta };
  }
  if (client.direction === dql.direction && medianAligned) {
    return { status: 'MINOR_DIFFERENCE', client, dql, differences, reason: 'Median trend aligns; supporting p85 values differ slightly.', ...meta };
  }
  return {
    status: 'MISMATCH',
    client,
    dql,
    differences,
    reason: 'Client and DQL MTTR validation disagree on direction or median period values.',
    ...meta,
  };
}
