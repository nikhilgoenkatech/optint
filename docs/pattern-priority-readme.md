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

> **Zero affected users does not mean zero impact.** It means Davis did not observe user-facing errors for this pattern. The pattern may still represent operational noise, monitoring gaps, or SLA risk.

## Alert Optimization Example

For Alert Optimization, the browser monitor pattern may become a strong candidate because it has:

- repeated alerts,
- timing concentration,
- low observed user impact,
- a specific monitor/entity to investigate.

This does not mean the alert should be suppressed automatically. Calibrate should help the team review whether routing, thresholds, maintenance windows, or ownership need adjustment.

## Side-By-Side Objective Comparison

The same three patterns, reinterpreted under each objective:

| Pattern | Cost Impact priority | Alert Optimization priority | Why it changes |
|---|---|---|---|
| Checkout failure rate increase (3×, 700 avg users, active) | **High** — customer impact, open risk, clear RCA | **Lower** — already actionable via RCA; optimize SLO rather than suppress | Affected users and open risk drive Cost Impact; alert tuning potential drives Optimization |
| Browser monitor global outage (3×, 02:00 each night, 0 users) | **Medium** — repeating but no user impact | **High** — strong tuning candidate; timing concentration + zero user impact + one entity | Same signals, opposite weight: zero users hurts Cost Impact, helps Optimization |
| CPU usage close to limits (2×, same host, 0 users) | **Low** — low recurrence, no customer signal | **Medium** — simple threshold or auto-resolve candidate | Low business signal, but easy to tune; Optimization rewards easy wins |

Switching objectives does not change the underlying data. It changes which signals matter most.

## How Trend Direction Affects Priority

A pattern's trend can move its placement even if the recurrence count has not changed.

| Scenario | Trend | Effect on priority |
|---|---|---|
| Browser monitor fired 3× — no new occurrences this week | Stable | Holds position; lower urgency |
| Browser monitor fired 3× — new occurrence added this week | Increasing | Moves up; growing pattern treated as higher risk |
| Checkout failure recurring — MTTR shortening | Decreasing | May move down; team appears to be recovering faster |

A pattern that looks like a Quick Win today can escalate to Act Now next week if recurrence resumes or an open incident appears.

## Important Distinction

Priority is not based on total alerts across the whole environment.

For example:

- 500 total tenant alerts do not make every pattern high priority.
- A specific pattern repeated 70 times may be important because fixing one source can remove many repeated incidents.
- A high-frequency alert with customer impact is not automatically noise.
- A low-impact repeated alert may be useful as an alert optimization candidate.

## What Calibrate Cannot See

Some patterns may not appear because:

- **Timeframe gap** — problems outside the selected date range are excluded.
- **No entity binding** — problems with no associated entity cannot be grouped reliably into a pattern.
- **Davis duplicate suppression** — duplicates are excluded before Calibrate processes records.
- **Single-occurrence incidents** — problems that occurred only once are not promoted as recurring patterns. They remain available as supporting context in the detail panel.

If an expected pattern is missing, check the timeframe and whether the underlying problems have consistent entity context in Dynatrace.

## Pattern Movement Animation

The file `pattern-animation.html` (project root) provides an animated walkthrough for use in demos or customer conversations. Open it in a browser — it starts paused on Scene 1, then click anywhere to begin.

**How to use it in a conversation:**

> "Let me show you how a pattern actually moves. This browser monitor fires every night at 02:00. Zero users are affected, so it sits at Quick Win. But notice — root cause is identified. That's why it's on the right side of the matrix: the team already knows what to fix, they just haven't prioritised it yet. Watch what happens when the trend flips to Increasing… and then an open incident lands on top of it."

**What to highlight per scene:**

1. **Scene 1** — Point to IN (the dashed purple bubble at Plan & Fund). Explain that high impact alone does not mean Act Now. Without a root cause or owner, the team cannot act — that pattern belongs in Plan & Fund until someone investigates.
2. **Scene 2** — Point to the Trend pill flipping orange. "The recurrence count didn't change. Only the trend changed. That's enough to move the pattern up."
3. **Scene 3** — Point to the open incident tag appearing. "Now it's Act Now. Same pattern, same underlying alert — but signals changed."
4. **Scene 4** — "Once the incident resolves and trend stabilises, it falls back to Quick Win. The fix is still needed, just no longer the highest priority today."

**Key contrast to reinforce:** BM moved because it has a known root cause. IN never moved despite higher recurrence and broader impact, because there is no root cause and no owner. That contrast is the clearest explanation of what the horizontal axis means.

## How To Explain This To A Team

A simple explanation:

> Calibrate first asks whether the same problem keeps happening. Then it asks whether that repeated pattern matters for the selected objective.

The output is intended to guide prioritization. Final action should still be reviewed with the owning team and validated against tenant context.
