// ============================================================
// AI SUMMARIZATION SERVICE
// Interface + Davis CoPilot production adapter + Mock adapter
// ============================================================

import { CostEstimate, DynatraceProblem, ProblemPattern } from '../models';
import { PersonaType } from '../persona/PersonaResolver';
import { AISummaryRequest, ObjectiveType, buildDavisCopilotPayload } from '../persona/PersonaPromptBuilder';

// ------------------------------------
// Shared types
// ------------------------------------

export type RecommendationStrength = 'Evidence-backed' | 'Candidate' | 'Data-gap';

export interface AIRecommendation {
  priority:                'IMMEDIATE' | 'SHORT_TERM' | 'STRATEGIC';
  title:                   string;
  recommendationStrength:  RecommendationStrength;
  reason:                  string;
  dynatraceCapability:     string;
  // kept for UI backward compat
  dynatraceFeature?:       string;
  effort:                  'Low' | 'Medium' | 'High' | 'Unknown';
  personaFit:              string;
  // kept for UI backward compat
  description?:            string;
  estimatedImpact?:        string;
  owner?:                  string;
}

export interface AIDriver {
  signal:       string;
  value:        string;
  whyItMatters: string;
}

export interface AIRemediationContext {
  horizon:              'IMMEDIATE' | 'SHORT_TERM' | 'STRATEGIC';
  effortJustification:  string;
  blockers:             string[];
}

export interface AISummary {
  objectiveAssessment:  string;
  drivers:              AIDriver[];
  recommendedActions:   AIRecommendation[];
  remediationContext?:  AIRemediationContext;
  risks:                string[];
  dataGaps:             string[];
  // kept for UI backward compat
  summary?:             string;
  patterns?:            string[];
  costNarrative?:       string;
  sloImpact?:           string;
  noiseAssessment?:     string;
  generatedBy:          'davis-copilot' | 'mock';
  latencyMs:            number;
}

// ------------------------------------
// Interface — swap adapters freely
// ------------------------------------
export interface AISummarizationService {
  summarize(
    problems:      DynatraceProblem[],
    persona:       PersonaType,
    costEstimates: CostEstimate[],
    totalCost:     number,
    objective?:    ObjectiveType,
    pattern?:      ProblemPattern
  ): Promise<AISummary>;
}

// ------------------------------------
// PRODUCTION: Davis CoPilot Adapter
// ------------------------------------
export class DavisCopilotAdapter implements AISummarizationService {
  private conversationId: string | null = null;

  async summarize(
    problems:      DynatraceProblem[],
    persona:       PersonaType,
    costEstimates: CostEstimate[],
    totalCost:     number,
    objective:     ObjectiveType = 'cost_impact',
    pattern?:      ProblemPattern
  ): Promise<AISummary> {
    const t0 = Date.now();
    const req: AISummaryRequest = { problems, persona, costEstimates, totalCost, objective, pattern };
    const payload = buildDavisCopilotPayload(req);

    // Production Davis CoPilot SDK call:
    //
    // const client = davisCopilotClient();
    // if (!this.conversationId) {
    //   const conv = await client.createConversation({});
    //   this.conversationId = conv.id;
    // }
    // const response = await client.createConversationMessage({
    //   conversationId: this.conversationId,
    //   body: payload.message,
    // });
    // const text = response.message?.content ?? '';
    // const parsed = JSON.parse(text);
    // return { ...parsed, generatedBy: 'davis-copilot', latencyMs: Date.now() - t0 };

    void payload;
    throw new Error('DavisCopilotAdapter: wire up SDK call (see comments above)');
  }
}

// ------------------------------------
// DEVELOPMENT / FALLBACK: Mock Adapter
// ------------------------------------
export class MockAIAdapter implements AISummarizationService {
  async summarize(
    problems:      DynatraceProblem[],
    persona:       PersonaType,
    costEstimates: CostEstimate[],
    totalCost:     number,
    objective:     ObjectiveType = 'cost_impact',
    pattern?:      ProblemPattern
  ): Promise<AISummary> {
    await new Promise(r => setTimeout(r, 1200));

    const occurrences   = pattern?.occurrences ?? problems.length;
    const cost          = pattern?.totalCost ?? totalCost;
    const trend         = pattern?.trend ?? 'STABLE';
    const hasRCA        = pattern?.hasRCA ?? problems.some(p => p.hasRootCause);
    const avgMTTR       = pattern?.avgMTTR ?? (problems.reduce((a, p) => a + (p.duration ?? 0), 0) / Math.max(problems.length, 1));
    const affectedUsers = pattern?.totalUsers ?? problems.reduce((a, p) => a + (p.affectedUsers ?? 0), 0);
    const recType       = pattern?.recommendation.type ?? 'INVESTIGATE_FIRST';

    if (objective === 'alert_optimization') {
      return {
        objectiveAssessment: `This pattern has generated ${occurrences} occurrences with an average duration of ${Math.round(avgMTTR)} minutes. ${recType === 'ADD_TIME_WINDOW' || recType === 'RAISE_THRESHOLD' ? 'The recommendation type indicates an alert tuning opportunity.' : 'Alert fidelity should be reviewed before further investment.'} Affected user count is ${affectedUsers}, which informs suppression scope.`,
        drivers: [
          { signal: 'occurrence_count',    value: String(occurrences),        whyItMatters: 'High recurrence is the primary qualifying signal for alert optimization.' },
          { signal: 'avg_duration',        value: `${Math.round(avgMTTR)}m`,  whyItMatters: 'Short-lived incidents are candidates for threshold or time-window tuning.' },
          { signal: 'recommendation_type', value: recType,                    whyItMatters: 'ADD_TIME_WINDOW or RAISE_THRESHOLD types directly indicate alert tuning actions.' },
        ],
        recommendedActions: [
          {
            priority: 'IMMEDIATE', title: 'Review anomaly detector sensitivity for this pattern',
            recommendationStrength: 'Evidence-backed',
            reason: 'occurrence_count and avg_duration indicate high-frequency short-lived events',
            dynatraceCapability: 'Davis AI', dynatraceFeature: 'Davis AI',
            effort: 'Low', personaFit: `${persona === 'sre' ? 'Direct alert tuning action for SRE on-call ownership.' : 'Operational noise reduction reduces engineering interrupt load.'}`,
          },
          {
            priority: 'SHORT_TERM', title: 'Configure suppression time window if pattern is time-bound',
            recommendationStrength: recType === 'ADD_TIME_WINDOW' ? 'Evidence-backed' : 'Candidate',
            reason: 'recommendation_type signals time-window suppression as the appropriate tuning lever',
            dynatraceCapability: 'Workflows', dynatraceFeature: 'Workflows',
            effort: 'Low', personaFit: 'SRE or platform team can implement without service owner involvement.',
          },
        ],
        risks: ['Alert remains active and will continue generating noise until tuned.'],
        dataGaps: [
          ...(!hasRCA ? ['rca_availability: Missing — cannot confirm pattern is noise vs genuine failure.'] : []),
          'alert_event_count: raw event volume unavailable — cannot compute event-to-problem ratio.',
        ],
        summary: `${occurrences} occurrences detected. Alert optimization candidate based on duration and recommendation type.`,
        generatedBy: 'mock', latencyMs: 1200,
      };
    }

    // Default: cost_impact
    const titles      = problems.map(p => p.title);
    const hasPayment  = titles.some(t => t.toLowerCase().includes('payment'));
    const hasCheckout = titles.some(t => t.toLowerCase().includes('checkout'));

    return {
      objectiveAssessment: `This pattern has recurred ${occurrences} times with an estimated operational cost of ${Math.round(cost).toLocaleString()} units and a trend of ${trend}. ${affectedUsers > 0 ? `${affectedUsers} users have been affected, confirming customer-facing impact.` : 'User impact data is unavailable.'} ${hasRCA ? 'A root cause entity is present, which improves remediation targeting.' : 'Root cause is missing, which increases the risk of continued cost accrual.'}`,
      drivers: [
        { signal: 'operational_cost',  value: String(Math.round(cost)),        whyItMatters: 'Primary cost burden — reducing recurrence is the highest-value lever for cost_impact.' },
        { signal: 'occurrence_count',  value: String(occurrences),             whyItMatters: 'Recurrence frequency multiplies cost exposure over time.' },
        { signal: 'trend',             value: trend,                           whyItMatters: 'STABLE or INCREASING trend means cost will not self-resolve without intervention.' },
        { signal: 'rca_availability',  value: hasRCA ? 'Present' : 'Missing',  whyItMatters: 'RCA availability determines whether cost reduction can be precisely targeted.' },
        ...(affectedUsers > 0 ? [{ signal: 'affected_users', value: String(affectedUsers), whyItMatters: 'User-facing impact carries retention and reputational cost beyond operational cost.' }] : []),
        ...(avgMTTR > 0 ? [{ signal: 'avg_duration', value: `${Math.round(avgMTTR)}m`, whyItMatters: 'Each occurrence degrades user experience for this duration.' }] : []),
      ],
      recommendedActions: [
        {
          priority: 'IMMEDIATE',
          title: hasRCA
            ? `Investigate root cause entity: ${pattern?.dimensions.primaryRootCause ?? 'identified entity'}`
            : 'Initiate root cause investigation to unlock cost recovery',
          recommendationStrength: 'Evidence-backed',
          reason: `rca_availability: ${hasRCA ? 'Present — root cause entity known' : 'Missing'}; operational_cost: ${Math.round(cost)} units recoverable through recurrence reduction`,
          dynatraceCapability: hasRCA ? 'Live Debugger' : 'Davis AI',
          dynatraceFeature:    hasRCA ? 'Live Debugger' : 'Davis AI',
          effort: 'Low',
          personaFit: persona === 'executive' ? 'Authorise investigation with cost recovery justification.' : persona === 'developer' ? 'Targeted technical investigation of root cause entity.' : 'SRE-led investigation using Davis AI evidence.',
        },
        {
          priority: 'SHORT_TERM',
          title: hasPayment ? 'Review payment service stability and SLO alignment' : hasCheckout ? 'Assess checkout service reliability against cost exposure' : 'Assess affected service reliability against cost exposure',
          recommendationStrength: affectedUsers > 0 ? 'Evidence-backed' : 'Candidate',
          reason: `affected_users: ${affectedUsers}; avg_duration: ${Math.round(avgMTTR)}m; operational_cost: ${Math.round(cost)}`,
          dynatraceCapability: 'Site Reliability Guardian',
          dynatraceFeature:    'Site Reliability Guardian',
          effort: 'Medium',
          personaFit: persona === 'executive' ? 'SLO alignment confirms business risk threshold.' : 'SRE-owned SLO review against observed cost and user impact.',
        },
        ...( persona !== 'executive' ? [{
          priority: 'STRATEGIC' as const,
          title: 'Assign service ownership to establish remediation accountability',
          recommendationStrength: 'Data-gap' as RecommendationStrength,
          reason: 'owner_team is absent — no accountable party assigned to act on cost recovery findings',
          dynatraceCapability: 'Ownership and Routing',
          dynatraceFeature:    'Ownership and Routing',
          effort: 'Low' as const,
          personaFit: 'Platform or SRE team to tag ownership metadata, unblocking escalation path.',
        }] : []),
      ],
      risks: [
        `trend is ${trend}: cost of ${Math.round(cost)} units will continue without intervention.`,
        ...(!hasRCA ? ['rca_availability: Missing — cost recovery cannot be precisely targeted until root cause is confirmed.'] : []),
      ],
      dataGaps: [
        ...(!hasRCA ? ['rca_availability: Missing — root cause entity is null.'] : []),
        'owner_team: absent — no responsible team identified.',
        'deployment_correlation: not available.',
      ],
      summary: `${occurrences} recurring occurrences with ${Math.round(cost).toLocaleString()} units estimated cost. ${hasRCA ? 'Root cause identified.' : 'Root cause missing.'}`,
      patterns: [
        `${occurrences} occurrences detected — recurring operational cost pattern`,
        trend !== 'DECREASING' ? 'Trend is not improving — cost will continue without action' : 'Trend is decreasing — monitor for sustained improvement',
      ],
      costNarrative: `Estimated ${Math.round(cost).toLocaleString()} units in operational cost across ${occurrences} occurrences.`,
      sloImpact: '',
      noiseAssessment: '',
      generatedBy: 'mock', latencyMs: 1200,
    };
  }
}

// ------------------------------------
// Factory
// ------------------------------------
export function createAIService(): AISummarizationService {
  return new MockAIAdapter();
}
