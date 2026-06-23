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

function quoteDql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function buildTagFilter(tags: string[]): string {
  if (!tags.length) return '';
  return `| filter ${tags.map(t => `matchesValue(entity_tags, "${quoteDql(t)}")`).join(' or ')}`;
}

export function buildSeverityFilter(severities: string[]): string {
  if (!severities.length) return '';
  return `| filter ${severities.map(s => `event.category == "${quoteDql(s)}"`).join(' or ')}`;
}

export function buildMZFilter(zones: string[]): string {
  if (!zones.length) return '';
  return `| filter ${zones.map(z => `matchesValue(management_zones, "${quoteDql(z)}")`).join(' or ')}`;
}

function buildProblemFilters(filters: FilterState): string {
  return [
    filters.severities.length ? buildSeverityFilter(filters.severities) : '',
    filters.tags.length ? buildTagFilter(filters.tags) : '',
    filters.managementZones.length ? buildMZFilter(filters.managementZones) : '',
  ].filter(Boolean).join('\n');
}

// ── DQL Query Templates ────────────────────────────────────

export const DQL_QUERIES = {

  /**
   * Fetch all Davis problems with the field aliases expected by the app.
   * dt.davis.problems uses event.* field names; avoid older dt.entity.problem pseudo-fields.
   */
  fetchProblems: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| filter dt.davis.is_duplicate == false
| fields
    problemId = event.id,
    displayId = display_id,
    title = event.name,
    status = event.status,
    severityLevel = event.category,
    startTime = event.start,
    endTime = event.end,
    duration = resolved_problem_duration,
    impactedEntityIds = affected_entity_ids,
    rootCauseEntityName = root_cause_entity_name,
    affectedUsers = dt.davis.affected_users_count,
    managementZones = management_zones,
    tags = entity_tags,
    impactLevel = dt.davis.impact_level,
    isFrequentEvent = dt.davis.is_frequent_event,
    isDuplicate = dt.davis.is_duplicate,
    cloudProvider = cloud.provider,
    cloudRegion = cloud.region
| sort startTime desc
| limit 1000
  `.trim(),

  /**
   * Recurring pattern detection - groups by normalised title
   */
  fetchRecurringProblems: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| filter dt.davis.is_duplicate == false
| fields title = event.name, severityLevel = event.category, status = event.status, duration = resolved_problem_duration, rootCauseEntityName = root_cause_entity_name
| summarize
    problemCount = count(),
    avgDuration = avg(duration),
    maxDuration = max(duration),
    openCount = countIf(status == "OPEN"),
    rcaCount = countIf(isNotNull(rootCauseEntityName)),
    by: { title, severityLevel }
| filter problemCount > 2
| sort problemCount desc
| limit 50
  `.trim(),

  /**
   * MTTR breakdown by service / application entity
   */
  fetchMTTRByService: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| filter event.status == "RESOLVED" and isNotNull(resolved_problem_duration)
| fields affected_entity_ids, duration = resolved_problem_duration
| expand affectedEntityId = affected_entity_ids
| fieldsAdd entityName = entityName(affectedEntityId)
| summarize
    problemCount = count(),
    avgMTTR  = avg(duration),
    p95MTTR  = percentile(duration, 95),
    totalDowntime = sum(duration),
    by: { affectedEntityId, entityName }
| sort avgMTTR desc
| limit 20
  `.trim(),

  /**
   * Problems missing root cause - for RCA coverage metric
   */
  fetchMissingRCA: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| filter isNull(root_cause_entity_name) or root_cause_entity_name == ""
| summarize
    missingRCACount = count(),
    by: { severityLevel = event.category }
| sort missingRCACount desc
  `.trim(),

  /**
   * Problems by application - top impacted apps
   */
  fetchProblemsByApplication: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| fields affected_entity_ids, duration = resolved_problem_duration, affectedUsers = dt.davis.affected_users_count, status = event.status
| expand affectedEntityId = affected_entity_ids
| filter matchesValue(toString(affectedEntityId), "APPLICATION-*")
| fieldsAdd entityName = entityName(affectedEntityId)
| summarize
    problemCount      = count(),
    avgMTTR           = avg(duration),
    totalDowntime     = sum(duration),
    totalAffectedUsers = sum(affectedUsers),
    by: { affectedEntityId, entityName }
| sort problemCount desc
| limit 10
  `.trim(),

  /**
   * Noisy alert candidates - high frequency, short duration, zero user impact
   */
  fetchNoisyAlerts: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| fields affected_entity_ids, severityLevel = event.category, duration = resolved_problem_duration, affectedUsers = dt.davis.affected_users_count, isFrequentEvent = dt.davis.is_frequent_event
| expand affectedEntityId = affected_entity_ids
| filter matchesValue(toString(affectedEntityId), "SERVICE-*")
| fieldsAdd entityName = entityName(affectedEntityId)
| summarize
    alertCount  = count(),
    avgDuration = avg(duration),
    totalUsers  = sum(affectedUsers),
    frequentCount = countIf(isFrequentEvent == true),
    by: { affectedEntityId, entityName, severityLevel }
| filter alertCount > 3 and (avgDuration <= 15 or frequentCount > 0) and totalUsers == 0
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
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| fields startTime = event.start, severityLevel = event.category, status = event.status
| fieldsAdd bucket = bin(startTime, ${bucketSize})
| summarize
    count = count(),
    openCount = countIf(status == "OPEN"),
    by: { bucket, severityLevel }
| sort bucket asc
  `.trim(),

  /**
   * Root cause clusters - groups recurring problems by root cause entity
   */
  fetchRootCauseClusters: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| fields rootCauseEntityName = root_cause_entity_name, severityLevel = event.category, duration = resolved_problem_duration, affectedUsers = dt.davis.affected_users_count
| filter isNotNull(rootCauseEntityName) and rootCauseEntityName != ""
| summarize
    count   = count(),
    avgMTTR = avg(duration),
    totalAffectedUsers = sum(affectedUsers),
    by: { rootCauseEntityName, severityLevel }
| sort count desc
| limit 15
  `.trim(),

  /**
   * Overall operational KPIs - single-record aggregate
   */
  fetchKPIs: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| fields status = event.status, duration = resolved_problem_duration, rootCauseEntityName = root_cause_entity_name, affectedUsers = dt.davis.affected_users_count, severityLevel = event.category, isFrequentEvent = dt.davis.is_frequent_event
| summarize
    totalProblems  = count(),
    openProblems   = countIf(status == "OPEN"),
    resolvedProblems = countIf(status == "RESOLVED"),
    missingRCA     = countIf(isNull(rootCauseEntityName) or rootCauseEntityName == ""),
    avgMTTR        = avg(duration),
    p95MTTR        = percentile(duration, 95),
    totalAffectedUsers = sum(affectedUsers),
    noisyAlertCount = countIf(isFrequentEvent == true)
  `.trim(),

  /**
   * ServiceNow linked ticket references
   * Requires Dynatrace ↔ ServiceNow integration to be active
   */
  fetchLinkedTickets: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| fields problemId = event.id, title = event.name, status = event.status, linkedTickets
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
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| fields startTime = event.start, duration = resolved_problem_duration, severityLevel = event.category,
         rootCauseEntityName = root_cause_entity_name, affectedUsers = dt.davis.affected_users_count, status = event.status, isFrequentEvent = dt.davis.is_frequent_event
| fieldsAdd weekStart = bin(startTime, 1w)
| summarize
    totalProblems  = count(),
    avgMTTR        = avg(duration),
    missingRCA     = countIf(isNull(rootCauseEntityName) or rootCauseEntityName == ""),
    openProblems   = countIf(status == "OPEN"),
    noisyAlerts    = countIf(isFrequentEvent == true),
    by: { weekStart }
| sort weekStart asc
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
   * Problem heatmap - occurrences by service and hour-of-day
   */
  fetchProblemHeatmap: (filters: FilterState): string => `
fetch dt.davis.problems, ${buildTimeFilter(filters.timeRange.from, filters.timeRange.to)}
${buildProblemFilters(filters)}
| fields startTime = event.start, affected_entity_ids, severityLevel = event.category
| expand affectedEntityId = affected_entity_ids
| filter matchesValue(toString(affectedEntityId), "SERVICE-*")
| fieldsAdd entityName = entityName(affectedEntityId)
| fields
    service     = entityName,
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
  if (!minutes || minutes === 0) return '-';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
