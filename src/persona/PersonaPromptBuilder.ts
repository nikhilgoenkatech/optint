// ============================================================
// PERSONA PROMPT BUILDER
// Builds objective-aware, signal-based prompts for Dynatrace Assist
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

export interface SignalPromptRequest {
  persona: PersonaType;
  objective: ObjectiveType;
  evidence: Record<string, string | number | string[] | null>;
  patternTitle?: string;
  recommendedAction?: string;
  kind?: 'recommendation' | 'analysis' | 'remediation' | 'alert_tuning';
}

const SYSTEM_PROMPT = `You are OpInt Assist. A recurring pattern has been identified by OpInt.
Recommend practical next actions for the active persona and objective using only the supplied signals.
Everything must trace to supplied evidence.

SHARED RULES
- Use only supplied signal values.
- Missing signal = data gap.
- RCA is observed as Present/Missing only.
- Do not validate RCA correctness.
- Do not infer hidden dependencies or ownership gaps.
- Do not invent savings, MTTR reduction, future incidents, or guaranteed outcomes.
- Only recommend a Dynatrace capability when a specific supplied signal justifies it.
- dynatraceCapability must be a capability name only, with no description or narrative in that field.
- Only Evidence-backed actions may be IMMEDIATE.
- Fewer than 3 meaningful signals returns: {"error":"Insufficient signal data."}
- Return valid JSON only.
- No markdown.
- No commentary outside JSON.

RECOMMENDATION STRENGTH
Evidence-backed: directly supported by supplied signals
Candidate: plausible but depends on missing evidence
Data-gap: clarify missing evidence before acting`;

const PERSONA_GUIDANCE = `PERSONA INTENT
Executive: business decision support. Focus on business risk, customer impact, recoverable value, alert governance, and leadership-sponsored action. Avoid implementation detail.
SRE: reliability engineering, prevention, automation, alert quality, ownership/routing, SLOs, and investigation friction. Do not summarize individual incidents. Do not use code-level remediation unless explicitly supported.
Developer: engineering investigation and technical next actions. Focus on affected service, failure mode, debugging path, release validation, code ownership, validation steps, and remediation candidates.`;

const OBJECTIVE_GUIDANCE = `OBJECTIVE BEHAVIOR
cost_impact:
- Reduce recurring operational cost, customer impact, and engineering effort.
- Focus on recurrence and prevention.
- Do not recommend alert tuning.

alert_optimization:
- Alert tuning only.
- Focus on detector config changes, routing, suppression windows, alert profiles, event filters, management-zone scoping, and alert quality.
- Do not recommend RCA investigation or code changes.
- Use "short-lived" not "auto-resolved".
- Do not suppress high-impact alerts without evidence.

Alert tuning action guidance:
- ADD_TIME_WINDOW -> dealertingSamples, seasonal baseline when day clustering is present, or suppression windows for time-bound patterns.
- RAISE_THRESHOLD -> static threshold value, adaptive signal fluctuation count, or seasonal tolerance depending on detector model.
- DISABLE_ALERT -> first set event.type = CUSTOM_INFO; only fully disable if still noisy.
- TUNE_FREQUENCY -> violatingSamples, slidingWindow, dealertingSamples, or metric-key violation/dealerting windows.
- avg_duration < 5m -> dealertingSamples, not threshold.
- hasDayCluster = true -> SeasonalBaselineAnomalyDetectionAnalyzer.
- trend = STABLE -> StaticThresholdAnomalyDetectionAnalyzer.
- trend = INCREASING or DECREASING -> AutoAdaptiveAnomalyDetectionAnalyzer.
- Use dt.alert_group and event.severity >= 3 for low-urgency routing when noiseLikelihood is High and impactTier is Low.
- Prefer matchesPhrase(smartscape.affected_entity.ids, "<entity-id>").
- Do not filter on root_cause_entity_id in Workflows.
- sharedBlastRadiusPatternCount >= 2 means multiple patterns share the same root cause entity.
- Recommend consolidating into a single detector with by:{dimension} grouping instead of separate detectors firing independently.`;

const COMMON_CAPABILITIES = 'Davis AI | Workflows | AutomationEngine | Site Reliability Guardian | SLO | Ownership and Routing | Application Observability | Infrastructure and Cloud Observability | Release Management';
const DEVELOPER_CAPABILITIES = 'Davis AI | Live Debugger | Application Observability | Release Management | Workflows | Site Reliability Guardian';

const EXECUTIVE_SCHEMA = `Return ONLY valid JSON matching this Executive schema:
{
  "executiveSummary": "2-3 sentences using supplied signal values only",
  "businessSignals": [
    {
      "signal": "string",
      "value": "string",
      "whyItMatters": "string"
    }
  ],
  "decisionOptions": [
    {
      "title": "string",
      "recommendationStrength": "Evidence-backed | Candidate | Data-gap",
      "priority": "IMMEDIATE | SHORT_TERM | STRATEGIC",
      "businessRationale": "string",
      "evidenceUsed": ["string"],
      "dynatraceCapability": "${COMMON_CAPABILITIES}",
      "effort": "Low | Medium | High | Unknown"
    }
  ],
  "risks": ["missing or unresolved evidence only"],
  "dataGaps": ["string"]
}
Maximum 3 decisionOptions.`;

const SRE_SCHEMA = `Return ONLY valid JSON matching this SRE schema:
{
  "reliabilitySignals": [
    {
      "signal": "string",
      "recommendationStrength": "Evidence-backed | Candidate | Data-gap",
      "evidence": ["string"]
    }
  ],
  "recurrenceDrivers": ["string"],
  "operationalWeaknesses": ["string"],
  "automationOpportunities": ["string"],
  "preventionRecommendations": [
    {
      "title": "string",
      "priority": "IMMEDIATE | SHORT_TERM | STRATEGIC",
      "recommendationStrength": "Evidence-backed | Candidate | Data-gap",
      "evidenceUsed": ["string"],
      "dynatraceCapability": "${COMMON_CAPABILITIES}",
      "effort": "Low | Medium | High | Unknown"
    }
  ],
  "risks": ["missing or unresolved evidence only"],
  "dataGaps": ["string"]
}`;

const DEVELOPER_SCHEMA = `Return ONLY valid JSON matching this Developer schema:
{
  "investigationSummary": "2-3 sentences using supplied signals only",
  "affectedComponents": [
    {
      "component": "string",
      "evidence": ["string"]
    }
  ],
  "debuggingPath": [
    {
      "step": "string",
      "recommendationStrength": "Evidence-backed | Candidate | Data-gap",
      "evidenceUsed": ["string"],
      "dynatraceCapability": "${DEVELOPER_CAPABILITIES}",
      "effort": "Low | Medium | High | Unknown"
    }
  ],
  "validationSteps": ["string"],
  "remediationCandidates": [
    {
      "title": "string",
      "priority": "IMMEDIATE | SHORT_TERM | STRATEGIC",
      "recommendationStrength": "Evidence-backed | Candidate | Data-gap",
      "evidenceUsed": ["string"],
      "dynatraceCapability": "${DEVELOPER_CAPABILITIES}",
      "effort": "Low | Medium | High | Unknown"
    }
  ],
  "risks": ["missing or unresolved evidence only"],
  "dataGaps": ["string"]
}`;

function responseSchemaFor(persona: PersonaType): string {
  if (persona === 'executive') return EXECUTIVE_SCHEMA;
  if (persona === 'sre') return SRE_SCHEMA;
  return DEVELOPER_SCHEMA;
}

function objectiveTask(req: SignalPromptRequest): string {
  if (req.objective === 'alert_optimization') {
    return `Suggest Alert Tuning using supplied signals only.
Explain why the pattern appears noisy, what detector configuration could reduce noise, what routing or suppression option is plausible, what risk exists before disabling, and what evidence is missing.
Do not auto-apply settings.
Do not suppress high-impact alerts unless supplied evidence supports it.
Do not infer RCA correctness.`;
  }

  if (req.kind === 'remediation') {
    return 'Generate a practical remediation path using only the supplied signals. Focus on recurrence, prevention, and proportionate effort.';
  }

  if (req.kind === 'analysis') {
    return 'Generate persona-specific analysis using only the supplied signals.';
  }

  return 'Generate an evidence-gated recommendation using only the supplied signals.';
}

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

  const totalUsers  = problems.reduce((a, p) => a + (p.affectedUsers ?? 0), 0);
  const avgDuration = problems.reduce((a, p) => a + (p.duration ?? 0), 0) / Math.max(problems.length, 1);
  const hasRCA      = problems.some(p => p.hasRootCause);
  const services    = [...new Set(problems.flatMap(p =>
    p.impactedEntities.filter(e => e.type === 'SERVICE').map(e => e.name)
  ))];
  const entities    = new Set(problems.flatMap(p => p.impactedEntities.map(e => e.entityId)));
  const rootCause   = problems.find(p => p.rootCauseEntity)?.rootCauseEntity?.name ?? 'absent';
  const cost        = costEstimates.reduce((a, c) => a + c.total, 0) || totalCost;

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

${responseSchemaFor(persona)}`;
}

export function buildSignalPrompt(req: SignalPromptRequest): string {
  return `${SYSTEM_PROMPT}

PERSONA: ${req.persona}
OBJECTIVE: ${req.objective}

${PERSONA_GUIDANCE}

${OBJECTIVE_GUIDANCE}

Apply persona and objective simultaneously.

PATTERN
${req.patternTitle || 'Selected recurring pattern'}

RECOMMENDED ACTION
${req.recommendedAction || 'Not supplied'}

TASK
${objectiveTask(req)}

SIGNALS
${JSON.stringify(req.evidence, null, 2)}

${responseSchemaFor(req.persona)}`;
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
