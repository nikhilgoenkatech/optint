// ============================================================
// DYNATRACE OPERATIONAL INTELLIGENCE - DQL QUERY UTILITIES
// ============================================================
// In a real Dynatrace App these execute via:
//   import { queryExecutionClient } from '@dynatrace-sdk/client-query';

import { FilterState } from '../models';

// ── Query builder helpers ──────────────────────────────────

export function buildTimeFilter(from: string, to: string): string {
  return `timeframe(from:"${from}", to:"${to}")`;
}

export function buildTagFilter(tags: string[]): string {
  if (!tags.length) return '';
  return `| filter ${tags.map(t => `tags contains "${t}"`).join(' or ')}`;
}

export function buildSeverityFilter(severities: string[]): string {
  if (!severities.length) return '';
  return `| filter ${severities.map(s => `severityLevel == "${s}"`).join(' or ')}`;
}

export function buildMZFilter(zones: string[]): string {
  if (!zones.length) return '';
  return `| filter ${zones.map(z => `managementZones contains "${z}"`).join(' or ')}`;
}

// ── DQL Query Templates ────────────────────────────────────

export const DQL_QUERIES = {

  /**
   * Fetch all problems with full context including ServiceNow linked tickets
   */
  fetchProblems: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields
    problemId, title, status, severityLevel,
    startTime, endTime, duration,
    impactedEntities, rootCauseEntity,
    affectedUsers, managementZones, tags,
    evidenceDetails, linkedTickets
${filters.severities.length ? buildSeverityFilter(filters.severities) : ''}
${filters.tags.length      ? buildTagFilter(filters.tags)             : ''}
${filters.managementZones.length ? buildMZFilter(filters.managementZones) : ''}
| sort startTime desc
| limit 1000
  `.trim(),

  /**
   * Recurring pattern detection — groups by normalised title
   */
  fetchRecurringProblems: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields title, severityLevel, status, duration, rootCauseEntity
| summarize
    count    = count(),
    avgDuration = avg(duration),
    maxDuration = max(duration),
    by: { title }
| filter count > 2
| sort count desc
| limit 50
  `.trim(),

  /**
   * MTTR breakdown by service / application entity
   */
  fetchMTTRByService: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| filter status == "RESOLVED"
| fields impactedEntities, duration
| expand entity = impactedEntities
| summarize
    problemCount = count(),
    avgMTTR  = avg(duration),
    p95MTTR  = percentile(duration, 95),
    totalDowntime = sum(duration),
    by: { entity.name }
| sort avgMTTR desc
| limit 20
  `.trim(),

  /**
   * Problems missing root cause — for RCA coverage metric
   */
  fetchMissingRCA: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| filter isNull(rootCauseEntity) or rootCauseEntity == ""
| summarize
    missingRCACount = count(),
    by: { severityLevel }
| sort missingRCACount desc
  `.trim(),

  /**
   * Problems by application — top impacted apps
   */
  fetchProblemsByApplication: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields impactedEntities, severityLevel, duration, affectedUsers, status
| expand entity = impactedEntities
| filter entity.type == "APPLICATION"
| summarize
    problemCount      = count(),
    avgMTTR           = avg(duration),
    totalDowntime     = sum(duration),
    totalAffectedUsers = sum(affectedUsers),
    by: { entity.name }
| sort problemCount desc
| limit 10
  `.trim(),

  /**
   * Noisy alert candidates — high frequency, short duration, zero user impact
   */
  fetchNoisyAlerts: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields impactedEntities, severityLevel, duration, affectedUsers, status
| expand entity = impactedEntities
| filter entity.type == "SERVICE"
| summarize
    alertCount  = count(),
    avgDuration = avg(duration),
    totalUsers  = sum(affectedUsers),
    by: { entity.name, severityLevel }
| filter alertCount > 3 and avgDuration <= 15 and totalUsers == 0
| sort alertCount desc
| limit 20
  `.trim(),

  /**
   * Problem frequency trend (daily or hourly buckets)
   */
  fetchProblemTrend: (
    filters: FilterState,
    bucketSize: '1h' | '1d' | '1w' = '1d'
  ): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields startTime, severityLevel, status
| summarize
    count = count(),
    by: { bin(startTime, ${bucketSize}), severityLevel }
| sort startTime asc
  `.trim(),

  /**
   * Root cause clusters — groups recurring problems by root cause entity
   */
  fetchRootCauseClusters: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields rootCauseEntity, evidenceDetails, severityLevel, duration
| filter isNotNull(rootCauseEntity)
| summarize
    count   = count(),
    avgMTTR = avg(duration),
    by: { rootCauseEntity.name, rootCauseEntity.type }
| sort count desc
| limit 15
  `.trim(),

  /**
   * Overall operational KPIs — single-record aggregate
   */
  fetchKPIs: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields status, duration, rootCauseEntity, affectedUsers, severityLevel
| summarize
    totalProblems  = count(),
    openProblems   = countIf(status == "OPEN"),
    resolvedProblems = countIf(status == "RESOLVED"),
    missingRCA     = countIf(isNull(rootCauseEntity)),
    avgMTTR        = avg(duration),
    p95MTTR        = percentile(duration, 95),
    totalAffectedUsers = sum(affectedUsers)
  `.trim(),

  /**
   * ServiceNow linked ticket references
   * Requires Dynatrace ↔ ServiceNow integration to be active
   */
  fetchLinkedTickets: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields problemId, title, status, linkedTickets
| filter isNotNull(linkedTickets)
| expand ticket = linkedTickets
| fields
    problemId, title, status,
    ticket.ticketId,
    ticket.url,
    ticket.status,
    ticket.assignee
| sort problemId asc
  `.trim(),

  /**
   * Weekly snapshot for Team Progress tab
   * Used by Dynatrace Workflow to write Business Events
   */
  fetchWeeklySnapshot: (filters: FilterState): string => `
fetch dt.entity.problem,
    ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields startTime, duration, severityLevel,
         rootCauseEntity, affectedUsers, status
| summarize
    totalProblems  = count(),
    avgMTTR        = avg(duration),
    missingRCA     = countIf(isNull(rootCauseEntity)),
    openProblems   = countIf(status == "OPEN"),
    by: { bin(startTime, 1w) }
| sort startTime asc
  `.trim(),

  /**
   * Read stored weekly snapshots (written as Business Events)
   */
  fetchStoredSnapshots: (): string => `
fetch bizevents
| filter event.type == "opint.weekly_snapshot"
| fields weekStart, totalProblems, avgMTTR,
         recurringCount, missingRCA,
         estimatedCost, noisyAlerts
| sort weekStart asc
| limit 52
  `.trim(),

  /**
   * Problem heatmap — occurrences by service and hour-of-day
   */
  fetchProblemHeatmap: (filters: FilterState): string => `
fetch dt.entity.problem, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
| fields startTime, impactedEntities, severityLevel
| expand entity = impactedEntities
| filter entity.type == "SERVICE"
| fields
    service     = entity.name,
    hour        = hour(startTime),
    dayOfWeek   = dayOfWeek(startTime),
    severityLevel
| summarize
    count = count(),
    by: { service, hour, dayOfWeek }
| sort count desc
| limit 500
  `.trim(),
};

// ── Scoring utilities ──────────────────────────────────────

export function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/\b(pod|node|host|instance|replica|shard)[-_\s]+\S+/g, '$1-*')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '<IP>')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeRecurrenceScore(
  occurrences: number,
  timeWindowDays: number
): number {
  const dailyRate = occurrences / Math.max(timeWindowDays, 1);
  if (dailyRate >= 3)   return 100;
  if (dailyRate >= 1)   return 80;
  if (dailyRate >= 0.5) return 60;
  if (dailyRate >= 0.2) return 40;
  return Math.round(dailyRate * 200);
}

export function computeOperationalImpactScore(
  severity:        string,
  duration:        number,
  affectedUsers:   number,
  recurrenceScore: number
): number {
  const sevWeight: Record<string, number> = {
    AVAILABILITY:        1.0,
    ERROR:               0.8,
    PERFORMANCE:         0.6,
    RESOURCE_CONTENTION: 0.4,
    CUSTOM_ALERT:        0.2,
  };
  const s = sevWeight[severity] ?? 0.5;
  const d = Math.min(duration / 60, 1);
  const u = Math.min(affectedUsers / 1000, 1);
  const r = recurrenceScore / 100;
  return Math.round((s * 0.35 + d * 0.25 + u * 0.2 + r * 0.2) * 100);
}

export function mttrLabel(minutes: number): string {
  if (!minutes || minutes === 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
