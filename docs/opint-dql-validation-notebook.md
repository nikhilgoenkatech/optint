# Calibrate DQL Validation Notebook

Purpose: help reviewers validate the data shown in Calibrate without changing app logic. This notebook documents the DQL query surfaces, the persona screens they feed, client-side transformations, assumptions, and edge-case tests.

## Query Inventory

### rawProblemsQuery

Purpose: Fetch non-duplicate Davis problems for the selected time range before persona and scope filters.

Personas: Executive, SRE, Developer

Feeds: all KPI rows, Pattern Explorer, Act-First Map, SRE Reliability Risk Matrix, Developer Service Heat Map, selected pattern detail panels, Assist context.

Expected fields:

- `event.id`
- `display_id`
- `event.name`
- `event.status`
- `event.category`
- `event.start`
- `event.end`
- `dt.davis.impact_level`
- `dt.davis.is_frequent_event`
- `dt.davis.is_duplicate`
- `dt.davis.affected_users_count`
- `entity_tags`
- `management_zones`
- `root_cause_entity_id`
- `root_cause_entity_name`
- `cloud.provider`
- `cloud.region`
- `smartscape.affected_entity.ids`
- `affected_entity_ids`
- `resolved_problem_duration`

```dql
fetch dt.davis.problems, from: now()-<selectedTimeRange>
| filter not(dt.davis.is_duplicate)
| fields event.id, display_id, event.name, event.status, event.category, event.start, event.end,
 dt.davis.impact_level, dt.davis.is_frequent_event, dt.davis.is_duplicate, dt.davis.affected_users_count,
 entity_tags, management_zones, root_cause_entity_id, root_cause_entity_name,
 cloud.provider, cloud.region, smartscape.affected_entity.ids, affected_entity_ids, resolved_problem_duration
| sort event.start desc
| limit 500
```

App transformations:

- Applies selected time range again in the client as a safety guard.
- Maps `event.status` values to open/resolved display states.
- Converts `resolved_problem_duration` into minutes only for closed/resolved problems.
- Normalizes entity names and hides generic entity type labels.
- Builds recurring patterns in JavaScript with `detectPatterns()`.
- Applies Developer Scope filtering before Developer pattern grouping.

### mttrSummary

Purpose: Fetch resolved duration summary values for MTTR KPIs.

Personas: Executive, SRE, Developer

Feeds: Median MTTR KPI and p85/p95 tooltip or secondary text where shown.

Expected fields:

- `resolved_count`
- `avg_mttr`
- `median_mttr`
- `p85_mttr`
- `p95_mttr`

```dql
fetch dt.davis.problems, from: now()-<selectedTimeRange>
| filter dt.davis.is_duplicate == false
| filter event.status == "CLOSED" or event.status == "RESOLVED"
| fields resolved_problem_duration
| filter isNotNull(resolved_problem_duration)
| summarize
 resolved_count = count(),
 avg_mttr = avg(resolved_problem_duration),
 median_mttr = percentile(resolved_problem_duration, 50),
 p85_mttr = percentile(resolved_problem_duration, 85),
 p95_mttr = percentile(resolved_problem_duration, 95)
```

App transformations:

- Uses median MTTR as the standard visible metric across personas.
- Shows `-` when no resolved problems or no valid durations exist.
- Filters invalid values such as null, undefined, NaN, Infinity, zero, and negative durations.
- Keeps average MTTR only as a lineage/debug value when needed.

### recurringRootCausesQuery

Purpose: Validate JavaScript pattern grouping against recurring Davis root-cause entities.

Personas: validation and lineage for all personas.

Feeds: Data Lineage / Validation mode only.

Expected fields:

- `root_cause_entity_id`
- `root_cause_entity_name`
- `problem_count`
- `first_occurrence`
- `last_occurrence`

```dql
fetch dt.davis.problems, from: now()-<selectedTimeRange>
| filter not(dt.davis.is_duplicate)
| fields display_id, event.name, event.category, event.status, event.start, event.end,
 root_cause_entity_id, root_cause_entity_name
| filter isNotNull(root_cause_entity_id) or isNotNull(root_cause_entity_name)
| summarize problem_count = count(),
 first_occurrence = min(event.start),
 last_occurrence = max(event.start),
 by:{root_cause_entity_id, root_cause_entity_name}
| sort problem_count desc
| limit 100
```

### blastRadiusQuery

Purpose: Validate affected entity impact using Smartscape affected entity arrays.

Personas: validation and lineage for all personas.

Feeds: DQL blast-radius validation fields and score lineage.

Expected fields:

- `event.category`
- `event.name`
- `avg_affected`
- `max_affected`
- `problem_count`

```dql
fetch dt.davis.problems, from: now()-<selectedTimeRange>
| filter not(dt.davis.is_duplicate)
| fields display_id, event.name, event.category, event.status, event.start, event.end,
 smartscape.affected_entity.ids
| fieldsAdd affected_entity_count = arraySize(smartscape.affected_entity.ids)
| summarize avg_affected = avg(affected_entity_count),
 max_affected = max(affected_entity_count),
 problem_count = count(),
 by:{event.category, event.name}
| sort problem_count desc
| limit 100
```

### categoryFrequencyQuery

Purpose: Validate recurring problem names and categories.

Personas: validation and lineage for all personas.

Feeds: DQL validation fields for category/name recurrence.

Expected fields:

- `event.category`
- `event.name`
- `problem_count`
- `first_occurrence`
- `last_occurrence`

```dql
fetch dt.davis.problems, from: now()-<selectedTimeRange>
| filter not(dt.davis.is_duplicate)
| fields display_id, event.name, event.category, event.status, event.start, event.end
| summarize problem_count = count(),
 first_occurrence = min(event.start),
 last_occurrence = max(event.start),
 by:{event.category, event.name}
| sort problem_count desc
| limit 100
```

### problemTrendQuery

Purpose: Validate trend direction using time-bucketed problem counts.

Personas: validation and lineage for all personas.

Feeds: DQL trend validation fields.

Expected fields:

- `time_bucket`
- `event.category`
- `event.name`
- `problem_count`

```dql
fetch dt.davis.problems, from: now()-<selectedTimeRange>
| filter not(dt.davis.is_duplicate)
| fields display_id, event.name, event.category, event.start
| fieldsAdd time_bucket = bin(event.start, 24h)
| summarize problem_count = count(), by:{time_bucket, event.category, event.name}
| sort time_bucket asc
| limit 500
```

### peakHourQuery

Purpose: Validate schedule-like recurrence by UTC hour.

Personas: validation and lineage for all personas.

Feeds: Developer Root Cause Signals, SRE recurrence driver validation, Data Lineage.

Expected fields:

- `hour_of_day`
- `event.category`
- `event.name`
- `problem_count`

```dql
fetch dt.davis.problems, from: now()-<selectedTimeRange>
| filter not(dt.davis.is_duplicate)
| fields display_id, event.name, event.category, event.start
| fieldsAdd hour_of_day = formatTimestamp(event.start, format:"HH")
| summarize problem_count = count(), by:{hour_of_day, event.category, event.name}
| sort problem_count desc
| limit 100
```

### resolutionTrendQuery

Purpose: Validate resolved duration trends.

Personas: validation and lineage for all personas.

Feeds: resolution-duration lineage and validation.

Expected fields:

- `time_bucket`
- `event.category`
- `event.name`
- `resolved_count`
- `avg_duration`
- `p95_duration`

```dql
fetch dt.davis.problems, from: now()-<selectedTimeRange>
| filter not(dt.davis.is_duplicate)
| filter event.status == "CLOSED"
| fields display_id, event.name, event.category, event.start, event.end
| filter isNotNull(event.end)
| fieldsAdd duration_minutes = (event.end - event.start) / 60000000000
| fieldsAdd time_bucket = bin(event.start, 24h)
| summarize resolved_count = count(),
 avg_duration = avg(duration_minutes),
 p95_duration = percentile(duration_minutes, 95),
 by:{time_bucket, event.category, event.name}
| sort time_bucket asc
| limit 500
```

## Pattern Recognition Transformations

The app does not run a dedicated DQL pattern-recognition query. It fetches raw non-duplicate Davis problems, then `detectPatterns()` groups them in JavaScript.

Grouping signals:

- normalized problem/event title
- failure category
- root-cause entity and root-cause text where available
- affected service/entity context
- repeated occurrence threshold
- root-cause repeat score
- time/day clustering
- trend direction across the selected time range

DQL validation signals are used as a trust layer, not as replacements:

- recurring root-cause match
- DQL blast radius
- DQL peak hour
- DQL trend direction
- DQL validation confidence
- disagreement surfaced in Data Lineage / Validation mode

## Cost and Impact Assumptions

Cost calculations use the configured cost model profile.

Inputs:

- affected users from `dt.davis.affected_users_count`
- duration from `resolved_problem_duration` when resolved
- severity multiplier from the active cost model
- responder count from the active cost model
- engineer hourly rate from the active cost model
- fallback affected entity cost when affected users are unavailable
- recovery rate for recoverable value

Lineage should show:

- affected users
- affected entities
- duration
- severity multiplier
- responders
- calculated user/entity impact
- engineering impact
- total calculated impact

## Timeframe Handling

The DQL uses `from: now()-<selectedTimeRange>`. The client also applies `problemInSelectedTimeRange()` before persona filters and grouping. This prevents stale bootstrap or cached rows from appearing outside the selected period.

## Status Mapping

Open states:

- `OPEN`
- `ACTIVE`

Resolved states:

- `CLOSED`
- `RESOLVED`

Only resolved states should contribute to Median MTTR.

## Severity Mapping

Severity values are normalized to the active cost model severity keys:

- `ERROR`
- `AVAILABILITY`
- `SLOWDOWN`
- `PERFORMANCE`
- `RESOURCE_CONTENTION`
- `CUSTOM_ALERT`

Unknown severities fall back through the configured cost model rather than failing the page.

## Empty and Invalid Data Handling

Expected UI behavior:

- No problems in timeframe: show a persona-specific empty state.
- No resolved problems: show `-` for Median MTTR.
- Invalid duration values: exclude from MTTR calculations.
- Missing affected users: use affected entity fallback for cost.
- Missing RCA: show low-confidence or investigation-required states, not fabricated RCA.
- Missing entity names: use explicit fallback text or omit noisy raw IDs.

Debug behavior:

- In development, log useful context for data-shape failures.
- Do not silently overwrite JavaScript pattern output when DQL validation disagrees.

## Test Cases

### No Problems in Timeframe

Expected:

- Executive, SRE, and Developer render without exceptions.
- KPI counts show zero or `-` as appropriate.
- SRE shows a clean empty state instead of reading `recurringRisks` or nested summary objects.
- Pattern Explorer and visual maps show empty states.

### Only Open Problems

Expected:

- Open counts are populated.
- Median MTTR shows `-`.
- Cost calculations may use fallback duration assumptions where explicitly designed, but resolution metrics do not.
- Remediation/Assist context includes problem IDs and open status.

### Only Resolved Problems

Expected:

- Median MTTR is calculated from valid resolved durations.
- Open risk/backlog values are zero where applicable.
- Patterns may still appear if recurrence threshold is met.

### Mixed Open and Resolved Problems

Expected:

- Pattern grouping uses all scoped non-duplicate problems.
- Median MTTR uses only valid resolved durations.
- Open backlog uses open problems only.

### Problems With Missing Duration

Expected:

- Missing durations are excluded from Median MTTR.
- Display shows `-` if no valid durations remain.
- Cost lineage calls out fallback assumptions when used.

### Problems With Missing Affected Users

Expected:

- User-impact totals do not invent affected users.
- Cost model may use affected entity fallback when available.
- Lineage identifies affected users as missing or zero.

### Problems With Invalid or Empty Davis Fields

Expected:

- UI shows fallback labels instead of generic entity types.
- Metrics skip invalid numbers.
- Validation mode flags missing comparable DQL signals.
- Assist prompt builders avoid sending empty evidence and show a friendly error if required context is unavailable.
