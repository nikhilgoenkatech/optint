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
  FilterState, DynatraceProblem, OperationalMetrics,
  WeeklySnapshot, CostEstimate, CostConfig,
} from '../models';
import { DQL_QUERIES, computeRecurrenceScore, computeOperationalImpactScore } from '../queries/dqlQueries';
import { DEFAULT_COST_CONFIG, estimateCost } from '../cost/CostModel';

// ── Fetch problems via DQL ─────────────────────────────────

export async function fetchProblems(
  filters: FilterState
): Promise<DynatraceProblem[]> {
  const result = await queryExecutionClient.queryExecute({
    body: {
      query: DQL_QUERIES.fetchProblems(filters),
      requestTimeoutMilliseconds: 15000,
      fetchTimeoutSeconds: 60,
    },
  });
  const records = (result.result?.records ?? [])
    .filter(Boolean) as Array<Record<string, unknown>>;
  return records.map(mapRecordToProblem);
}

// ── Fetch KPIs ─────────────────────────────────────────────

export async function fetchKPIs(filters: FilterState): Promise<OperationalMetrics> {
  // Production:
  // const result = await queryExecutionClient().queryExecute({
  //   body: { query: DQL_QUERIES.fetchKPIs(filters) }
  // });
  // const r = result.result?.records?.[0] ?? {};
  // return mapRecordToKPIs(r);
  throw new Error('DynatraceService: not connected');
}

// ── Write weekly snapshot as Business Event ────────────────
// Called by Dynatrace Workflow every Monday at 08:00 UTC

export async function writeWeeklySnapshot(snapshot: WeeklySnapshot): Promise<void> {
  // Production:
  // await businessEventsIngestClient().ingest({
  //   body: [{
  //     'event.type':     'opint.weekly_snapshot',
  //     'event.provider': 'opint',
  //     'event.kind':     'BIZ_EVENT',
  //     timestamp:        new Date().toISOString(),
  //     weekStart:        snapshot.weekStart,
  //     totalProblems:    snapshot.totalProblems,
  //     avgMTTR:          snapshot.avgMTTR,
  //     recurringCount:   snapshot.recurringCount,
  //     missingRCA:       snapshot.missingRCA,
  //     estimatedCost:    snapshot.estimatedCost,
  //     noisyAlerts:      snapshot.noisyAlerts,
  //   }]
  // });
  throw new Error('DynatraceService: not connected');
}

// ── Fetch stored weekly snapshots from Grail ───────────────

export async function fetchWeeklySnapshots(): Promise<WeeklySnapshot[]> {
  // Production:
  // const result = await queryExecutionClient().queryExecute({
  //   body: { query: DQL_QUERIES.fetchStoredSnapshots() }
  // });
  // return (result.result?.records ?? []).map(mapRecordToSnapshot);
  throw new Error('DynatraceService: not connected');
}

// ── Record → model mappers ─────────────────────────────────

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

function toMinutes(value: unknown): number | undefined {
  if (!value) return undefined;
  if (typeof value === 'number') {
    return value > 10000 ? Math.round(value / 60000) : value;
  }
  const ms = toEpochMs(value);
  return ms ? Math.round(ms / 60000) : undefined;
}

function mapRecordToProblem(r: Record<string, unknown>): DynatraceProblem {
  const duration      = toMinutes(r['duration']);
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
  const recurrence   = computeRecurrenceScore(1, 7); // will be re-scored by pattern engine
  const rootCauseName = r['rootCauseEntityName'] ? String(r['rootCauseEntityName']) : '';
  const impactedIds = Array.isArray(r['impactedEntityIds']) ? r['impactedEntityIds'].map(String) : [];

  return {
    problemId:        String(r['problemId'] ?? r['displayId'] ?? ''),
    title:            String(r['title'] ?? ''),
    status,
    severity,
    startTime:        toEpochMs(r['startTime']) ?? Date.now(),
    endTime:          toEpochMs(r['endTime']),
    duration,
    impactedEntities: impactedIds.map(entityId => ({
      entityId,
      name: entityId,
      type: entityId.split('-')[0] as DynatraceProblem['impactedEntities'][number]['type'],
    })),
    rootCauseEntity:  rootCauseName ? {
      entityId: rootCauseName,
      name: rootCauseName,
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
  };
}

function mapRecordToKPIs(r: Record<string, unknown>): OperationalMetrics {
  return {
    totalProblems:      Number(r['totalProblems']      ?? 0),
    openProblems:       Number(r['openProblems']       ?? 0),
    resolvedProblems:   Number(r['resolvedProblems']   ?? 0),
    repetitiveProblems: 0, // computed client-side by pattern engine
    missingRCACount:    Number(r['missingRCA']         ?? 0),
    avgMTTR:            Number(r['avgMTTR']            ?? 0),
    p95MTTR:            Number(r['p95MTTR']            ?? 0),
    totalAffectedUsers: Number(r['totalAffectedUsers'] ?? 0),
    noisyAlertCount:    0, // computed client-side
    estimatedCost:      0, // computed client-side by CostModel
    recurringWaste:     0, // computed client-side
    mttrTrend:          'STABLE',
  };
}

function mapRecordToSnapshot(r: Record<string, unknown>): WeeklySnapshot {
  const weekStart = Number(r['weekStart'] ?? 0);
  return {
    weekStart,
    week:           new Date(weekStart).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' }),
    totalProblems:  Number(r['totalProblems']  ?? 0),
    avgMTTR:        Number(r['avgMTTR']        ?? 0),
    recurringCount: Number(r['recurringCount'] ?? 0),
    missingRCA:     Number(r['missingRCA']     ?? 0),
    estimatedCost:  Number(r['estimatedCost']  ?? 0),
    noisyAlerts:    Number(r['noisyAlerts']    ?? 0),
  };
}
