# Calibrate Pattern Priority README

This README gives a simple example of how Calibrate turns Davis problem records into recurring patterns and priority candidates.

## How Patterns Are Built

Calibrate starts with non-duplicate Davis problem records.

For each problem, it considers observed fields such as:

- problem title,
- event category,
- root-cause entity when available,
- affected service, host, monitor, or entity,
- start and end time,
- duration,
- affected users,
- status,
- management zone and tag context.

When two or more records describe the same recurring issue, Calibrate groups them into a pattern. The pattern is then evaluated for cost impact and alert optimization.

## Example Dataset

| ID | Title | RCA / Entity | Status | Category | Timing | Users | Entities |
|---|---|---|---|---|---|---:|---:|
| P1 | Checkout failure rate increase | checkout-service | Resolved | Error | Day 1, 10:00 | 800 | 4 |
| P2 | Checkout failure rate increase | checkout-service | Active | Error | Day 3, 10:00 | 600 | 4 |
| P3 | Checkout failure rate increase | checkout-service | Resolved | Error | Day 6, 10:00 | 700 | 4 |
| P4 | Browser monitor global outage | browser monitor | Resolved | Availability | Day 2, 02:00 | 0 | 1 |
| P5 | Browser monitor global outage | browser monitor | Resolved | Availability | Day 3, 02:00 | 0 | 1 |
| P6 | Browser monitor global outage | browser monitor | Resolved | Availability | Day 4, 02:00 | 0 | 1 |
| P7 | CPU usage close to limits | worker host | Resolved | Resource contention | Day 1, 08:00 | 0 | 1 |
| P8 | CPU usage close to limits | worker host | Resolved | Resource contention | Day 7, 08:00 | 0 | 1 |

## Pattern Output

| Pattern | Records Grouped | Why Grouped | Occurrences | Customer Impact | Operational Signal |
|---|---|---|---:|---:|---|
| Checkout failure rate increase | P1, P2, P3 | Same title and same service/RCA | 3 | High | Recurring customer-facing error |
| Browser monitor global outage | P4, P5, P6 | Same title and same monitor/entity | 3 | Low observed user impact | Repeated availability alert at the same time |
| CPU usage close to limits | P7, P8 | Same title and same host/entity | 2 | Low observed user impact | Repeated resource signal |

## Priority Interpretation

Calibrate priority is based on repeated pattern behavior, not total tenant alert count.

| Signal | Why It Matters |
|---|---|
| Recurrence | Shows the issue is repeating, not isolated |
| Open incidents | Indicates current unresolved risk |
| Affected users | Shows customer-facing impact where available |
| Affected entities | Shows blast radius or operational spread |
| Duration / MTTR | Shows how long teams spend recovering |
| Trend | Shows whether the pattern is increasing, stable, or decreasing |
| RCA availability | Shows whether the team has a clear starting point |
| Evidence quality | Shows whether the supplied data is strong enough to act on |
| Investigation readiness | Shows whether the pattern has enough context for ownership and remediation |

## Cost Impact Example

For Cost Impact, the checkout pattern would usually rank above the CPU pattern because it has:

- recurring failures,
- affected users,
- active risk,
- a clear service/RCA context.

The browser monitor pattern may still rank highly if it repeats many times or creates operational effort, but the absence of affected users should be called out clearly.

## Alert Optimization Example

For Alert Optimization, the browser monitor pattern may become a strong candidate because it has:

- repeated alerts,
- timing concentration,
- low observed user impact,
- a specific monitor/entity to investigate.

This does not mean the alert should be suppressed automatically. Calibrate should help the team review whether routing, thresholds, maintenance windows, or ownership need adjustment.

## Important Distinction

Priority is not based on total alerts across the whole environment.

For example:

- 500 total tenant alerts do not make every pattern high priority.
- A specific pattern repeated 70 times may be important because fixing one source can remove many repeated incidents.
- A high-frequency alert with customer impact is not automatically noise.
- A low-impact repeated alert may be useful as an alert optimization candidate.

## How To Explain This To A Team

A simple explanation:

> Calibrate first asks whether the same problem keeps happening. Then it asks whether that repeated pattern matters for the selected objective.

The output is intended to guide prioritization. Final action should still be reviewed with the owning team and validated against tenant context.
