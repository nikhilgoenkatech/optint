# Alert Strategy Signal Enrichment Plan

This plan captures additional Calibrate data signals suggested from the Dynatrace alerting strategy notebook series.

Reference:
https://github.com/timstewart-dynatrace/Best-Practice-Notebooks/tree/main/ALERT%20-%20Alerting%20Strategy%20and%20Design/notebooks

The notebooks are primarily strategy and checklist material, not a ready-made DQL library. The useful product direction is to enrich Calibrate with alert-quality, routing-readiness, detector-governance, and correlation-quality signals.

## Goal

Improve Calibrate's ability to explain:

- which recurring patterns are true operational cost drivers,
- which recurring patterns are alert-fatigue candidates,
- whether a pattern is safe to tune,
- whether a team has enough evidence to investigate,
- whether routing and correlation metadata are good enough for action.

The first implementation should prefer signals already available from `dt.davis.problems` to minimize regression risk.

## Current Calibrate Baseline

Calibrate already uses or derives:

- recurrence count,
- operational cost,
- potential savings,
- affected users,
- affected entity count,
- event category,
- trend,
- average or median duration,
- RCA availability,
- root cause entity,
- evidence quality,
- investigation readiness,
- frequent event flag,
- management zones,
- entity tags,
- MTTR trend.

## Proposed Signal Delta

| Area | Current Signal | Addition | Why It Helps |
|---|---|---|---|
| Alert fatigue | Recurrence count | Fire-rate intensity | Separates repeated from noisy-for-period. |
| Alert fatigue | Duration | Short-lived recurrence rate | Finds alerts that repeatedly open and close quickly. |
| Alert fatigue | Trend | Peak-hour concentration | Identifies maintenance-window or batch-window noise. |
| Alert fatigue | Frequent event flag | Frequent-event ratio | Uses Davis' frequent-event evidence more explicitly. |
| Investigation readiness | RCA present/missing | Routing readiness | Shows whether a team can act without triage handoff. |
| Evidence quality | Affected entities / RCA | Correlation quality | Detects alerts that may not correlate into clean Davis problems. |
| Cost optimization | Operational cost | Workflow/routing cost proxy | Shows downstream toil from notification/routing shape. |
| Governance | Not explicit | Stale/no-action detector signal | Identifies detectors that should be tuned or retired. |
| Recommendation safety | Affected users / severity | SLO or customer-impact guardrail | Prevents noisy-but-important alerts from being suppressed. |
| Assist evidence | Selected pattern signals | Detector quality context | Gives Assist better grounding for tuning recommendations. |

## Phase 1 - Low-Risk Problem Signals

These signals can be derived from `dt.davis.problems` and fields Calibrate already retrieves or can safely add.

| Signal | Definition | Source Fields | Suggested Logic |
|---|---|---|---|
| `fireRatePerDay` | Pattern frequency normalized by selected timeframe. | `event.id`, timeframe | `occurrence_count / selected_timeframe_days` |
| `shortLivedRate` | Share of resolved occurrences that closed quickly. | `event.start`, `event.end` | `count(duration <= threshold) / resolved_count` |
| `peakHourConcentration` | Share of occurrences in the busiest UTC hour. | `event.start` | `max(hour_bucket_count) / occurrence_count` |
| `peakDayConcentration` | Share of occurrences on the busiest day. | `event.start` | `max(day_bucket_count) / occurrence_count` |
| `frequentEventRatio` | Share of occurrences Davis marked frequent. | `dt.davis.is_frequent_event` | `frequent_event_count / occurrence_count` |
| `openBacklogRatio` | Share of occurrences still active. | `event.status` | `open_incidents / occurrence_count` |
| `rcaAvailabilityRate` | Share of occurrences with RCA entity data. | `root_cause_entity_name`, `root_cause_entity_id` | `rca_present_count / occurrence_count` |
| `affectedUserGuardrail` | Whether there is observed customer impact. | `dt.davis.affected_users_count` | `sum affected users > 0` |

### Phase 1 Product Use

For alert optimization, these allow Calibrate to say:

> This pattern repeats often, closes quickly, clusters around a specific hour, and has no observed affected users. It may be a tuning or maintenance-window candidate, subject to owner confirmation.

For cost optimization, these allow Calibrate to say:

> This pattern has recurring operational cost and evidence of active backlog or customer impact, so it should not be treated as low-value noise.

## Phase 2 - Routing And Correlation Readiness

These signals still use problem/entity metadata, but may require more careful tenant validation.

| Signal | Definition | Source Fields | Suggested Logic |
|---|---|---|---|
| `routingReadiness` | Whether the problem has routing metadata. | `management_zones`, `entity_tags`, ownership if available | Score from team/zone/tag/owner presence. |
| `routingMetadataCoverage` | Percentage of occurrences with routing hints. | tags, zones, ownership | `records_with_routing_metadata / occurrence_count` |
| `correlationQuality` | Whether events can correlate into meaningful problems. | RCA/entity/source fields | Strong when RCA or affected entity is present; weak when generic/missing. |
| `entityCorrelationGap` | Whether affected entities are unresolved or generic. | affected entity names/types/ids | Flag generic placeholders and missing names. |

### Phase 2 Product Use

These should feed:

- Evidence Quality,
- Investigation Readiness,
- SRE Reliability Context,
- Developer Context,
- Assist missing-evidence cards.

Avoid labeling these as RCA correctness. RCA remains an observed field only: present or missing.

## Phase 3 - External Or Higher-Privilege Signals

These are valuable, but should be deferred until the core problem-data signals are stable.

| Signal | Required Source | Why Deferred |
|---|---|---|
| Workflow fan-out | Workflow execution/config data | Requires additional query surface and permissions. |
| Notification duplication | Workflow/notification config | Needs destination/routing visibility. |
| Runbook link availability | Tags, settings, workflow metadata | Tenant conventions vary. |
| Detector configuration quality | Settings/config APIs | More regression and permission risk. |
| SLO burn-rate relationship | SLO data | Needs separate SLO query model. |
| ServiceNow/Jira outcome | External integration records | Requires external system or integration state. |

## Suggested Evidence Shape

```json
{
  "alertQuality": {
    "fireRatePerDay": 12.4,
    "shortLivedRate": 0.82,
    "frequentEventRatio": 0.75,
    "peakHour": "01:00 UTC",
    "peakHourConcentration": 0.68,
    "peakDayConcentration": 0.41
  },
  "routingReadiness": {
    "hasManagementZone": true,
    "hasTeamTag": false,
    "hasOwner": null,
    "readiness": "Medium",
    "missing": ["team tag", "owner"]
  },
  "correlationQuality": {
    "hasRootCauseEntity": false,
    "hasAffectedEntity": true,
    "entitySpread": 14,
    "quality": "Medium"
  },
  "suppressionSafety": {
    "affectedUsers": 0,
    "openIncidents": 0,
    "hasSloEvidence": null,
    "risk": "Low"
  }
}
```

## Objective Interpretation

### Cost Impact

Use the new signals as context, not primary financial formulas.

- Worsening or long duration increases concern.
- Open backlog increases urgency.
- Affected users increase business risk.
- Low routing readiness explains why engineering effort may be higher.
- Short-lived recurrence can still create toil even when user impact is low.

### Alert Optimization

Use the new signals to distinguish noise candidates from impactful recurring alerts.

- High fire rate + short-lived rate + low affected users = tuning candidate.
- High peak-hour concentration = maintenance-window or scheduled-job review candidate.
- Frequent-event ratio strengthens repeat-offender classification.
- Open incidents, affected users, or SLO evidence should block casual suppression.
- Missing ownership/routing metadata should be a data gap before recommendations become immediate.

## Recommended Implementation Order

1. Add `fireRatePerDay`, `shortLivedRate`, `peakHourConcentration`, and `frequentEventRatio`.
2. Add `openBacklogRatio`, `rcaAvailabilityRate`, and `affectedUserGuardrail`.
3. Add `routingReadiness` from tags, management zones, and ownership where available.
4. Add `correlationQuality` from RCA/entity/source completeness.
5. Add compact Assist evidence fields.
6. Add validation report rows for the new signals.
7. Consider workflow, SLO, settings, and ITSM enrichment later as Phase 3.

## Regression Guardrails

- Do not change pattern membership, pattern IDs, or grouping thresholds while adding these signals.
- Do not change cost formulas in the same change.
- Do not classify a frequent alert as noise if affected users, open incidents, or SLO impact suggest real business risk.
- Do not infer RCA correctness.
- Do not infer hidden owners or dependencies.
- Omit unavailable fields rather than filling them with synthetic defaults.
- Keep Assist payloads compact and below the prompt size limit.
- Add deterministic tests for signal derivation before using signals in ranking.

## Open Design Questions

- What duration threshold should define "short-lived" for alert fatigue: 5, 10, or 15 minutes?
- Should peak-hour concentration use UTC only, or tenant-local time where available?
- Should routing readiness require owner/team, or is management zone enough for Medium?
- Should frequent-event ratio influence ranking directly, or remain explanatory evidence first?
- Should alert optimization ranking change only after a validation pass across several tenants?

