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

## Executive Act-First Map

The Executive Act-First Map uses two business-oriented axes:

- Vertical axis: higher cost impact or business exposure.
- Horizontal axis: higher operational actionability or lower remediation effort.

| Quadrant | Meaning | Typical Pattern |
|---|---|---|
| Act Now | High impact and practical to act on | A recurring monitor outage with clear entity context and high recurrence |
| Plan and Fund | High impact but harder to act on | Broad infrastructure recurrence with unclear ownership or missing RCA |
| Quick Win | Lower impact but easy to tune or route | Repeated low-impact alert during a known time window |
| Deprioritize | Lower impact and weak actionability | Low recurrence, weak evidence, unclear entity context |

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

## How To Explain The Model

Calibrate asks two questions:

1. Is this a repeated pattern, or just a one-off incident?
2. For the selected objective, is this pattern important and actionable enough to prioritize?

The goal is to help teams choose where to focus next, using observable Davis problem signals and clearly separating evidence-backed findings from data gaps.
