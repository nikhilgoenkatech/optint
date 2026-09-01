# Calibrate Pattern Placement Guide

This guide explains where customers can expect recurring problem patterns to appear in Calibrate and why.

Calibrate does not rank every alert independently. It first identifies repeated Davis problem patterns, then places those patterns based on the selected objective.

## From Problems To Patterns

Calibrate starts with non-duplicate Davis problem records for the selected timeframe.

A recurring pattern is created when two or more problem records share a strong relationship, such as:

- similar problem title,
- same or similar root-cause entity,
- same affected service, host, monitor, or entity,
- same event category,
- repeated timing or recurrence behavior.

One-off incidents remain visible as supporting context, but they are not promoted as recurring patterns.

## Main Signals

Calibrate uses observed problem signals, including:

- recurrence count,
- open incident count,
- affected users,
- affected entity or service count,
- severity or event category,
- duration and MTTR,
- trend direction,
- RCA availability,
- evidence quality,
- investigation readiness,
- alert-frequency and timing concentration.

The exact same pattern can be interpreted differently depending on the active objective.

> **Zero affected users does not mean zero impact.** It means Davis did not observe user-facing errors for this pattern. The pattern may still represent operational noise, monitoring gaps, or SLA risk. Calibrate surfaces it so the team can decide whether to tune, route, or suppress it.

## Objective: Cost Impact

Cost Impact prioritizes patterns that appear to create operational effort, business exposure, customer impact, or recurring engineering toil.

Important signals include:

- high recurrence,
- long or worsening resolution time,
- active/open incidents,
- high affected-user count,
- broad affected-entity spread,
- higher modeled operational exposure,
- clear RCA or enough evidence to act.

## Objective: Alert Optimization

Alert Optimization prioritizes repeated alert patterns that may be candidates for tuning, routing, ownership correction, or noise reduction.

Important signals include:

- high recurrence,
- short-lived repeated alerts,
- low or no observed affected users,
- concentrated timing such as a batch or maintenance window,
- frequent-event evidence,
- missing or weak ownership/routing metadata,
- weak RCA or unclear diagnostic context.

High-impact alerts should not be treated as noise simply because they repeat. If affected users, broad blast radius, or worsening MTTR are present, Calibrate keeps the pattern as an important operational signal.

## How The Same Pattern Changes Between Objectives

The objective switch is the most common source of confusion. The same pattern does not disappear — it is reinterpreted through a different lens.

| Pattern | Key Signals | Cost Impact placement | Alert Optimization placement |
|---|---|---|---|
| Checkout failure rate increase (3× in 6 days, 700 avg users affected, active) | High recurrence, customer impact, open risk | **Act Now** — recurring customer-facing error with clear service context | **Strategic** — already has RCA; optimize SLO thresholds rather than suppress |
| Browser monitor global outage (3× at 02:00, 0 users affected) | Timing concentration, low user impact, one entity | **Quick Win** — repeated but low business exposure | **Act Now** — strong tuning candidate; concentrated timing, no user impact, easy to route or maintenance-window |
| CPU usage close to limits (2×, same host, 0 users) | Low recurrence, resource signal, no customer impact | **Deprioritize** — low cost signal, no urgency | **Quick Win** — simple threshold or auto-resolve candidate |

This means switching objectives does not change the underlying data. It changes which signals matter most for the selected goal.

## How Trend Direction Affects Placement

Trend direction changes how urgently a pattern is treated, even if recurrence count stays the same.

| Scenario | Trend | Likely placement change |
|---|---|---|
| Browser monitor firing 3× — no new occurrences | Stable | Monitor or Quick Win — low urgency |
| Browser monitor firing 3× — new occurrence added this week | Increasing | Moves up toward Act Now — pattern is growing |
| Checkout failure recurring — MTTR shortening over time | Decreasing | May move down — team appears to be recovering faster |

A pattern that looks stable today can move into Act Now territory next week if recurrence resumes or a new open incident appears.

## Executive Act-First Map

The Executive Act-First Map uses two business-oriented axes:

- Vertical axis: higher cost impact or business exposure.
- Horizontal axis: higher operational actionability or lower remediation effort.

| Quadrant | Meaning | Team action | Typical Pattern |
|---|---|---|---|
| Act Now | High impact and practical to act on | Escalate and remediate before the next recurrence | A recurring monitor outage with clear entity context and high recurrence |
| Plan and Fund | High impact but harder to act on | Escalate to architecture review and secure remediation budget | Broad infrastructure recurrence with unclear ownership or missing RCA |
| Quick Win | Lower impact but easy to tune or route | Schedule a threshold, routing, or maintenance window fix | Repeated low-impact alert during a known time window |
| Deprioritize | Lower impact and weak actionability | Continue monitoring; revisit if recurrence or severity increases | Low recurrence, weak evidence, unclear entity context |

## SRE Reliability Matrix

The SRE matrix focuses on reliability debt and prevention.

Patterns move higher when they show:

- recurrence,
- operational backlog,
- unreliable or missing RCA,
- broad blast radius,
- automation opportunity,
- worsening reliability trend.

Patterns move toward the action side when the team has enough evidence to route, automate, or prevent recurrence.

## Developer Heat Map

The Developer Heat Map is service-centric.

It helps answer:

- which service or entity is affected,
- what failure category is repeating,
- whether the issue has enough evidence to investigate,
- whether the issue is increasing, stable, or decreasing.

Developer scope filtering narrows the workspace before recurring patterns are recalculated.

## Example Placements

| Example Pattern | Key Signals | Likely Placement |
|---|---|---|
| HTTP monitor global outage repeated hundreds of times against one monitor | High recurrence, concentrated entity, low action complexity | Act Now or Quick Win depending on customer impact |
| Response time degradation affecting many users | Customer impact, long duration, recurring slowdown | Act Now |
| Multiple infrastructure problems across many entities | Broad blast radius, high recurrence, possible ownership complexity | Plan and Fund |
| Scheduled alert at the same hour with no user impact | Timing concentration, repeated alerting, low customer impact | Quick Win for alert optimization |
| Host monitoring unavailable across many hosts with weak RCA | Broad scope, missing root cause, unclear ownership | Plan and Fund or Monitor |

## What Calibrate Cannot See

Calibrate works from the Davis problem records that are available in the selected timeframe. Some patterns may not appear because:

- **Timeframe gap** — problems outside the selected date range are excluded. Extend the timeframe if you expect older recurrences to appear.
- **No entity binding** — problems with no associated entity or service cannot be grouped reliably into a pattern.
- **Davis duplicate suppression** — Davis may mark some problems as duplicates before Calibrate processes them. Those records are excluded to avoid double-counting.
- **Synthetic monitors without entity context** — browser or HTTP monitors that fire without a linked application entity may appear under a generic monitor name rather than a service.
- **Single-occurrence incidents** — problems that occurred only once are not promoted as recurring patterns, even if they were high-severity. They remain available as supporting context in the detail panel.

If a pattern you expect to see is missing, check the timeframe and whether the problems have consistent entity context in Dynatrace.

## Pattern Movement Animation

An animated explainer (`pattern-animation.html` in the project root) walks through four scenes showing how the same pattern moves across the matrix as signals change.

Open the file in a browser. It starts paused on Scene 1 — click anywhere to begin.

**What the animation shows:**

The animation uses four example patterns on the Cost Impact view:

| Pattern | Starting quadrant | Why |
|---|---|---|
| CO — Checkout failure | Act Now | High recurrence, 700 users, open incident, clear RCA |
| BM — Browser monitor | Quick Win | Repeats nightly, 0 users, but **root cause identified** |
| IN — Infrastructure outage | Plan & Fund | High blast radius, high recurrence, **no RCA, no owner** |
| CP — CPU close to limits | Deprioritize | Low recurrence, 0 users, weak signal |

**Scene by scene:**

- **Scene 1 — Starting state.** BM is at Quick Win because it has a known root cause (the monitor entity is specific and actionable) but zero user impact keeps its business signal low. IN is at Plan & Fund because despite its broad impact it has no root cause and no owner — the team has nowhere to direct effort.
- **Scene 2 — Trend flips to Increasing.** New BM recurrences appeared this week. BM moves up the matrix. It stays right (actionable side) because RCA is still identified. IN stays left — trend alone cannot move a pattern right without RCA or ownership.
- **Scene 3 — Open incident added.** BM now has an active incident. Combined with the increasing trend it reaches Act Now. The identified RCA is what keeps it on the right side of the matrix — the team knows exactly what to fix. IN cannot follow BM here.
- **Scene 4 — Resolved.** Incident closed, trend flattens. BM returns to Quick Win. IN has not moved at all across all four scenes.

**The core teaching point:** The horizontal axis (actionability) is driven by RCA availability, evidence quality, and ownership clarity — not by recurrence or impact alone. A pattern with high impact but no root cause sits at Plan & Fund until investigation establishes a clear fix target.

## How To Explain The Model

Calibrate asks two questions:

1. Is this a repeated pattern, or just a one-off incident?
2. For the selected objective, is this pattern important and actionable enough to prioritize?

The goal is to help teams choose where to focus next, using observable Davis problem signals and clearly separating evidence-backed findings from data gaps.
