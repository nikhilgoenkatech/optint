# Calibrate Pattern Priority README

This README explains, with a small example dataset, how Calibrate turns Davis problem records into recurring patterns and visible priorities.

## How Patterns Are Built

Calibrate starts with raw Davis problem records.

For each problem, it builds a pattern signature from:

- normalized problem title
- root cause entity name, when available
- otherwise the primary impacted entity

If two or more problems share the same signature, Calibrate treats them as a recurring pattern.

One-off records are not promoted into patterns.

For each pattern, Calibrate calculates:

- occurrences
- open incidents
- operational cost
- recoverable value
- affected entities and services
- RCA present or missing
- trend
- evidence quality
- investigation readiness
- priority

## Example Problem Dataset

| ID | Title | RCA / Entity | Status | Category | Start | Duration | Users | Entities | Cost |
| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| P1 | Checkout failure rate increase | checkout-service | RESOLVED | ERROR | Day 1 | 20m | 800 | 4 | $2,000 |
| P2 | Checkout failure rate increase | checkout-service | OPEN | ERROR | Day 3 | - | 600 | 4 | $1,800 |
| P3 | Checkout failure rate increase | checkout-service | RESOLVED | ERROR | Day 6 | 18m | 700 | 4 | $2,100 |
| P4 | Browser monitor global outage | Missing | RESOLVED | AVAILABILITY | Day 2 | 5m | 0 | 10 | $675 |
| P5 | Browser monitor global outage | Missing | RESOLVED | AVAILABILITY | Day 3 | 4m | 0 | 10 | $675 |
| P6 | Browser monitor global outage | Missing | RESOLVED | AVAILABILITY | Day 4 | 4m | 0 | 10 | $675 |
| P7 | CPU spike on worker pod | worker-pod | RESOLVED | RESOURCE | Day 1 | 8m | 0 | 1 | $100 |
| P8 | CPU spike on worker pod | worker-pod | RESOLVED | RESOURCE | Day 7 | 8m | 0 | 1 | $100 |

## Pattern Output

| Pattern | Records Grouped | Why Grouped | Occurrences | Trend | Cost | Priority |
| --- | ---: | --- | ---: | --- | ---: | --- |
| Checkout failure rate increase | P1, P2, P3 | same title + same RCA | 3 | Increasing | $5,900 | Immediate |
| Browser monitor global outage | P4, P5, P6 | same title + impacted entity fallback | 3 | Increasing | $2,025 | Immediate |
| CPU spike on worker pod | P7, P8 | same title + same RCA/entity | 2 | Stable | $200 | Short term / Monitor |

## Current Priority Logic

Visible priority is assigned after recurring patterns are created.

| Priority | Rule |
| --- | --- |
| Immediate | operational cost >= $10,000 OR trend is Increasing |
| Short term | recurrence score >= 60 OR occurrences >= 3 |
| Monitor | evidence quality is Low |
| Strategic | otherwise |

In the example:

- Checkout becomes Immediate because the trend is Increasing, even though cost is below $10,000.
- Browser monitor becomes Immediate because the trend is Increasing.
- CPU spike has recurrence but low cost and Stable trend, so it is not Immediate.

## Important Distinction

Priority is not based on total alerts across the whole environment.

Priority is based on repeated occurrences inside a specific pattern.

For example:

- 100 total alerts in the environment do not make every pattern high priority.
- A specific pattern repeating 6 times with rising trend can become high priority.
- A noisy but low-impact pattern can still be important for alert optimization, but it should not automatically become a business-cost priority.

## Objective Difference

The grouping stays the same across objectives.

The active objective changes the decision lens.

### Cost Impact

For `cost_impact`, Calibrate interprets the pattern around:

- operational cost
- recoverable value
- user or entity impact
- recurrence-driven operational burden

### Alert Optimization

For `alert_optimization`, Calibrate interprets the pattern around:

- repeated alerts
- short-lived or noisy recurrence
- low-value alert candidates
- tuning, routing, or scoping opportunities

## How To Explain This To A Team

A simple way to describe the model:

> Calibrate first asks, "Have we seen the same problem pattern more than once?"
>
> Then it asks, "For the selected objective, which repeated pattern deserves attention first?"

The system does not rank individual alerts in isolation. It ranks recurring patterns.

