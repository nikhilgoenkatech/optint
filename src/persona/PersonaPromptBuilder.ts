// ============================================================
// PERSONA PROMPT BUILDER
// Builds baked-in, persona+objective-specific prompts for Dynatrace Assist.
// No runtime persona or objective switching — each combination has its own
// system role and task, so the model receives a single clear instruction.
// ============================================================

import { CostEstimate, DynatraceProblem, ProblemPattern } from '../models';
import { PersonaType } from './PersonaResolver';
import { compactTrendEvidence } from '../lib/pattern-trend-enrichment';

export type ObjectiveType = 'cost_impact' | 'alert_optimization';
type PromptEvidenceValue = string | number | string[] | Record<string, string | number | string[] | Record<string, string | number | string[]>> | null;

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
  evidence: Record<string, PromptEvidenceValue>;
  patternTitle?: string;
  recommendedAction?: string;
  kind?: 'recommendation' | 'analysis' | 'remediation' | 'alert_tuning';
}

// ------------------------------------
// Shared rules (signal contract)
// ------------------------------------

const SIGNAL_RULES = `SIGNAL CONTRACT
- Use only the supplied signal values. Do not infer, estimate, or invent values.
- Missing signal = data gap. Record it in dataGaps.
- rca_availability is observed as Present or Missing only. Do not validate its correctness.
- Do not invent savings, MTTR reductions, future incident counts, or guaranteed outcomes.
- Only recommend a Dynatrace capability when a specific supplied signal justifies it.
- dynatraceCapability: capability name only — no description or narrative in that field.
- Only Evidence-backed actions may be IMMEDIATE.
- Fewer than 3 meaningful signals: return {"error":"Insufficient signal data."}
- Return valid JSON only. No markdown. No commentary outside JSON.

RECOMMENDATION STRENGTH
Evidence-backed: directly supported by supplied signals
Candidate: plausible but depends on missing evidence
Data-gap: clarify missing evidence before acting`;

// ------------------------------------
// Per-persona system roles
// ------------------------------------

const EXECUTIVE_ROLE = `You are a business decision support assistant for a Dynatrace-monitored platform.
A recurring operational pattern has been identified. Your task is to help a senior executive decide what to prioritise.
Focus on business risk, customer impact, recoverable value, alert governance, and leadership-sponsored action.
Do not include implementation detail, code-level remediation, or engineering jargon.`;

const SRE_ROLE = `You are a site reliability engineering assistant for a Dynatrace-monitored platform.
A recurring operational pattern has been identified. Your task is to help an SRE prevent recurrence, reduce noise, and improve reliability.
Focus on recurrence prevention, automation opportunities, SLO coverage, alert quality, and ownership routing.
Do not summarise individual incidents. Do not recommend code-level remediation unless a specific signal explicitly supports it.`;

const DEVELOPER_ROLE = `You are a developer-focused investigation assistant for a Dynatrace-monitored platform.
A recurring operational pattern has been identified. Your task is to help a developer investigate and remediate the root cause.
Focus on the affected service, failure mode, debugging path, release validation, code ownership, and remediation candidates.
Do not speculate beyond the supplied signals. Do not recommend infrastructure or alert-tuning changes.`;

// ------------------------------------
// Per-objective task overrides
// ------------------------------------

const COST_IMPACT_TASK = `TASK: Reduce recurring operational cost, customer impact, and engineering effort.
Focus on recurrence and prevention. Do not recommend alert tuning.
Generate at least 3 recommendations spanning IMMEDIATE, SHORT_TERM, and STRATEGIC priorities where signal evidence supports it.`;

const ALERT_OPTIMIZATION_TASK = `TASK: Alert tuning only.
Focus on detector config changes, routing, suppression windows, alert profiles, event filters, and alert quality.
Do not recommend RCA investigation or code changes. Use "short-lived" not "auto-resolved".
Do not suppress high-impact alerts without evidence.

Alert tuning guidance:
- ADD_TIME_WINDOW → dealertingSamples, seasonal baseline when day clustering is present, or suppression windows for time-bound patterns.
- RAISE_THRESHOLD → static threshold value, adaptive signal fluctuation count, or seasonal tolerance depending on detector model.
- DISABLE_ALERT → first set event.type = CUSTOM_INFO; only fully disable if still noisy.
- TUNE_FREQUENCY → violatingSamples, slidingWindow, dealertingSamples, or metric-key violation/dealerting windows.
- avg_duration < 5m → dealertingSamples, not threshold.
- trend = STABLE → StaticThresholdAnomalyDetectionAnalyzer.
- trend = INCREASING or DECREASING → AutoAdaptiveAnomalyDetectionAnalyzer.
- sharedBlastRadiusPatternCount >= 2 → consolidate into a single detector with by:{dimension} grouping.`;

const ANALYSIS_TASK_SRE = `TASK: Assess reliability drivers and automation opportunities from the observed signals.
Identify recurrence patterns, operational weaknesses, and automation candidates.
Return structured automation opportunities with IMMEDIATE, SHORT_TERM, and STRATEGIC priority levels.`;

const ANALYSIS_TASK_DEVELOPER = `TASK: Identify the investigation starting point and debugging path from the observed signals.
Map the failure to affected components and provide ordered debugging steps with IMMEDIATE, SHORT_TERM, and STRATEGIC priorities.`;

// ------------------------------------
// Schemas
// ------------------------------------

const COMMON_CAPABILITIES = 'Davis AI | Workflows | AutomationEngine | Site Reliability Guardian | SLO | Ownership and Routing | Application Observability | Infrastructure and Cloud Observability | Release Management';
const DEVELOPER_CAPABILITIES = 'Davis AI | Live Debugger | Application Observability | Release Management | Workflows | Site Reliability Guardian';

const EXECUTIVE_SCHEMA = `RESPONSE FORMAT — return ONLY valid JSON:
{
  "executiveSummary": "2-3 sentences using supplied signal values only",
  "businessSignals": [
    { "signal": "string", "value": "string", "whyItMatters": "string" }
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
Return 3 decisionOptions covering IMMEDIATE, SHORT_TERM, and STRATEGIC where signal evidence allows.`;

const SRE_SCHEMA = `RESPONSE FORMAT — return ONLY valid JSON:
{
  "reliabilitySignals": [
    { "signal": "string", "recommendationStrength": "Evidence-backed | Candidate | Data-gap", "evidence": ["string"] }
  ],
  "recurrenceDrivers": ["string"],
  "operationalWeaknesses": ["string"],
  "automationOpportunities": [
    {
      "title": "string",
      "priority": "IMMEDIATE | SHORT_TERM | STRATEGIC",
      "capability": "${COMMON_CAPABILITIES}",
      "effort": "Low | Medium | High | Unknown"
    }
  ],
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
}
Return at least one item per priority tier (IMMEDIATE, SHORT_TERM, STRATEGIC) in both automationOpportunities and preventionRecommendations where signal evidence allows.`;

const DEVELOPER_SCHEMA = `RESPONSE FORMAT — return ONLY valid JSON:
{
  "investigationSummary": "2-3 sentences using supplied signals only",
  "affectedComponents": [
    { "component": "string", "evidence": ["string"] }
  ],
  "debuggingPath": [
    {
      "step": "string",
      "priority": "IMMEDIATE | SHORT_TERM | STRATEGIC",
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
}
Return at least one item per priority tier (IMMEDIATE, SHORT_TERM, STRATEGIC) in both debuggingPath and remediationCandidates where signal evidence allows.`;

// ------------------------------------
// Role + task selector
// ------------------------------------

function roleFor(persona: PersonaType): string {
  if (persona === 'executive') return EXECUTIVE_ROLE;
  if (persona === 'sre') return SRE_ROLE;
  return DEVELOPER_ROLE;
}

function taskFor(req: SignalPromptRequest): string {
  if (req.objective === 'alert_optimization') return ALERT_OPTIMIZATION_TASK;
  if (req.kind === 'analysis') return req.persona === 'sre' ? ANALYSIS_TASK_SRE : ANALYSIS_TASK_DEVELOPER;
  return COST_IMPACT_TASK;
}

function schemaFor(persona: PersonaType): string {
  if (persona === 'executive') return EXECUTIVE_SCHEMA;
  if (persona === 'sre') return SRE_SCHEMA;
  return DEVELOPER_SCHEMA;
}

// ------------------------------------
// Evidence builder
// Maps pattern or raw problems to signal JSON
// ------------------------------------

function buildEvidenceJson(req: AISummaryRequest): object {
  const { problems, costEstimates, totalCost, pattern } = req;

  if (pattern) {
    const evidence: Record<string, PromptEvidenceValue> = {
      occurrence_count:      pattern.occurrences,
      alert_event_count:     pattern.problems.length,
      affected_users:        pattern.totalUsers,
      affected_entity_count: pattern.affectedServices.length,
      affected_services:     pattern.affectedServices.join(', ') || 'absent',
      event_category:        pattern.severity,
      trend:                 pattern.trend,
      recommendation_type:   pattern.recommendation.type,
      rca_availability:      pattern.hasRCA ? 'Present' : 'Missing',
      root_cause_entity:     pattern.dimensions.primaryRootCause ?? 'absent',
      problem_ids:           pattern.problems.map(problem => problem.problemId).filter(Boolean).slice(0, 10),
    };
    const trendEvidence = compactTrendEvidence(pattern.trendEnrichment);
    if (trendEvidence) evidence.trendEvidence = trendEvidence;
    return evidence;
  }

  const totalUsers  = problems.reduce((a, p) => a + (p.affectedUsers ?? 0), 0);
  const hasRCA      = problems.some(p => p.hasRootCause);
  const services    = [...new Set(problems.flatMap(p =>
    p.impactedEntities.filter(e => e.type === 'SERVICE').map(e => e.name)
  ))];
  const entities    = new Set(problems.flatMap(p => p.impactedEntities.map(e => e.entityId)));
  const rootCause   = problems.find(p => p.rootCauseEntity)?.rootCauseEntity?.name ?? 'absent';

  return {
    occurrence_count:      problems.length,
    alert_event_count:     problems.length,
    affected_users:        totalUsers,
    affected_entity_count: entities.size,
    affected_services:     services.join(', ') || 'absent',
    event_category:        problems[0]?.severity ?? 'absent',
    trend:                 'absent',
    recommendation_type:   'absent',
    rca_availability:      hasRCA ? 'Present' : 'Missing',
    root_cause_entity:     rootCause,
  };
}

export function buildPrompt(req: AISummaryRequest): string {
  const { persona, objective = 'cost_impact' } = req;
  const evidence = buildEvidenceJson(req);
  const taskReq: SignalPromptRequest = { persona, objective, evidence: evidence as Record<string, PromptEvidenceValue> };

  return `${roleFor(persona)}

${SIGNAL_RULES}

${taskFor(taskReq)}

SIGNALS
${JSON.stringify(evidence, null, 2)}

${schemaFor(persona)}`;
}

export function buildSignalPrompt(req: SignalPromptRequest): string {
  return `${roleFor(req.persona)}

${SIGNAL_RULES}

${taskFor(req)}

PATTERN
${req.patternTitle || 'Selected recurring pattern'}

RECOMMENDED ACTION
${req.recommendedAction || 'Not supplied'}

SIGNALS
${JSON.stringify(req.evidence, null, 2)}

${schemaFor(req.persona)}`;
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
