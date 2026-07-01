// ============================================================
// PERSONA PROMPT BUILDER
// Builds objective-aware, signal-based prompts for Davis CoPilot
// ============================================================

import { CostEstimate, DynatraceProblem, ProblemPattern } from '../models';
import { PersonaType } from './PersonaResolver';

export type ObjectiveType = 'cost_impact' | 'alert_optimization';

export interface AISummaryRequest {
  problems: DynatraceProblem[];
  persona: PersonaType;
  costEstimates: CostEstimate[];
  totalCost: number;
  objective?: ObjectiveType;
  pattern?: ProblemPattern;
}

// ------------------------------------
// Prompt constants
// ------------------------------------

const SYSTEM_PROMPT = `You are OpInt Assist. A recurring pattern has been identified by OpInt.
Recommend practical next actions for the active persona and objective
using only the supplied signals. Everything must trace to supplied evidence.

CONSTRAINTS
- Use only supplied signal values. Absent signal → data gap, not assumption.
- RCA is observed fact only: Present or Missing. Never score or validate it.
- Scope = observed counts only. Never infer hidden dependencies.
- Do not invent outcomes, savings, or MTTR improvements not in the evidence.
- Only recommend a Dynatrace capability when a specific supplied signal justifies it.
- dynatraceCapability must be a capability name only — no description or narrative in that field.
- Only Evidence-backed actions may be IMMEDIATE.
- Fewer than 3 meaningful signals → return {"error":"Insufficient signal data."}

RECOMMENDATION STRENGTH
Evidence-backed: directly supported by supplied signals
Candidate: plausible but depends on missing evidence
Data-gap: clarify missing evidence before acting`;

const PERSONA_GUIDANCE = `Executive → business cost, customer impact, risk. No implementation detail. Maximum 3 recommendedActions.
SRE → reliability, MTTR, runbooks, SLOs, alert quality, investigation friction.
Developer → affected service, debugging path, release validation, code ownership.`;

const OBJECTIVE_GUIDANCE = `cost_impact -> reduce recurring cost, customer impact, and engineering effort.
Do not recommend alert tuning - that belongs to the alert_optimization objective.

alert_optimization -> alert tuning only. Detector config changes, not service fixes.
Use "short-lived" not "auto-resolved". Never recommend RCA investigation or code changes.
Dynatrace capability must be one of: Davis AI | Workflows | AutomationEngine only.

Map recommendation_type to the exact Dynatrace tuning lever:
  ADD_TIME_WINDOW -> dealertingSamples, seasonal baseline when day clustering is present, or suppression windows for time-bound patterns.
  RAISE_THRESHOLD -> static threshold value, adaptive signal fluctuation count, or seasonal tolerance depending on detector model.
  DISABLE_ALERT -> first set event.type = CUSTOM_INFO; only fully disable if still noisy.
  TUNE_FREQUENCY -> violatingSamples, slidingWindow, dealertingSamples, or metric-key violation/dealerting windows.

Detector model selection rules:
  avg_duration < 5m -> dealertingSamples is the fix, not threshold.
  hasDayCluster = true -> SeasonalBaselineAnomalyDetectionAnalyzer.
  trend = STABLE -> StaticThresholdAnomalyDetectionAnalyzer.
  trend = INCREASING/DECREASING -> AutoAdaptiveAnomalyDetectionAnalyzer.

Routing triage before disabling:
  Use dt.alert_group and event.severity >= 3 for low-urgency routing when noiseLikelihood is High and impactTier is Low.
  Prefer matchesPhrase(smartscape.affected_entity.ids, "<entity-id>"); do not filter on root_cause_entity_id in Workflows.

Consolidation signal:
  sharedBlastRadiusPatternCount >= 2 means multiple patterns share the same root cause entity.
  Recommend consolidating into a single detector with by:{dimension} grouping instead of separate detectors firing independently.`;

const RESPONSE_SCHEMA = `{
  "objectiveAssessment": "2-3 sentences. Supplied signal values only.",
  "drivers": [
    { "signal": "", "value": "", "whyItMatters": "reference the active objective directly" }
  ],
  "recommendedActions": [
    {
      "priority": "IMMEDIATE | SHORT_TERM | STRATEGIC",
      "title": "",
      "recommendationStrength": "Evidence-backed | Candidate | Data-gap",
      "reason": "name the signal that justifies this action",
      "dynatraceCapability": "capability name only",
      "effort": "Low | Medium | High | Unknown",
      "personaFit": ""
    }
  ],
  "remediationContext": "optional: include only when directly supported by supplied signals: { horizon, effortJustification, blockers[] }",
  "risks": ["unresolved evidence only - no future inference"],
  "dataGaps": ["absent or insufficient signal"]
}`;

// ------------------------------------
// Evidence builder
// Maps pattern or raw problems to signal JSON
// ------------------------------------

function buildEvidenceJson(req: AISummaryRequest): object {
  const { problems, costEstimates, totalCost, pattern } = req;

  if (pattern) {
    return {
      occurrence_count:      pattern.occurrences,
      alert_event_count:     pattern.problems.length,
      operational_cost:      Math.round(pattern.totalCost),
      potential_savings:     pattern.recommendation.type !== 'INVESTIGATE_FIRST'
                               ? Math.round(pattern.totalCost * pattern.autoResolveRate)
                               : 'absent',
      affected_users:        pattern.totalUsers,
      affected_entity_count: pattern.affectedServices.length,
      affected_services:     pattern.affectedServices.join(', ') || 'absent',
      event_category:        pattern.severity,
      scope_tier:            pattern.dimensions.managementZones.length > 2
                               ? 'broad'
                               : pattern.dimensions.managementZones.length > 0
                               ? 'scoped'
                               : 'unknown',
      trend:                 pattern.trend,
      avg_duration:          `${Math.round(pattern.avgMTTR)}m`,
      recommendation_type:   pattern.recommendation.type,
      rca_availability:      pattern.hasRCA ? 'Present' : 'Missing',
      root_cause_entity:     pattern.dimensions.primaryRootCause ?? 'absent',
    };
  }

  // Fallback: derive signals from raw problems
  const totalUsers    = problems.reduce((a, p) => a + (p.affectedUsers ?? 0), 0);
  const avgDuration   = problems.reduce((a, p) => a + (p.duration ?? 0), 0) / Math.max(problems.length, 1);
  const hasRCA        = problems.some(p => p.hasRootCause);
  const services      = [...new Set(problems.flatMap(p =>
    p.impactedEntities.filter(e => e.type === 'SERVICE').map(e => e.name)
  ))];
  const entities      = new Set(problems.flatMap(p => p.impactedEntities.map(e => e.entityId)));
  const rootCause     = problems.find(p => p.rootCauseEntity)?.rootCauseEntity?.name ?? 'absent';
  const cost          = costEstimates.reduce((a, c) => a + c.total, 0) || totalCost;

  return {
    occurrence_count:      problems.length,
    alert_event_count:     problems.length,
    operational_cost:      Math.round(cost),
    potential_savings:     'absent',
    affected_users:        totalUsers,
    affected_entity_count: entities.size,
    affected_services:     services.join(', ') || 'absent',
    event_category:        problems[0]?.severity ?? 'absent',
    scope_tier:            'unknown',
    trend:                 'absent',
    avg_duration:          `${Math.round(avgDuration)}m`,
    recommendation_type:   'absent',
    rca_availability:      hasRCA ? 'Present' : 'Missing',
    root_cause_entity:     rootCause,
  };
}

// ------------------------------------
// Prompt builder
// ------------------------------------

export function buildPrompt(req: AISummaryRequest): string {
  const { persona, objective = 'cost_impact' } = req;
  const evidence = buildEvidenceJson(req);

  return `${SYSTEM_PROMPT}

PERSONA: ${persona}
OBJECTIVE: ${objective}

${PERSONA_GUIDANCE}

${OBJECTIVE_GUIDANCE}

Apply persona and objective simultaneously.

SIGNALS
${JSON.stringify(evidence, null, 2)}

Return valid JSON only. No markdown, no commentary outside the JSON.

${RESPONSE_SCHEMA}`;
}

// ------------------------------------
// Davis CoPilot payload wrapper
// ------------------------------------

export function buildDavisCopilotPayload(req: AISummaryRequest) {
  return {
    message: {
      role: 'user' as const,
      content: buildPrompt(req),
    },
    context: {
      appId: 'my.dynatrace.opint',
      entityContext: req.problems.map(p => p.problemId),
    },
  };
}
