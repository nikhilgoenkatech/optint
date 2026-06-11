// ============================================================
// AI SUMMARIZATION SERVICE
// Interface + Davis CoPilot production adapter + Mock adapter
// ============================================================

import { CostEstimate, DynatraceProblem } from '../models';
import { PersonaType } from '../persona/PersonaResolver';
import { AISummaryRequest, buildDavisCopilotPayload } from '../persona/PersonaPromptBuilder';

// ------------------------------------
// Shared types
// ------------------------------------
export interface AIRecommendation {
  priority: 'IMMEDIATE' | 'SHORT_TERM' | 'STRATEGIC';
  title: string;
  description: string;
  dynatraceFeature?: string;
  estimatedImpact: string;
  owner: string;
}

export interface AISummary {
  summary: string;
  patterns: string[];
  costNarrative: string;
  sloImpact: string;
  noiseAssessment: string;
  recommendations: AIRecommendation[];
  generatedBy: 'davis-copilot' | 'mock';
  latencyMs: number;
}

// ------------------------------------
// Interface — swap adapters freely
// ------------------------------------
export interface AISummarizationService {
  summarize(
    problems: DynatraceProblem[],
    persona: PersonaType,
    costEstimates: CostEstimate[],
    totalCost: number
  ): Promise<AISummary>;
}

// ------------------------------------
// PRODUCTION: Davis CoPilot Adapter
// ------------------------------------
export class DavisCopilotAdapter implements AISummarizationService {
  // import { davisCopilotClient } from '@dynatrace-sdk/client-davis-copilot';

  private conversationId: string | null = null;

  async summarize(
    problems: DynatraceProblem[],
    persona: PersonaType,
    costEstimates: CostEstimate[],
    totalCost: number
  ): Promise<AISummary> {
    const t0 = Date.now();
    const req: AISummaryRequest = { problems, persona, costEstimates, totalCost };
    const payload = buildDavisCopilotPayload(req);

    // Production Davis CoPilot SDK call:
    //
    // const client = davisCopilotClient();
    //
    // // Start conversation if needed
    // if (!this.conversationId) {
    //   const conv = await client.createConversation({});
    //   this.conversationId = conv.id;
    // }
    //
    // const response = await client.createConversationMessage({
    //   conversationId: this.conversationId,
    //   body: payload.message,
    // });
    //
    // const text = response.message?.content ?? '';
    // const parsed = JSON.parse(text);

    // Alternatively — direct REST call if SDK version doesn't match:
    //
    // const response = await fetch('/platform/copilot/v1/conversations/messages', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     conversationId: this.conversationId,
    //     message: payload.message,
    //   }),
    // });
    // const { message } = await response.json();
    // const parsed = JSON.parse(message.content);

    // Stub — replace with real call above
    void payload;
    throw new Error('DavisCopilotAdapter: wire up SDK call (see comments above)');

    // return {
    //   ...parsed,
    //   generatedBy: 'davis-copilot',
    //   latencyMs: Date.now() - t0,
    // };
  }
}

// ------------------------------------
// DEVELOPMENT / FALLBACK: Mock Adapter
// ------------------------------------
export class MockAIAdapter implements AISummarizationService {
  async summarize(
    problems: DynatraceProblem[],
    persona: PersonaType,
    _costEstimates: CostEstimate[],
    totalCost: number
  ): Promise<AISummary> {
    await new Promise(r => setTimeout(r, 1400)); // simulate latency

    const titles = problems.map(p => p.title);
    const hasPayment = titles.some(t => t.toLowerCase().includes('payment'));
    const hasCheckout = titles.some(t => t.toLowerCase().includes('checkout'));
    const hasAuth = titles.some(t => t.toLowerCase().includes('auth'));

    if (persona === 'executive') {
      return {
        summary: `${problems.length} customer-facing incidents have been identified this period, affecting an estimated ${problems.reduce((a,p)=>a+(p.affectedUsers??0),0).toLocaleString()} customers. ${hasPayment ? 'Payment processing disruptions represent the highest revenue risk.' : hasCheckout ? 'Checkout performance has degraded repeatedly, creating friction in the purchase journey.' : 'Service availability issues have directly impacted customer experience.'} These are recurring patterns — not isolated events — indicating systemic investment is needed.`,
        patterns: [
          hasPayment ? 'Payment systems have failed 3 times in 7 days — a recurring operational liability' : 'The same platform component is failing repeatedly under load',
          'Resolution times are averaging over 1 hour, suggesting incident response gaps',
          totalCost > 50000 ? `Estimated $${totalCost.toLocaleString()} in losses makes this a board-level operational risk` : `Compounding cost impact across repeated incidents warrants executive attention`,
        ],
        costNarrative: `These incidents represent approximately $${totalCost.toLocaleString()} in combined revenue impact and engineering resolution costs this period.`,
        sloImpact: '',
        noiseAssessment: '',
        recommendations: [
          { priority: 'IMMEDIATE', title: 'Commission an incident review', description: 'Mandate a structured post-incident review for all recurring P1/P2 issues with board visibility on outcomes', estimatedImpact: 'Stop the same incidents recurring within 30 days', owner: 'CTO / Engineering Leadership' },
          { priority: 'SHORT_TERM', title: 'Invest in platform resilience', description: 'Allocate engineering capacity to address the root causes identified — this is technical debt manifesting as revenue loss', estimatedImpact: 'Reduce recurring incident rate by 60% within 90 days', owner: 'VP Engineering' },
          { priority: 'STRATEGIC', title: 'Establish operational health OKRs', description: 'Set quarterly targets for MTTR reduction, incident recurrence rate, and customer impact minimisation with executive sponsorship', estimatedImpact: 'Create accountability and sustained improvement', owner: 'CTO + Product' },
        ],
        generatedBy: 'mock',
        latencyMs: 1400,
      };
    }

    if (persona === 'developer') {
      return {
        summary: `Analysis of ${problems.length} problems points to ${hasPayment && hasCheckout ? 'database connection pool exhaustion and capacity limits as the dual root causes' : hasCheckout ? 'upstream capacity constraints hitting the checkout service under peak load' : 'repeated service-level failures with insufficient root cause documentation'}. ${problems.filter(p=>!p.hasRootCause).length} of ${problems.length} problems are missing root cause analysis, reducing your ability to prevent recurrence. The recurring signature suggests these are not random failures — they are deterministic under specific load or time conditions.`,
        patterns: [
          hasPayment ? 'Connection pool exhaustion on payments-db under concurrent transaction load — classic N+1 or pool misconfiguration' : 'Service degradation pattern correlates with traffic spikes — capacity or resource limit issue',
          problems.filter(p=>p.recurrenceScore&&p.recurrenceScore>=60).length > 0 ? 'High recurrence score indicates same code path or config is failing repeatedly' : 'Multiple services affected suggests shared dependency or infrastructure bottleneck',
          'MTTR above 60 minutes suggests lack of runbook or automated remediation for known failure modes',
        ],
        costNarrative: '',
        sloImpact: '',
        noiseAssessment: '',
        recommendations: [
          { priority: 'IMMEDIATE', title: hasPayment ? 'Increase payments-db connection pool (100 → 300)' : 'Add circuit breaker to failing service', description: hasPayment ? 'Update HikariCP max-pool-size in payment-gateway config. Deploy PgBouncer as connection pooler to absorb spikes without DB config changes.' : 'Implement Resilience4j circuit breaker on the failing downstream call. Set failure threshold at 50%, wait duration 30s.', estimatedImpact: 'Eliminate root cause for recurring payment failures', owner: 'team:payments' },
          { priority: 'SHORT_TERM', title: 'Add automated root cause tags to all P1/P2 problems', description: 'Configure Dynatrace problem comments workflow to require root cause classification before status change to RESOLVED. Use Davis AI evidence as starting point.', estimatedImpact: 'Reduce recurrence by 35% within 60 days (correlating with RCA completion)', owner: 'team:sre' },
          { priority: 'SHORT_TERM', title: hasCheckout ? 'Implement auto-scaling for checkout service (14:00–18:00 UTC)' : 'Set up predictive scaling for high-traffic windows', description: 'Configure HPA with custom metric (request rate) to scale checkout replicas 3→8 during daily peak window. Add KEDA for event-driven scaling.', estimatedImpact: 'Eliminate peak-hour degradation', owner: 'team:checkout' },
        ],
        generatedBy: 'mock',
        latencyMs: 1400,
      };
    }

    // SRE
    return {
      summary: `Operational analysis of ${problems.length} problems reveals ${problems.filter(p=>p.recurrenceScore&&p.recurrenceScore>=60).length} high-recurrence patterns, ${problems.filter(p=>!p.hasRootCause).length} problems missing RCA, and an estimated $${totalCost.toLocaleString()} total cost impact. ${problems.filter(p=>p.duration&&p.duration<15).length > 0 ? `${problems.filter(p=>p.duration&&p.duration<15).length} incidents auto-resolved in under 15 minutes — these are alert noise candidates requiring threshold review.` : 'Alert quality appears reasonable — most incidents had meaningful duration and user impact.'} MTTR trend is degrading — average resolution time has increased, suggesting incident response gaps or alert fatigue.`,
      patterns: [
        'Temporal correlation: checkout and payment failures cluster between 14:00–18:00 UTC — consistent with peak traffic window, not random failure',
        problems.filter(p=>!p.hasRootCause).length > 2 ? 'RCA gap: majority of incidents closed without documented root cause — violates post-incident hygiene and drives recurrence' : 'RCA coverage acceptable but incomplete for recurring patterns',
        hasAuth ? 'Auth service outage (P-011) had downstream blast radius across ShopApp and AdminPortal — single point of failure risk unaddressed' : 'Shared database dependency appears in multiple incident chains — single point of failure concern',
      ],
      costNarrative: `Estimated $${totalCost.toLocaleString()} total impact across selected incidents ($${Math.round(totalCost * 0.65).toLocaleString()} revenue, $${Math.round(totalCost * 0.35).toLocaleString()} engineering cost).`,
      sloImpact: `${problems.filter(p=>p.severity==='AVAILABILITY').length > 0 ? 'AVAILABILITY incidents directly breach uptime SLO — error budget consumption estimated at 18% of monthly budget for this period.' : 'No direct SLO breach detected, but PERFORMANCE degradations are consuming error budget for latency SLOs.'} Review SLO burn rate dashboards immediately.`,
      noiseAssessment: problems.filter(p=>p.duration&&p.duration<15).length > 0 ? `${problems.filter(p=>p.duration&&p.duration<15).length} incidents flagged as potential noise (auto-resolved <15min, zero user impact). Recommend: raise alert threshold to 95% CPU or exclude known batch job windows (02:00–04:00 UTC).` : 'No significant alert noise detected in selected incidents.',
      recommendations: [
        { priority: 'IMMEDIATE', title: hasPayment ? 'Hotfix: payments-db connection pool exhaustion' : 'Incident: mitigate open P1 now', description: hasPayment ? 'Increase max_connections on payments-db (ALTER SYSTEM SET max_connections=300). Restart PgBouncer. Monitor connection wait time metric.' : 'Follow runbook for current open incidents. Escalate to on-call lead if MTTR exceeds 30 minutes.', estimatedImpact: 'Stop active bleeding — prevent further user impact', owner: 'on-call SRE' },
        { priority: 'SHORT_TERM', title: 'Tune alert thresholds to reduce noise', description: 'For inventory-service CPU: raise threshold to 95%, exclude 02:00–04:00 UTC batch window. Review all alerts with >5 occurrences and <15min avg duration for false positive candidates.', estimatedImpact: 'Reduce alert noise by ~30%, improve on-call engineer focus', owner: 'team:platform' },
        { priority: 'SHORT_TERM', title: 'Mandate RCA completion workflow', description: 'Configure Dynatrace Workflows to block RESOLVED status on P1/P2 without root_cause_entity set. Create RCA template in problem comments.', estimatedImpact: 'Reduce incident recurrence rate by 35% within 60 days', owner: 'team:sre' },
        { priority: 'STRATEGIC', title: 'Architect for resilience: eliminate shared SPOFs', description: 'Auth service and payments-db are single points of failure. Implement active-active replication for auth-service, add read replicas for payments-db, configure proper circuit breakers across all downstream calls.', estimatedImpact: 'Eliminate blast radius of auth/payment SPOFs', owner: 'team:platform + team:payments' },
      ],
      generatedBy: 'mock',
      latencyMs: 1400,
    };
  }
}

// ------------------------------------
// Factory — picks real or mock at runtime
// ------------------------------------
export function createAIService(): AISummarizationService {
  // In production Dynatrace AppEngine:
  // Check if Davis CoPilot is available (tenant has feature enabled)
  // const isDavisCopilotEnabled = window.__DT_APP_CONTEXT__?.features?.davisCopilot ?? false;
  // return isDavisCopilotEnabled ? new DavisCopilotAdapter() : new MockAIAdapter();

  // For now: always use mock
  return new MockAIAdapter();
}
