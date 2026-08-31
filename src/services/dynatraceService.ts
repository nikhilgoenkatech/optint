// ============================================================
// DYNATRACE OPERATIONAL INTELLIGENCE - DYNATRACE SERVICE
// Real SDK implementation — runs inside Dynatrace AppEngine
// ============================================================
// The SDK clients are pre-authenticated by the AppEngine runtime.
// No API keys are needed in code.

import { queryExecutionClient }    from '@dynatrace-sdk/client-query';
// import { problemsClient, businessEventsIngestClient }
//                                    from '@dynatrace-sdk/client-classic-environment-v2';

import {
  FilterState, DynatraceProblem,
} from '../models';
import { DQL_QUERIES, computeRecurrenceScore, computeOperationalImpactScore } from '../queries/dqlQueries';
import { entityTypeFromId, normalizeEntity, normalizeEntityName } from '../lib/entity-normalization';
import { DqlMttrTrendRecord } from '../lib/mttr-trend-validation';

const PROBLEM_FETCH_CHUNK_SIZE = 5000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// ── Fetch problems via DQL ─────────────────────────────────

export async function fetchProblems(
  filters: FilterState
): Promise<DynatraceProblem[]> {
  const bounds = resolveFilterBounds(filters);
  if (!bounds) {
    const records = await executeProblemQuery(DQL_QUERIES.fetchProblems(filters));
    const deduped = dedupeProblemRecords(records);
    console.info('[Calibrate DQL] Problem retrieval', {
      mode: 'single_unbounded',
      expectedProblemCount: 'unavailable',
      returnedRecords: records.length,
      deduplicatedRecords: deduped.length,
      timeframe: filters.timeRange,
    });
    return deduped.map(mapRecordToProblem);
  }

  const expectedProblemCount = await fetchProblemCount(filters, bounds);
  if (expectedProblemCount <= PROBLEM_FETCH_CHUNK_SIZE) {
    const records = await executeProblemQuery(DQL_QUERIES.fetchProblemsChunk(filters, bounds, PROBLEM_FETCH_CHUNK_SIZE));
    const deduped = dedupeProblemRecords(records);
    logProblemRetrieval({
      mode: 'single',
      expectedProblemCount,
      returnedRecords: records.length,
      deduplicatedRecords: deduped.length,
      chunks: 1,
      bounds,
    });
    return deduped.map(mapRecordToProblem);
  }

  const { records, chunks } = await fetchProblemRecordsByTimeChunks(filters, bounds);
  const deduped = dedupeProblemRecords(records);
  logProblemRetrieval({
    mode: 'chunked_by_time',
    expectedProblemCount,
    returnedRecords: records.length,
    deduplicatedRecords: deduped.length,
    chunks,
    bounds,
  });
  return deduped.map(mapRecordToProblem);
}

async function executeProblemQuery(query: string): Promise<Array<Record<string, unknown>>> {
  const result = await queryExecutionClient.queryExecute({
    body: {
      query,
      requestTimeoutMilliseconds: 15000,
      fetchTimeoutSeconds: 60,
    },
  });
  return (result.result?.records ?? [])
    .filter(Boolean) as Array<Record<string, unknown>>;
}

async function fetchProblemCount(filters: FilterState, bounds: { from: number; to: number }): Promise<number> {
  const result = await queryExecutionClient.queryExecute({
    body: {
      query: DQL_QUERIES.fetchProblemCount(filters, bounds),
      requestTimeoutMilliseconds: 15000,
      fetchTimeoutSeconds: 60,
    },
  });
  const record = (result.result?.records ?? [])[0] as Record<string, unknown> | undefined;
  const count = Number(record?.problem_count ?? 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

async function fetchProblemRecordsByTimeChunks(
  filters: FilterState,
  bounds: { from: number; to: number },
): Promise<{ records: Array<Record<string, unknown>>; chunks: number }> {
  const records: Array<Record<string, unknown>> = [];
  let chunks = 0;

  for (const day of splitBounds(bounds, DAY_MS)) {
    const count = await fetchProblemCount(filters, day);
    if (count === 0) continue;
    if (count <= PROBLEM_FETCH_CHUNK_SIZE) {
      records.push(...await executeProblemQuery(DQL_QUERIES.fetchProblemsChunk(filters, day, PROBLEM_FETCH_CHUNK_SIZE)));
      chunks += 1;
      continue;
    }

    for (const hour of splitBounds(day, HOUR_MS)) {
      const hourCount = await fetchProblemCount(filters, hour);
      if (hourCount === 0) continue;
      if (hourCount > PROBLEM_FETCH_CHUNK_SIZE) {
        console.warn('[Calibrate DQL] Hourly problem chunk exceeds fetch limit; returned data may still be partial', {
          hour,
          expectedProblemCount: hourCount,
          chunkSize: PROBLEM_FETCH_CHUNK_SIZE,
        });
      }
      records.push(...await executeProblemQuery(DQL_QUERIES.fetchProblemsChunk(filters, hour, PROBLEM_FETCH_CHUNK_SIZE)));
      chunks += 1;
    }
  }

  return { records, chunks };
}

function dedupeProblemRecords(records: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const seen = new Set<string>();
  const deduped: Array<Record<string, unknown>> = [];
  for (const record of records) {
    const id = String(record.problemId ?? record.displayId ?? '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push(record);
  }
  return deduped;
}

function splitBounds(bounds: { from: number; to: number }, sizeMs: number): Array<{ from: number; to: number }> {
  const chunks: Array<{ from: number; to: number }> = [];
  for (let from = bounds.from; from < bounds.to; from += sizeMs) {
    chunks.push({ from, to: Math.min(from + sizeMs, bounds.to) });
  }
  return chunks;
}

function resolveFilterBounds(filters: FilterState): { from: number; to: number } | null {
  const now = Date.now();
  const from = resolveTimeExpression(filters.timeRange.from, now);
  const to = resolveTimeExpression(filters.timeRange.to, now);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to! <= from!) return null;
  return { from: from!, to: to! };
}

function resolveTimeExpression(value: string, now: number): number | null {
  const trimmed = value.trim();
  if (trimmed === 'now') return now;
  const relative = trimmed.match(/^now([+-])(\d+)([mhdw])$/i);
  if (relative) {
    const direction = relative[1] === '-' ? -1 : 1;
    const amount = Number(relative[2]);
    const unit = relative[3].toLowerCase();
    const unitMs = unit === 'm' ? 60000 : unit === 'h' ? HOUR_MS : unit === 'w' ? 7 * DAY_MS : DAY_MS;
    return now + direction * amount * unitMs;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function logProblemRetrieval(details: {
  mode: string;
  expectedProblemCount: number;
  returnedRecords: number;
  deduplicatedRecords: number;
  chunks: number;
  bounds: { from: number; to: number };
}): void {
  const isComplete = details.deduplicatedRecords >= details.expectedProblemCount;
  const payload = {
    ...details,
    isComplete,
    chunkSize: PROBLEM_FETCH_CHUNK_SIZE,
    timeframe: {
      from: new Date(details.bounds.from).toISOString(),
      to: new Date(details.bounds.to).toISOString(),
    },
  };
  console.info('[Calibrate DQL] Problem retrieval', payload);
  if (!isComplete) {
    console.warn('[Calibrate DQL] Retrieved fewer problems than the count query reported. Pattern counts may be understated.', payload);
  }
}

export async function fetchPatternMTTRTrendRecords(query: string): Promise<DqlMttrTrendRecord[]> {
  const result = await queryExecutionClient.queryExecute({
    body: {
      query,
      requestTimeoutMilliseconds: 15000,
      fetchTimeoutSeconds: 60,
    },
  });
  return ((result.result?.records ?? []) as Array<Record<string, unknown>>).map(record => ({
    period: record.period,
    resolvedCount: record.resolvedCount,
    medianMttr: record.medianMttr,
    p85Mttr: record.p85Mttr,
  }));
}

function toEpochMs(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') return value > 1e15 ? Math.floor(value / 1e6) : value;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? undefined : ms;
  }
  if (typeof value === 'object' && 'seconds' in value) {
    const duration = value as { seconds?: number; nanos?: number };
    return (duration.seconds ?? 0) * 1000 + Math.floor((duration.nanos ?? 0) / 1e6);
  }
  return undefined;
}

function durationNumberToMinutes(value: number): number | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  if (value > 10_000_000_000) return Math.max(1, Math.round(value / 60_000_000_000)); // nanoseconds
  if (value > 10_000) return Math.max(1, Math.round(value / 60_000)); // milliseconds
  return value; // already minutes
}

function toMinutes(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    return durationNumberToMinutes(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric) && numeric > 0) return durationNumberToMinutes(numeric);

    const iso = trimmed.match(/^P(?:T)?(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/i);
    if (iso) {
      const hours = Number(iso[1] || 0);
      const minutes = Number(iso[2] || 0);
      const seconds = Number(iso[3] || 0);
      const total = hours * 60 + minutes + seconds / 60;
      return total > 0 ? Math.round(total) : undefined;
    }

    const withUnit = trimmed.match(/^(\d+(?:\.\d+)?)\s*(ms|millisecond|milliseconds|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours)$/i);
    if (withUnit) {
      const amount = Number(withUnit[1]);
      const unit = withUnit[2].toLowerCase();
      if (unit.startsWith('ms')) return Math.max(1, Math.round(amount / 60000));
      if (unit === 's' || unit.startsWith('sec')) return Math.max(1, Math.round(amount / 60));
      if (unit === 'm' || unit.startsWith('min')) return Math.round(amount);
      if (unit === 'h' || unit.startsWith('hr') || unit.startsWith('hour')) return Math.round(amount * 60);
    }
  }
  const ms = toEpochMs(value);
  return ms ? Math.round(ms / 60000) : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return undefined;
}

function mapRecordToProblem(r: Record<string, unknown>): DynatraceProblem {
  const affectedUsers = r['affectedUsers'] ? Number(r['affectedUsers']) : 0;
  const severityMap: Record<string, DynatraceProblem['severity']> = {
    ERROR: 'ERROR',
    AVAILABILITY: 'AVAILABILITY',
    SLOWDOWN: 'PERFORMANCE',
    PERFORMANCE: 'PERFORMANCE',
    RESOURCE_CONTENTION: 'RESOURCE_CONTENTION',
    CUSTOM_ALERT: 'CUSTOM_ALERT',
  };
  const statusMap: Record<string, DynatraceProblem['status']> = {
    OPEN: 'OPEN',
    ACTIVE: 'OPEN',
    RESOLVED: 'RESOLVED',
    CLOSED: 'RESOLVED',
  };
  const severity = severityMap[String(r['severityLevel'] ?? '').toUpperCase()] ?? 'CUSTOM_ALERT';
  const status = statusMap[String(r['status'] ?? '').toUpperCase()] ?? 'OPEN';
  const startTime = toEpochMs(r['startTime']) ?? Date.now();
  const endTime = toEpochMs(r['endTime']);
  const rawDuration = toMinutes(r['duration']);
  const fallbackDuration = status === 'RESOLVED' && endTime && startTime && endTime > startTime
    ? Math.round((endTime - startTime) / 60000)
    : undefined;
  const duration = rawDuration ?? fallbackDuration;
  const recurrence   = computeRecurrenceScore(1, 7); // will be re-scored by pattern engine
  const rootCauseName = r['rootCauseEntityName'] ? String(r['rootCauseEntityName']) : '';
  const rootCauseId = r['rootCauseEntityId'] ? String(r['rootCauseEntityId']) : rootCauseName;
  const impactedIds = [
    ...(Array.isArray(r['smartscapeAffectedEntityIds']) ? r['smartscapeAffectedEntityIds'].map(String) : []),
    ...(Array.isArray(r['impactedEntityIds']) ? r['impactedEntityIds'].map(String) : []),
  ].filter((value, index, all) => value && all.indexOf(value) === index);
  const impactedNames = Array.isArray(r['affectedEntityNames']) ? r['affectedEntityNames'].map(String) : [];
  const impactedTypes = Array.isArray(r['affectedEntityTypes']) ? r['affectedEntityTypes'].map(String) : [];

  return {
    problemId:        String(r['problemId'] ?? r['displayId'] ?? ''),
    title:            String(r['title'] ?? ''),
    status,
    severity,
    startTime,
    endTime,
    duration,
    impactedEntities: impactedIds.map((entityId, index) => {
      const type = entityTypeFromId(impactedTypes[index] || entityId);
      return normalizeEntity(entityId, impactedNames[index] || entityId, type);
    }),
    rootCauseEntity:  rootCauseName ? {
      entityId: rootCauseId,
      name: normalizeEntityName(rootCauseName, 'SERVICE'),
      type: 'SERVICE',
    } : undefined,
    affectedUsers,
    managementZones:  (r['managementZones'] as string[]) ?? [],
    tags:             (r['tags']            as string[]) ?? [],
    linkedTickets:    (r['linkedTickets']   as DynatraceProblem['linkedTickets']) ?? [],
    hasRootCause:     Boolean(rootCauseName),
    recurrenceScore:  recurrence,
    operationalImpactScore: computeOperationalImpactScore(
      severity, duration ?? 30, affectedUsers, recurrence
    ),
    problemUrl: `https://${r['__tenantUrl']}/ui/problems/${r['problemId']}`,
    isFrequentEvent:  toOptionalBoolean(r['isFrequentEvent']),
  };
}


