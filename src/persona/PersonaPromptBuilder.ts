// ============================================================
// PERSONA PROMPT BUILDER
// Builds persona-tuned prompts for Davis CoPilot
// ============================================================

import { CostEstimate, DynatraceProblem } from '../models';
import { PersonaType } from './PersonaResolver';

export interface AISummaryRequest {
  problems: DynatraceProblem[];
  persona: PersonaType;
  costEstimates: CostEstimate[];
  totalCost: number;
}

const SYSTEM_BASE = `You are an operational intelligence assistant embedded in a Dynatrace custom app.
You analyze Dynatrace problems and return structured insights.
Always respond with valid JSON matching the requested schema. No markdown, no preamble.`;

const EXEC_INSTRUCTION = `
You are briefing a C-level executive or VP. Rules:
- Plain English only. Zero technical jargon.
- Never mention: pods, containers, heap, GC, JVM, percentile, DQL, endpoints, stack traces
- Replace "service" with "system" or "platform" where possible
- Focus on: what customers experienced, revenue risk, how long it lasted, is it recurring
- Recommendations must be strategic (invest, prioritise, escalate) not technical (deploy, configure)
- Keep the summary under 3 sentences. Direct. Confident. No hedging.`;

const DEV_INSTRUCTION = `
You are briefing a software developer or engineering lead. Rules:
- Technical root cause analysis expected
- Name specific services, endpoints, error types, libraries
- Recommend specific code changes, config values, dependency fixes
- Reference patterns like: connection pool exhaustion, memory leak, N+1 queries, timeout cascades
- Include specific values where helpful (e.g. "increase max_connections from 100 to 300")
- Be direct and actionable`;

const SRE_INSTRUCTION = `
You are briefing a Site Reliability Engineer or Platform engineer. Rules:
- Full operational analysis expected
- Include: infrastructure signals, deployment correlation, alert noise assessment
- Assess SLO/SLA impact explicitly
- Recommend runbook steps, alert tuning, capacity changes
- Flag whether any alerts appear to be noise (auto-resolved, low impact)
- Consider blast radius and cascading failure risk`;

const DYNATRACE_OBSERVABILITY_FEATURES = `
Broad Dynatrace features and action capabilities to recommend when relevant:
- Davis AI
- Live Debugger
- AWS DevOps Agent
- Azure DevOps Agent
- GCP DevOps Agent
- Release Management
- Workflows
- AutomationEngine
- Site Reliability Guardian
- Service-Level Objectives
- Ownership and Routing
- Digital Experience Monitoring
- Business Analytics
- Application Observability
- Infrastructure and Cloud Observability

Use these broad feature names only. Do not recommend granular telemetry sources such as Distributed Traces, Logs, Metrics, events, spans, stack traces, or dashboards as the feature.`;

// Schema returned by all personas (some fields optional per persona)
const RESPONSE_SCHEMA = `
Return ONLY this JSON (no other text):
{
  "summary": "string — 2-3 sentence summary tailored to this persona",
  "patterns": ["string", "string"],
  "costNarrative": "string — one sentence on cost/business impact (exec/sre only, else empty string)",
  "sloImpact": "string — SLO impact assessment (sre only, else empty string)",
  "noiseAssessment": "string — alert noise comment (sre only, else empty string)",
  "recommendations": [
    {
      "priority": "IMMEDIATE | SHORT_TERM | STRATEGIC",
      "title": "string",
      "description": "string",
      "dynatraceFeature": "string — one broad Dynatrace feature or action capability from the approved list",
      "estimatedImpact": "string",
      "owner": "string"
    }
  ]
}`;

export function buildPrompt(req: AISummaryRequest): string {
  const { problems, persona, costEstimates, totalCost } = req;

  const personaInstruction = {
    executive: EXEC_INSTRUCTION,
    developer: DEV_INSTRUCTION,
    sre: SRE_INSTRUCTION,
  }[persona];

  const problemContext = problems.map((p, i) => ({
    index: i + 1,
    title: p.title,
    severity: p.severity,
    status: p.status,
    durationMinutes: p.duration ?? null,
    affectedUsers: p.affectedUsers ?? 0,
    hasRootCause: p.hasRootCause,
    rootCause: p.rootCauseEntity?.name ?? null,
    impactedServices: p.impactedEntities?.map(e => e.name) ?? [],
    recurrenceScore: p.recurrenceScore ?? 0,
    estimatedCost: costEstimates[i]?.total ?? 0,
    tags: p.tags,
  }));

  return `${SYSTEM_BASE}

PERSONA: ${persona.toUpperCase()}
${personaInstruction}

TOTAL ESTIMATED COST ACROSS SELECTED PROBLEMS: $${totalCost.toLocaleString()}

PROBLEMS TO ANALYZE:
${JSON.stringify(problemContext, null, 2)}

${DYNATRACE_OBSERVABILITY_FEATURES}

${RESPONSE_SCHEMA}`;
}

// Davis CoPilot wraps the prompt in its conversation format
export function buildDavisCopilotPayload(req: AISummaryRequest) {
  return {
    // Davis CoPilot conversation message format
    // See: @dynatrace-sdk/client-davis-copilot
    message: {
      role: 'user' as const,
      content: buildPrompt(req),
    },
    // Tell CoPilot to use structured output
    context: {
      appId: 'my.dynatrace.opint',
      entityContext: req.problems.map(p => p.problemId),
    },
  };
}
