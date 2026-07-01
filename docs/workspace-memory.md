# OpInt Workspace Memory

This document summarizes the important context from the OpInt workspace recovery conversation. It is intended to help future implementation work avoid repeating the same mistakes.

## Current Recovery Position

- Treat the current codebase as the new recoverable baseline.
- The active branch for cautious workspace work is `safe-workspace-rebuild`.
- A baseline commit was created before new rebuild work:
  - `baseline current recoverable app state`
- A first scoped rebuild commit was created:
  - `restore executive workspace only`
- Do not assume older screenshots map cleanly to current source. Use the screenshots as UX intent, not as proof that a component still exists.
- Do not attempt a full restore in one pass.
- Executive workspace is now the restored baseline. Further Executive work should be limited to defects only; the next restoration phase should focus on SRE.

## Core Product Direction

OpInt should feel like a decision workspace, not a dashboard/report.

The desired flow is:

1. What matters?
2. Why does it matter?
3. What should be done next?
4. Show me evidence if I choose to drill in.

The persistent right-side panel is the primary workflow surface. Drawers can remain available as secondary utilities, but they should not be the main experience.

## Persona Intent

### Executive

Executive answers:

- Which recurring issue should we address first?
- What is the business impact?
- What action should leadership sponsor?
- What evidence is missing before a confident decision?

Executive UX should include:

- Act-First Map as the primary canvas.
- Pattern Explorer as an alternate view.
- Selected focus strip.
- Persistent right panel.
- Business impact.
- Technical actionability.
- Recommended action.
- Analysis.
- Remediation.

Executive language should be plain English and business-oriented. Avoid implementation details such as logs, traces, pods, JVM, heap, GC, DQL, spans, or stack traces in executive recommendations.

Executive restored baseline:

- Top KPI row: Open Risk Exposure, Recoverable Now, Active Patterns, Median MTTR.
- Selected Focus strip below KPIs.
- Act-First Map is the default canvas; Pattern Explorer is the alternate canvas.
- Persistent right panel is always visible with empty state, Business Impact, Technical Actionability, Pattern Timeline, Recommended Action, and Remediation Path after explicit request.
- Bubble color represents when the selected recurring pattern was last seen: seen recently, seen 7-14d ago, or seen 15d+ ago.
- Cost assumptions remain accessible, but detailed cost formulas should stay out of the normal Executive panel.
- Executive Analysis and full DQL lineage are intentionally not part of the restored baseline.

### SRE

SRE answers:

- Why does this keep happening?
- What recurring reliability signals are present?
- What operational weakness does this expose?
- What should be automated?
- How can recurrence be prevented?

SRE UX should include:

- Reliability Risk Matrix as the default canvas.
- Operational Debt Explorer as the alternate view.
- Selected focus strip.
- Persistent Reliability Context panel.
- Details, Analysis, and Remediation tabs or sections.

SRE analysis should be reliability-focused, not code-fix focused.

SRE recommendations should emphasize:

- prevention,
- automation,
- release validation,
- ownership routing,
- guardrails,
- SLOs,
- operational debt reduction.

### Developer

Developer answers:

- What is broken?
- Why is it broken?
- Where should I investigate first?
- What technical fix should I try?

Developer UX should include:

- Developer Scope control.
- Service Heat Map as the default canvas.
- Pattern Explorer as the alternate view.
- Selected focus strip.
- Persistent Developer Context panel.
- Details, Analysis, and Remediation tabs or sections.

Developer Scope should filter raw problems before recurring patterns are built, then recompute KPIs, heat map, pattern explorer, detail panel, and Assist context.

Developer Assist must be explicitly invoked. Do not auto-generate analysis or remediation just because a service, cell, or row was selected.

## Pattern Discovery Decisions

Pattern grouping originally relied too heavily on titles. The improved direction is to consider:

- normalized problem title or failure type,
- root cause entity,
- root cause text/category,
- affected service,
- endpoint or port where available,
- failure category,
- recurrence,
- time/day clustering,
- trend direction.

Pattern recognition remains primarily a JavaScript engine for now. DQL validation should be treated as a trust layer, not a replacement, unless explicitly planned later.

Named DQL validation concepts discussed:

- `rawProblemsQuery`
- `recurringRootCausesQuery`
- `blastRadiusQuery`
- `categoryFrequencyQuery`
- `problemTrendQuery`
- `peakHourQuery`
- `resolutionTrendQuery`

If DQL-derived validation disagrees with JavaScript grouping, do not silently overwrite the JS output. Surface the discrepancy in Data Lineage or Validation mode.

## Assist Prompt Principles

Assist behavior must be persona-specific.

Do not reuse Developer prompts for SRE or Executive.

Active recommendation objectives are limited to:

- `cost_impact`
- `alert_optimization`

Remediation remains a right-panel workflow action, but it is not a top-level recommendation objective. Runtime prompt generation should clamp unknown objective values back to `cost_impact` so stale or experimental objective values cannot leak into Assist prompts.

### Executive Assist

Executive Assist should produce a C-level briefing:

- business risk,
- recurring patterns that matter,
- leadership-sponsored action,
- missing evidence.

It should be evidence-gated:

- If more than half of key fields are missing, unresolved, empty, or generic placeholders, confidence should be LOW.
- Low-confidence responses should avoid fabricated recommendations and focus on missing evidence.

Executive responses should cite numbers in summary and pattern statements.

### SRE Assist

SRE Assist should focus on reliability engineering:

- reliability signals,
- recurrence drivers,
- operational weaknesses,
- automation opportunities,
- prevention recommendations.

It should not focus on code-level fixes or individual incident summaries.

### Developer Assist

Developer Assist should focus on:

- likely root cause,
- service or endpoint to inspect,
- investigation starting point,
- technical fix,
- validation steps,
- relevant Dynatrace capability.

Developer prompts should be compact and anchored in:

- problem IDs,
- event type,
- event name,
- affected services/entities,
- time range,
- compact optional tag/release metadata.

Avoid sending all grouped raw problems by default.

## Cost Model Decisions

Operational impact cost should be transparent and configurable.

The intended model includes:

- severity multipliers,
- engineer hourly rate,
- default responders,
- affected-user cost per hour,
- fallback affected-entity cost,
- recovery rate.

Profiles discussed:

- Conservative,
- Standard,
- Aggressive.

Cost values should never feel like unexplained magic. Users need a Cost Assumptions dialog or explanation area that describes what each parameter means and what to consider when entering values.

Raw calculations and formulas belong in Data Lineage or an assumptions panel, not in normal user-facing KPI cards.

## Executive Cost Model

The Executive workspace uses a configurable runtime cost model so Open Risk Exposure and Recoverable Now are explainable instead of hidden constants.

Profiles:

- Conservative: lower affected-user impact, lower severity multipliers, lower recovery rate.
- Standard: default OpInt assumptions.
- Aggressive: higher affected-user impact, higher responder cost, higher recovery rate.
- Custom: runtime-edited assumptions. Values are not persisted yet, but the structure is ready to load from configuration storage later.

Editable assumptions:

- severity multipliers for Availability, Error, Performance, Resource Contention, and Custom Alert,
- engineerHourlyRate,
- defaultResponders,
- affectedUserCostPerHour,
- fallbackAffectedEntityCost,
- recoveryRate.

Exposure logic:

- user/revenue impact is calculated from affected users, duration, affected-user cost per hour, and severity multiplier,
- engineering impact is calculated from duration, engineer hourly rate, and default responders,
- fallback impact is used only when affected user count is unavailable and a fallback entity cost is configured,
- calculated exposure is the sum of user/revenue impact, fallback impact, and engineering impact.

Recoverable value logic:

- selected-pattern Recoverable Value is calculated as Exposure x Recovery Rate,
- Executive Recoverable Now can additionally include modeled value-delivered savings,
- value-delivered savings can include RCA savings, grouping savings, and noise-reduction savings.

Cost disclaimer:

These values are modeled estimates based on configured assumptions and available Davis problem data.

## MTTR And Empty-State Decisions

- Prefer Median MTTR across personas unless a view explicitly states Average MTTR.
- If there are no resolved problems or no valid durations, show `-`.
- Filter invalid duration values before calculating MTTR:
  - undefined,
  - null,
  - NaN,
  - Infinity,
  - negative values.
- If duration is less than one hour, display minutes instead of `0h`.

Views must handle zero-problem timeframes gracefully.

## Investigation Complexity

Investigation Complexity is a secondary insight, not a top-level KPI.

Neutral wording only:

- investigation complexity may contribute to longer resolution time,
- signals are distributed across multiple tools,
- RCA confidence is lower when evidence is fragmented.

Avoid claims such as:

- replace competitor tools,
- tool fragmentation is the root cause,
- Dynatrace will fix this.

The adapter shape discussed:

```ts
type ToolDetectionRow = {
  Vendor: string;
  AgentName?: string;
  Type?: "Standalone" | "Container" | "CodeModule" | "JS" | "Mobile" | string;
  Purpose?: string[] | string;
  EntityName?: string;
  id?: string;
  HostName?: string;
  HostId?: string;
  ServiceName?: string;
  ServiceId?: string;
};

type DetectedTool = {
  vendor: string;
  types: string[];
  purposes: string[];
  count: number;
  affectedServices: string[];
  affectedEntities: string[];
};

type InvestigationComplexity = {
  score: number;
  rcaConfidence: number;
  evidenceFragmentation: "low" | "medium" | "high";
  toolCount: number;
  signalSourceCount: number;
  detectedTools: DetectedTool[];
  narrative: string;
};
```

Tool detection should match selected patterns using:

1. ServiceId
2. ServiceName
3. HostId
4. HostName
5. EntityName

Do not use global environment-level tool counts for selected pattern complexity.

## Data Transparency

Data Lineage / Validation mode should help administrators understand:

- DQL used,
- query parameters,
- time range,
- applied filters,
- raw record count,
- grouping results,
- intermediate calculations,
- final displayed values,
- Assist prompt template,
- variables injected,
- problem IDs sent,
- prompt size,
- response returned.

The validation notebook is:

- `docs/opint-dql-validation-notebook.md`

Future lineage UI should be additive and lightweight. Do not rebuild a complex admin panel until the workspace UX is stable.

## UI Language And Encoding

Prefer ASCII-safe labels if rendering is inconsistent.

Avoid relying on emoji or special symbols for meaning.

Examples:

- Use `x` instead of `×` if encoding is risky.
- Use `-` instead of em dash if encoding is risky.
- Use `|` instead of middle dot if encoding is risky.

Never display generic entity type labels as user-facing values:

- SERVICE
- HOST
- APPLICATION
- PROCESS_GROUP

Use resolved entity names or explicit fallback text such as:

- Unresolved service
- No resolved entity name

## Deployment Lessons

- Dynatrace app deploy can appear to hang when SSO is waiting.
- Verbose non-interactive deploy is useful for diagnosis:

```powershell
.\node_modules\.bin\dt-app.cmd deploy --no-open --non-interactive --verbose cli-%
```

- Dynatrace rejects deploying the same app version with a different checksum.
- If deploy fails with:

```text
Cannot install app with version X because the same version is already installed with a different checksum.
```

then bump `app.config.json` version and redeploy.

- `.dt-app` files and logs may be generated by build/deploy. Be deliberate before committing them.

## Restored Workspace Baseline

The first restored baseline is now the three-persona decision workspace. Treat this as the working UX foundation and avoid broad rebuilds unless a future phase explicitly reopens the shell.

### Executive Baseline

KPI definitions:

- Open Risk Exposure: estimated operational impact represented by active recurring patterns.
- Recoverable Now: modeled recoverable value using the active recovery model and value-delivered assumptions.
- Active Patterns: recurring patterns requiring leadership attention.
- Median MTTR: median resolution time from valid resolved problem durations; displays `-` when insufficient.

Workspace behavior:

- Primary canvas: Act-First Map.
- Alternate canvas: Pattern Explorer.
- Selection behavior: no automatic selection is required; selecting a bubble or table row updates the focus strip, map/table highlight, and right panel.
- No-selection state: right panel remains visible and prompts the user to select a recurring pattern.
- Right panel: persistent Selected Pattern panel with Business Impact, Technical Actionability, Pattern Timeline, Recommended Action, and Remediation Path after explicit request.
- Analysis workflow: Executive does not expose Generate Analysis in the main workflow. Executive analysis-heavy work is intentionally deferred or kept secondary.
- Remediation workflow: user clicks Get Remediation Path; remediation renders in the right panel only after request.

### SRE Baseline

KPI definitions:

- Operational Debt: total reliability work represented by the selected problem set.
- Automation Candidates: recurring waste or repeated reliability work that may be suitable for automation.
- Repeat Offenders: noisy or repeatedly affected signals that deserve prevention attention.
- Median MTTR: median resolution time unless a future trend calculation is explicitly introduced.

Workspace behavior:

- Primary canvas: Reliability Risk Matrix.
- Alternate canvas: Operational Debt Explorer.
- Selection behavior: Clear Selection supports a true no-selection state and does not immediately reselect the top pattern.
- Selection is preserved across Reliability Risk Matrix, Operational Debt Explorer, Details, Analysis, and Remediation tabs.
- No-selection state: persistent Reliability Context panel says to select a reliability risk to review signals, automation opportunity, analysis, and remediation.
- Right panel: persistent Reliability Context panel with Details, Analysis, and Remediation tabs.
- Analysis workflow: Analysis tab has an explicit Generate Analysis button. Nothing auto-generates on selection.
- Remediation workflow: Remediation tab has an explicit Get Remediation Path button. Nothing auto-generates on selection.
- DQL reporting: SRE can show DQL source/record state and falls back to DQL problem records when shorter timeframes return records but no recurring pattern meets the grouping threshold.

### Developer Baseline

KPI definitions:

- Open Errors: currently open error/problem work for developer triage.
- Services Impacted: unique services or endpoints represented in the selected Developer scope.
- Needs Investigation: problems missing reliable root-cause evidence.
- Median Resolution Time: median resolution time from valid resolved problem durations.

Workspace behavior:

- Primary canvas: Service Heat Map.
- Alternate canvas: Pattern Explorer.
- Developer Scope: visible, persona-specific scoping control that filters Developer evidence before grouping without changing Executive or SRE filtering.
- Selection behavior: Clear Selection supports a true no-selection state and does not reselect the top pattern.
- Selection is preserved across Service Heat Map, Pattern Explorer, Details, Analysis, and Remediation tabs.
- No-selection state: persistent Developer Context panel says to select a service or recurring issue to review evidence, analysis, and remediation.
- Right panel: persistent Developer Context panel with Details, Dynatrace Intelligence Analysis, and Remediation Path tabs.
- Analysis workflow: Analysis tab has an explicit Generate Analysis button. Nothing auto-generates on selection.
- Remediation workflow: Remediation tab has an explicit Get Remediation Path button. Nothing auto-generates on selection.
- Details panel: shows compact service, failure type, root-cause confidence, recurrence, trend, and impact summary; supporting evidence and impacted entities remain collapsed.

## Current Safe Rebuild Plan

The workspace baseline is restored. Future work should be handled as phase-specific enhancements, not as a broad rebuild.

Preferred order for future phases:

1. Stabilize reported defects in the restored workspace.
2. Add DQL validation and lineage as an additive admin/trust layer.
3. Improve cost persistence and configuration storage.
4. Add deeper persona-specific refinements only after the baseline remains stable.

Do not rewrite `ui/app.js` wholesale.

Do not modify broad UI paths unless the current batch explicitly requires it.

Run `npm run typecheck` and `npm run build` after implementation batches that touch runtime files. Documentation-only changes do not require a build.
