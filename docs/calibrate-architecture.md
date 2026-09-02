# Calibrate — Architecture Reference

This document describes how Calibrate works end-to-end. It is intended to be fed to an AI assistant when building a new app (e.g. Log Optimizer) that should follow the same architectural shell, UI flow, and interaction patterns.

---

## What Calibrate Is

Calibrate is a Dynatrace AppEngine app that reads Davis problem records from Grail via DQL, groups them into recurring patterns, scores those patterns for business impact and actionability, and places them in a two-axis scatter plot (the Act-First Map). The right panel provides signal details, AI-generated analysis, and AI-generated remediation guidance — all persona- and objective-aware.

**App ID:** `my.dynatrace.calibrate`
**Entry point:** `ui/strato-index.html` → `ui/app.js` (single file, ~9,000 lines, no framework)
**Demo mode:** `?demo=1` URL param skips DQL and uses a built-in mock dataset

---

## End-to-End Data Flow

```
DQL (dt.davis.problems)
  └─ loadProblems()
       └─ PROBLEMS[] — flat array of mapped problem records
            └─ detectPatterns(PROBLEMS)
                 ├─ patternSignature(p) — grouping key per problem
                 ├─ groups with ≥ 2 → buildPattern() → patterns[]
                 └─ singles → oneOffs[]
                      └─ rankPatterns(patterns, activeObjective)
                           └─ patternPriorityScore(pat, allPatterns)
                                └─ render()
                                     ├─ renderDecisionFirstExecView()   [Executive]
                                     ├─ renderSreWorkspace()            [SRE]
                                     └─ renderDeveloperWorkspace()      [Developer]
                                          └─ on bubble/row select:
                                               ├─ renderDecisionDetailPanel()
                                               ├─ renderSreContextPanel()
                                               └─ renderDeveloperContextPanel()
                                                    ├─ Details tab  — static signals
                                                    ├─ Analysis tab — callDavisSkill()
                                                    └─ Remediation tab — callDavisSkill()
```

---

## DQL Queries

### Primary — Problem load
```
fetch dt.davis.problems, from: now()-<timeRange>
| filter dt.davis.is_duplicate == false
| fields event.id, display_id, event.name, event.status, event.category,
         event.start, event.end, dt.davis.impact_level,
         dt.davis.is_frequent_event, dt.davis.is_duplicate,
         dt.davis.affected_users_count, entity_tags, management_zones,
         root_cause_entity_id, root_cause_entity_name, cloud.provider,
         cloud.region, affected_entity_ids, resolved_problem_duration
| sort event.start desc
| limit 500
```

### Secondary — MTTR aggregates
```
fetch dt.davis.problems, from: now()-<timeRange>
| filter dt.davis.is_duplicate == false
| filter event.status == "CLOSED" or event.status == "RESOLVED"
| summarize avg_mttr = avg(resolved_problem_duration),
            median_mttr = percentile(resolved_problem_duration, 50), ...
```

### Tertiary — Recurring root cause validation
```
fetch dt.davis.problems, from: now()-<timeRange>
| filter isNotNull(root_cause_entity_id) or isNotNull(root_cause_entity_name)
| summarize problem_count = count(), by: {root_cause_entity_id, root_cause_entity_name}
| sort problem_count desc | limit 200
```

---

## PROBLEMS Array — Field Mapping

Each problem record is a flat object:

| Field | Source | Notes |
|---|---|---|
| `id` | `event.id` or `display_id` | |
| `title` / `biz` | `event.name` | Same field, two aliases |
| `status` | `event.status` | Mapped to `OPEN` or `RESOLVED` |
| `sev` | `event.category` | SLOWDOWN→PERFORMANCE, ERROR→ERROR, AVAILABILITY→AVAILABILITY |
| `start` | `event.start` | Nanosecond-safe via `toMs()` |
| `dur` | `resolved_problem_duration` | Minutes; null if still open |
| `users` | `dt.davis.affected_users_count` | |
| `impact` | `dt.davis.impact_level` | ENVIRONMENT=95, APPLICATION=75, SERVICE=55, INFRASTRUCTURE=35 |
| `noise` | `dt.davis.is_frequent_event` | Boolean |
| `hasRCA`, `rca`, `rcaId` | `root_cause_entity_name` / `root_cause_entity_id` | |
| `svcs` | rca as primary, else `affected_entity_ids` prefixes | |
| `mz` | `management_zones` | |
| `tags` | `entity_tags` | |
| `cloud`, `region` | `cloud.provider`, `cloud.region` | |

---

## Pattern Detection

### patternSignature(p) — grouping key
```javascript
// Generic multi-entity titles (e.g. "3 services affected") → group by title + severity only
// Everything else → group by normalised title + RCA entity (or primary service)
key = `${normaliseTitle(p.title)}|rca:${p.rca}`      // if RCA present
key = `${normaliseTitle(p.title)}|entity:${p.svcs[0]}`  // fallback
```

`normaliseTitle()` strips pod/node/IP suffixes and lowercases.

### detectPatterns(problems)
- Groups all problems by signature
- Groups with **≥ 2 problems** → `buildPattern()` → `patterns[]`
- Singles → `oneOffs[]`
- Also detects shared blast radius: root cause entities appearing across ≥ 2 distinct patterns

### buildPattern(problems) — key computed fields

| Field | How computed |
|---|---|
| `trend` | Split problems into two time halves; compare daily rates. `INCREASING` if second > first × 1.3, `DECREASING` if second < first × 0.7, else `STABLE`. Requires ≥ 3 occurrences. |
| `hasTimeCluster` | ≥ 5 events AND ≥ 70% at same UTC hour |
| `hasDayCluster` | ≥ 4 events AND ≥ 60% on same day of week |
| `recScore` | 0–100 from daily recurrence rate |
| `qualityScore` | 0–100 blend of cluster purity, recurrence stability, cost consistency, dimension purity |
| `investigationReadiness` | `patternFixabilityScore()` → HIGH / MEDIUM / LOW |
| `confidence` | `patternConfidenceScore()` → HIGH / MEDIUM / LOW |
| `totalCost` | Sum of `calcCost(p).total` across all problems |
| `recommendation` | `ADD_TIME_WINDOW` (has time cluster) / `FIX_ROOT_CAUSE` (has RCA + freq ≥ 3) / `INVESTIGATE_FIRST` |

---

## Scoring and Ranking

### patternPriorityScore(pat, allPatterns)

**cost_impact weights:** cost:30, recurrence:20, blastRadius:20, severity:10, open:10, fixability:5, trend:5

**alert_optimization weights:** noiseLikelihood:35, recurrence:25, duration:15, severity:10, blastRadius:10, fixability:5

All sub-scores are 0–100 normalised. Final score = weighted sum / 100 × 100.

### patternFixabilityScore(pat) — Investigation Readiness (0–100)
Based on: evidence quality, recurrence count, active incidents, scoped entity/RCA context.
Labels: HIGH (≥70), MEDIUM (≥40), LOW (<40).

### patternConfidenceScore(pat) — Evidence Confidence (0–100)
Based on quality score blend. Labels: HIGH (≥75), MEDIUM (≥45), LOW (<45).

---

## Cost Model

Three switchable profiles (Conservative / Standard / Aggressive). Custom profile also supported.

### calcCost(p) — per-problem formula
```javascript
d   = p.dur > 0 ? p.dur : 30                          // duration in minutes, default 30
m   = severityMultipliers[p.sev]                       // e.g. AVAILABILITY=1.0, ERROR=0.7
rev = p.users × (affectedUserCostPerHour/60) × d × m  // revenue impact
eng = (d/60) × engineerHourlyRate × defaultResponders  // engineering cost
total = rev + eng
```

Standard profile: engineerHourlyRate=150, defaultResponders=3, affectedUserCostPerHour=4.8, recoveryRate=0.35.

---

## Objectives

| | cost_impact | alert_optimization |
|---|---|---|
| Score weights | cost, recurrence, blast radius, severity, open incidents | noise likelihood, recurrence, duration, blast radius |
| CTA label | "Get Remediation Path" | "Get Recommendations" |
| AI prompt framing | Business cost and impact | Alert tuning, noise reduction |
| Remediation tab label | "Remediation" | "Recommendations" |

Switched via `activeObjective` global variable.

---

## Personas

| Persona | Filter | View | Columns |
|---|---|---|---|
| Executive | All problems | Act-First Map → Pattern Explorer | biz, cost, users, duration, recurrence, status |
| SRE | All problems | Reliability Risk Matrix → Operational Debt Explorer | severity, impact, cost, MTTR, users, RCA, noise, cloud, open |
| Developer | Excludes Disk I/O patterns | Developer Heat Map → Error Patterns | severity, title, service, RCA, MTTR, recurrence, users, open |

Each persona has: `filter()`, `rank()`, `cols[]`, own analytical view name, own right panel.

---

## Quadrant Placement — actFirstModel(pat, patterns)

```javascript
costShare = patternCost(pat) / totalCostAllPatterns
exposure  = clamp(cost/maxCost × 0.72 + costShare × 0.28, 0.08, 1)
fixability = patternFixabilityScore(pat) / 100   // 0–1

highExposure = costShare >= 0.25 || cost >= 100000 || exposure >= 0.58
readyToAct   = fixability >= 0.6

quadrant = highExposure && readyToAct ? 'Act Now'
         : highExposure               ? 'Plan And Fund'
         : readyToAct                 ? 'Quick Win'
         :                             'Deprioritize'
```

**Bubble position in scatter plot:**
- `left   = 8 + fixability × 84`         (X-axis: Investigation Readiness, low→high left→right)
- `bottom = 9 + exposure × 80`           (Y-axis: Business Impact, low→high bottom→top)
- `size   = clamp(18 + occurrences×2 + √cost/65, 20, 44)` px

**Quadrant layout (matching the actual app):**
```
Plan & Fund  |  Act Now
-------------|----------
Deprioritize |  Quick Win
             X: higher operational cost →
```

**Collision resolution:** `spreadBubbles()` runs 60 iterations of force-repulsion to prevent bubble overlap.

**SRE Reliability Risk Matrix** uses:
- X-axis: `100 - patternFixabilityScore` (Remediation Effort, low→high left→right)
- Y-axis: `sreReliabilityPriority()` = base score + RCA availability penalty
- Quadrants: Act Now (top-right), Strategic Investment (top-left), Quick Wins (bottom-right), Monitor (bottom-left)

---

## UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Persona tabs [Executive | SRE | Developer]    Objective toggle  │
│ Time range picker                             Configure button  │
├───────────────────────────────────┬─────────────────────────────┤
│  KPI tiles (inline)               │                             │
│  [Open Risk | Recoverable |       │   Pattern Detail Panel      │
│   Active Patterns | Median MTTR]  │                             │
│                                   │   [No pattern selected]     │
│  View toggle                      │   or                        │
│  [Act-First Map | Pattern         │   [Details | Analysis |     │
│   Explorer]                       │    Remediation] tabs        │
│                                   │                             │
│  ┌──────────────────────────────┐ │   Details tab:              │
│  │  PLAN & FUND  |  ACT NOW    │ │   - Exposure / Recoverable  │
│  │               |    ●CO      │ │   - Open incidents          │
│  │  ●IN          |             │ │   - Avg duration            │
│  │───────────────|─────────────│ │   - Remediation effort      │
│  │               |    ●BM      │ │   - Evidence quality        │
│  │  DEPRIORITIZE |  QUICK WIN  │ │   - Recommendation block    │
│  └──────────────────────────────┘ │                             │
│  higher operational cost →        │   Analysis tab:             │
│                                   │   - [Run Analysis] button   │
│  OR Pattern Explorer table with   │   - Davis Copilot response  │
│  filters, sorting, pagination     │                             │
│                                   │   Remediation tab:          │
│                                   │   - [Get Remediation Path]  │
│                                   │   - Davis Copilot response  │
│                                   │   - Export button           │
└───────────────────────────────────┴─────────────────────────────┘
```

---

## Right Panel — Detail Flow

### Details tab
Static signal display — no AI call. Shows:
- Business impact tiles: Exposure ($), Recoverable ($), Open incidents, Avg duration
- Technical tiles: Remediation Effort, Evidence Quality, Priority, Investigation Readiness
- Pattern timeline sparkline (occurrences over time)
- Recommendation block (ADD_TIME_WINDOW / FIX_ROOT_CAUSE / INVESTIGATE_FIRST)

### Analysis tab
```javascript
// User clicks "Run Analysis"
analyzePattern(patternId)
  → analyzeMulti()
      → buildDeveloperAnalysisPrompt(ps)   // or SRE / exec variant
      → callAIWithPrompt(...)
          → callDavisSkill(text)           // POST to Davis Copilot
  // result stored in lastAnalysisResult, rendered as markdown
```

### Remediation tab
```javascript
// User clicks "Get Remediation Path" (cost_impact) or "Get Recommendations" (alert_optimization)
getPatternRemediation(patternId)
  → buildRemediationRequest(pat, allPatterns)         // evidence payload
  → buildObjectiveAwareAssistPrompt(request)
      → buildExecutivePatternPrompt(request)           // if executive
      → buildPatternAssistPrompt(request)              // SRE / developer
  → callDavisSkill(text)
  → normalizePatternAssistResponse(parsed, request)   // standardise schema
  // cached per persona:patternId:evidenceHash
  // stored in remediationState
```

**Remediation tab condition:** Only shown to SRE and Developer personas when `activeObjective === 'cost_impact'`.

---

## Davis Copilot Integration

```javascript
async function callDavisSkill(text) {
  const res = await fetch('/platform/davis/copilot/v1/skills/conversations:message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  return data.text ?? '';
}
```

- Single function for all AI calls
- `text` = full prompt (evidence + instructions), constructed objective- and persona-aware
- Analysis responses: rendered as markdown
- Remediation responses: parsed as JSON then rendered as structured sections
- Results cached to avoid repeated calls for the same pattern + evidence

---

## Global State

```javascript
let PROBLEMS = [];                    // raw DQL records
let activeObjective = 'cost_impact';  // 'cost_impact' | 'alert_optimization'
let persona = 'executive';            // 'executive' | 'sre' | 'developer'
let rankingWeights = { cost_impact: {...}, alert_optimization: {...} };
let activeCostProfile = 'Standard';
let costModel = { ...COST_MODEL_PROFILES.Standard };
let DATA_SOURCE_STATE = 'loading';   // 'demo'|'loading'|'live'|'empty'|'error'

// View state
let execAnalyticalView = 'map';       // 'map' | 'explorer'
let sreAnalyticalView = 'matrix';     // 'matrix' | 'explorer'
let developerAnalyticalView = 'heatmap'; // 'heatmap' | 'explorer'

// Panel state
let srePanelTab = 'details';          // 'details' | 'analysis' | 'remediation'
let developerPanelTab = 'details';
let remediationState = { status:'empty', patternId:null, response:null };
let lastAnalysisResult = null;
let lastAIResult = null;
let patternExplorerState = { selectedId:null, sort:'priority', dir:'desc', search:'', offset:0 };
let expandedPatterns = new Set();
```

---

## Key Functions Reference

| Function | Purpose |
|---|---|
| `loadProblems()` | DQL fetch → field mapping → PROBLEMS[] |
| `detectPatterns(problems)` | Groups by signature, returns patterns + oneOffs |
| `buildPattern(problems)` | Computes all pattern metrics from raw problem list |
| `patternSignature(p)` | Grouping key: normalised title + entity/RCA |
| `calcCost(p)` | Per-problem cost: revenue impact + engineering cost |
| `patternCost(pat)` | Sum of calcCost across all problems in pattern |
| `patternPriorityScore(pat, allPatterns)` | Weighted scoring by active objective |
| `actFirstModel(pat, patterns)` | Quadrant placement: exposure, fixability, quadrant label |
| `patternFixabilityScore(pat)` | Investigation readiness 0–100 |
| `rankPatterns(patterns, objective)` | Sorts by objective |
| `spreadBubbles(rawPositions, plotW, plotH)` | Collision resolution (60 iterations, force-repulsion) |
| `render()` | Main render dispatch |
| `renderDecisionFirstExecView(patterns, ps)` | Executive decision workspace |
| `renderSreWorkspace(patterns, ps)` | SRE workspace |
| `renderDeveloperWorkspace(patterns, ps)` | Developer workspace |
| `renderActFirstMap(patterns)` | Executive bubble scatter plot |
| `renderSreRiskMatrix(patterns, ps)` | SRE Reliability Risk Matrix |
| `renderDeveloperServiceHeatMap(patterns)` | Service × failure-type heat map |
| `renderConcisePatternTable(patterns)` | Pattern Explorer table |
| `renderDecisionDetailPanel(pat, patterns)` | Executive right panel |
| `renderSreContextPanel(pat, patterns)` | SRE right panel |
| `renderDeveloperContextPanel(pat, patterns)` | Developer right panel |
| `renderWorkspaceAnalysisBlock(pat, intro)` | Analysis tab content |
| `renderWorkspaceRemediationBlock(pat)` | Remediation tab content |
| `getPatternRemediation(patternId)` | Calls Davis Copilot for remediation path |
| `analyzePattern(patternId)` | Calls Davis Copilot for analysis |
| `callDavisSkill(text)` | Low-level Davis Copilot HTTP POST |
| `buildRemediationRequest(pat, allPatterns)` | Evidence payload builder |
| `buildObjectiveAwareAssistPrompt(request)` | Main prompt builder (objective + persona aware) |
| `normalizePatternAssistResponse(parsed, request)` | Standardises AI response schema |
| `recommendAction(p)` | Returns recommendation type + config |
| `groupIntoSubBuckets(pat)` | Sub-groups pattern by entity/RCA for detail cards |
| `extractPatternSignals(pat, allPatterns)` | Cohort-relative tiered signal extraction |

---

## Architectural Shell — What to Reuse for Log Optimizer

Calibrate's architecture is a **single-file Strato app** built around this shell:

1. **DQL loader** — primary query + optional supplementary queries; results stored in a flat global array
2. **Grouping engine** — normalised key → group → filter by minimum frequency → enrich each group
3. **Multi-factor weighted scorer** — two objective modes switch weight sets; all scores normalised 0–100
4. **2D scatter placement** — x = readiness/actionability, y = impact/risk; four named quadrant labels
5. **Three personas** — each has: filter fn, rank fn, analytical view (scatter / table / heatmap), right panel tabs
6. **Right panel with three tabs** — Details (static signals), Analysis (AI on demand), Remediation (AI on demand, cached)
7. **Davis Copilot integration** — single `callDavisSkill(text)` POST; prompts built objective + persona aware
8. **Global state** — flat `let` variables; all UI re-rendered via `innerHTML` on state change
9. **No framework** — pure JS + CSS custom properties; `data-action` attributes handled by a top-level click dispatcher

For a Log Optimizer, the swap points are:
- **DQL query** — `dt.davis.problems` → `logs` or `bizevents` log volume / error queries
- **Grouping key** — problem title + entity → log source + error pattern / log group
- **Cost model** — engineering cost per incident → storage cost per log volume tier
- **Objectives** — cost_impact → log volume reduction; alert_optimization → noise/duplicate log reduction
- **Scoring signals** — recurrence, blast radius, RCA → log volume growth rate, duplication ratio, indexing cost share
- **Quadrant labels** — Act Now / Plan & Fund / Quick Win / Deprioritize (can stay identical)
- **Remediation prompts** — swap problem remediation for log routing / filtering / sampling recommendations
