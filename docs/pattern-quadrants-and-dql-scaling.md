# Pattern Quadrants and DQL Scaling

This document explains how Calibrate places recurring patterns into decision quadrants and how large Davis problem result sets should be retrieved safely.

## What Gets Plotted

Calibrate plots recurring patterns, not individual incidents.

An incident is one non-duplicate Davis problem record. A pattern is a recurring cluster of related incidents grouped by normalized problem title plus available root-cause or affected-entity context.

The quadrant map answers two questions:

1. How much does this pattern matter?
2. How confidently can the team act on it?

## Quadrant Axes

### Impact / Exposure

Impact estimates how much operational or business exposure the pattern represents.

Signals include:

- recurrence count,
- open incident count,
- affected users,
- severity or event category,
- problem duration,
- modeled operational cost,
- entity or service spread.

High-impact patterns are recurring, costly, customer-visible, long-running, or still open.

### Actionability / Effort

Actionability estimates how practical it is to act on the pattern.

Signals include:

- RCA availability,
- evidence quality,
- investigation readiness,
- identifiable service, host, monitor, or entity,
- recurrence clarity,
- whether the issue appears concentrated or broadly distributed.

High-actionability patterns have enough evidence to identify where the team should start.

## Quadrants

| Quadrant | Meaning | Typical Signal Profile |
|---|---|---|
| Act Now | High impact, lower effort or high actionability | Recurring, costly, RCA/entity known, clear owner or service, enough evidence |
| Plan and Fund | High impact, higher effort or lower actionability | Big exposure, broad scope, missing RCA, unclear ownership, needs investment |
| Quick Win | Lower impact, lower effort or high actionability | Repeats often, easy to tune or route, lower customer risk |
| Monitor / Deprioritize | Lower impact, higher effort or lower actionability | Low impact, weak evidence, unclear owner, not worth immediate effort |

## Examples

| Pattern | Why | Likely Quadrant |
|---|---|---|
| HTTP monitor global outage, one monitor/check cluster, high affected-user count | High user impact and concentrated target | Act Now |
| Multiple infrastructure problems, high recurrence, many open records, generic title | High operational exposure but may need ownership validation | Plan and Fund or Act Now depending on entity/RCA clarity |
| Scheduled file missing, repeated at the same time, short-lived | Likely alert timing/window review | Quick Win |
| Broad host monitoring unavailable across many hosts with weak RCA | Potentially noisy or broad; needs investigation | Monitor or Plan and Fund depending on volume and backlog |

## DQL Scaling Concern

The original DQL path may return partial data when the selected timeframe contains a very large number of Davis problem records.

This creates risk because pattern detection depends on having the complete non-duplicate problem set for the selected timeframe. If the app receives only a partial result set, recurrence counts, affected-user totals, MTTR, pattern ranking, and quadrant placement can all be wrong.

## Recommended Low-Regression Retrieval Strategy

The safest approach is to separate retrieval into two phases:

1. Count first.
2. Fetch in bounded chunks only when needed.

This avoids changing pattern grouping, scoring, or UI behavior while making data retrieval more reliable.

### Phase 1: Count Query

For the selected timeframe and active filters, first run a lightweight count query:

```dql
fetch dt.davis.problems, from: $from, to: $to
| filter not(dt.davis.is_duplicate)
| summarize problem_count = countDistinct(event.id)
```

If application, management zone, tag, or tenant filters are active, apply the exact same filters here.

The count query should return:

- selected timeframe,
- filter summary,
- total non-duplicate problem count.

### Phase 2: Choose Retrieval Mode

| Count | Retrieval Mode | Rationale |
|---:|---|---|
| 0 | Empty state | No data to process |
| 1 to 5,000 | Single fetch | Low risk and simple |
| More than 5,000 | Chunked fetch | Avoid partial result sets and large response risk |

The 5,000 threshold should be a named constant, not a scattered magic number.

Example:

```ts
const PROBLEM_FETCH_CHUNK_SIZE = 5000;
```

### Phase 3: Chunked Fetch

For large result sets, fetch deterministic chunks until all records are retrieved.

Preferred ordering:

1. `event.start asc`
2. `event.id asc`

The goal is stable pagination. Do not rely on default DQL ordering.

Conceptual DQL:

```dql
fetch dt.davis.problems, from: $from, to: $to
| filter not(dt.davis.is_duplicate)
| sort event.start asc, event.id asc
| limit 5000
```

For subsequent pages, use a cursor-like boundary based on the last returned row:

```dql
fetch dt.davis.problems, from: $from, to: $to
| filter not(dt.davis.is_duplicate)
| filter event.start > $lastStart
    or (event.start == $lastStart and event.id > $lastEventId)
| sort event.start asc, event.id asc
| limit 5000
```

If DQL syntax or tenant support makes compound cursor filtering difficult, use smaller absolute time slices instead.

## Safer Alternative: Time-Slice Fetching

Time slicing is often safer than offset-style pagination.

For example:

- split the selected timeframe into daily windows,
- run the same query for each day,
- deduplicate by `event.id` client-side,
- combine all rows before pattern detection.

This approach has strong regression safety because it preserves the existing JavaScript pattern engine. Only the retrieval layer changes.

Recommended fallback order:

1. Count selected timeframe.
2. If count <= 5,000, fetch once.
3. If count > 5,000, split by day.
4. If any day is still > 5,000, split that day by hour.
5. Deduplicate all returned rows by `event.id`.
6. Run existing normalization and pattern detection once on the complete combined dataset.

## Regression-Safe Implementation Rules

Do not change:

- pattern grouping,
- pattern IDs,
- recurrence thresholds,
- scoring formulas,
- objective ranking,
- persona layouts,
- Assist prompts.

Only change:

- DQL retrieval orchestration,
- count/query metadata,
- diagnostics for partial-data risk.

## Data Completeness Metadata

Every run should retain metadata:

```ts
type ProblemRetrievalMetadata = {
  timeframeFrom: string;
  timeframeTo: string;
  expectedProblemCount: number;
  retrievedProblemCount: number;
  chunkSize: number;
  chunkCount: number;
  retrievalMode: "single" | "chunked_by_cursor" | "chunked_by_time";
  deduplicatedCount: number;
  isComplete: boolean;
  warnings: string[];
};
```

If retrieved count differs from expected count after deduplication, the UI should not silently trust the result.

Recommended warning:

```text
Problem data may be incomplete for the selected timeframe. Pattern counts and rankings may be understated.
```

## Why This Minimizes Impact

This approach keeps the core product logic unchanged. It only improves how the raw problem records are collected before the existing pattern engine runs.

The safest implementation path is:

1. Add count query and metadata.
2. Add diagnostics only.
3. Add single-fetch versus chunked-fetch switch.
4. Add time-slice fallback.
5. Validate pattern counts against known tenants.

That lets the team verify data completeness without introducing changes to ranking or persona behavior.

