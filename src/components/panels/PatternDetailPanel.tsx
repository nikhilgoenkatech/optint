import React, { useEffect, useState } from 'react';
import { Flex, Surface, Divider } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { Container } from '@dynatrace/strato-components/layouts';
import { EmptyState } from '@dynatrace/strato-components/content';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { PatternDetail, TrendDirection } from '../../types/views';
import { buildSignalPrompt } from '../../persona/PersonaPromptBuilder';
import {
  ActionPlanOutputs,
  actionPlanFilename,
  buildActionPlanMarkdown,
  downloadTextFile,
} from '../../lib/action-plan-export';
import {
  buildEvidenceNotebookJson,
  evidenceNotebookFilename,
  type DqlNotebookContext,
} from '../../lib/evidence-notebook-export';

const MUTED  = 'var(--dt-colors-text-neutral-subdued, #74777a)';
const DANGER = 'var(--dt-colors-text-critical-default, #c41a00)';
const OK     = 'var(--dt-colors-text-success-default, #1a7a4a)';
const WARNING = 'var(--dt-colors-text-warning-default, #b45309)';
const ACCENT = 'var(--dt-colors-background-container-primary-accent, #1496ff)';

interface PatternDetailPanelProps {
  pattern: PatternDetail | null;
  onClose: () => void;
  timeWindow?: string;
  dqlNotebookContext?: DqlNotebookContext;
}

type RecommendationStatus = 'idle' | 'loading' | 'ready' | 'insufficient' | 'error';

type RecommendationStrength = 'Evidence-backed' | 'Candidate' | 'Data-gap';
type RecommendationPriority = 'IMMEDIATE' | 'SHORT_TERM' | 'STRATEGIC';
type RecommendationEffort = 'Low' | 'Medium' | 'High' | 'Unknown';

type LegacyRecommendationResult = {
  assessment: string;
  drivers: Array<{ signal: string; value: string; whyItMatters: string }>;
  action: {
    priority: RecommendationPriority;
    title: string;
    strength: RecommendationStrength;
    reason: string;
    capability: string;
  };
  risks?: string[];
  dataGaps: string[];
};

type ExecutiveAssistResult = {
  executiveSummary: string;
  businessSignals: Array<{ signal: string; value: string; whyItMatters: string }>;
  decisionOptions: Array<{
    title: string;
    recommendationStrength: RecommendationStrength;
    priority: RecommendationPriority;
    businessRationale: string;
    evidenceUsed: string[];
    dynatraceCapability: string;
    effort: RecommendationEffort;
  }>;
  risks: string[];
  dataGaps: string[];
};

type SreAssistResult = {
  reliabilitySignals: Array<{
    signal: string;
    recommendationStrength: RecommendationStrength;
    evidence: string[];
  }>;
  recurrenceDrivers: string[];
  operationalWeaknesses: string[];
  automationOpportunities: Array<{ title: string; priority: RecommendationPriority; capability?: string; effort?: RecommendationEffort }>;
  preventionRecommendations: Array<{
    title: string;
    priority: RecommendationPriority;
    recommendationStrength: RecommendationStrength;
    evidenceUsed: string[];
    dynatraceCapability: string;
    effort: RecommendationEffort;
  }>;
  risks: string[];
  dataGaps: string[];
};

type DeveloperAssistResult = {
  investigationSummary: string;
  affectedComponents: Array<{ component: string; evidence: string[] }>;
  debuggingPath: Array<{
    step: string;
    priority?: RecommendationPriority;
    recommendationStrength: RecommendationStrength;
    evidenceUsed: string[];
    dynatraceCapability: string;
    effort: RecommendationEffort;
  }>;
  validationSteps: string[];
  remediationCandidates: Array<{
    title: string;
    priority: RecommendationPriority;
    recommendationStrength: RecommendationStrength;
    evidenceUsed: string[];
    dynatraceCapability: string;
    effort: RecommendationEffort;
  }>;
  risks: string[];
  dataGaps: string[];
};

type RecommendationResult =
  | LegacyRecommendationResult
  | ExecutiveAssistResult
  | SreAssistResult
  | DeveloperAssistResult;

type RecommendationState = {
  status: RecommendationStatus;
  result?: RecommendationResult;
  errorMessage?: string;
};

type GenerationKind = 'recommendation' | 'analysis' | 'remediation' | 'alert_tuning';

function isMeaningfulSignal(value: string | number | string[] | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '' && value.trim().toLowerCase() !== 'absent';
  return Number.isFinite(value);
}

function signalText(value: string | number | string[] | null | undefined): string {
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined || value === '') return 'absent';
  return String(value);
}

function signalLabel(signal: string): string {
  const labels: Record<string, string> = {
    affected_entity_count: 'Affected entities',
    affected_services: 'Affected services',
    affected_users: 'Affected users',
    avg_duration: 'Avg MTTR',
    event_category: 'Failure type',
    occurrence_count: 'Occurrences',
    operational_cost: 'Operational cost',
    potential_savings: 'Recoverable value',
    rca_availability: 'Root cause evidence',
    recommendation_type: 'Recommended lever',
    root_cause_entity: 'Root cause entity',
    scope_tier: 'Blast radius',
    trend: 'Trend',
  };
  return labels[signal] || signal.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function formatCostValue(value: string | number): string {
  const raw = String(value).replace(/[$,]/g, '').trim();
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return String(value);
  return `$${numeric.toLocaleString()}`;
}

function displaySignalValue(signal: string, value: string | number): string {
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'absent') return 'Not available';
  if (signal === 'operational_cost' || signal === 'potential_savings') return formatCostValue(raw);
  if (signal === 'trend' || signal === 'recommendation_type' || signal === 'event_category' || signal === 'scope_tier') {
    return raw
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase());
  }
  return raw;
}

function displayPriority(value: RecommendationPriority): string {
  const labels: Record<RecommendationPriority, string> = {
    IMMEDIATE: 'Immediate',
    SHORT_TERM: 'Short term',
    STRATEGIC: 'Strategic',
  };
  return labels[value];
}

function displayStrength(value: RecommendationStrength): string {
  return value === 'Evidence-backed' ? 'Evidence backed' : value;
}

function InlineMetaChip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'critical' | 'warning' | 'success' | 'accent';
}) {
  const styles: Record<typeof tone, { border: string; background: string; color: string }> = {
    neutral: {
      border: 'var(--dt-colors-border-neutral-default, #d8d9df)',
      background: 'var(--dt-colors-background-container-neutral-subdued, #f7f8fa)',
      color: 'var(--dt-colors-text-neutral-default, #23282d)',
    },
    critical: {
      border: 'var(--dt-colors-border-critical-default, #c41425)',
      background: 'var(--dt-colors-background-container-critical-subdued, #fff0f0)',
      color: 'var(--dt-colors-text-critical-default, #c41425)',
    },
    warning: {
      border: 'var(--dt-colors-border-warning-default, #d18700)',
      background: 'var(--dt-colors-background-container-warning-subdued, #fff7e6)',
      color: 'var(--dt-colors-text-warning-default, #8a5a00)',
    },
    success: {
      border: 'var(--dt-colors-border-success-default, #2f7d32)',
      background: 'var(--dt-colors-background-container-success-subdued, #edf8ee)',
      color: 'var(--dt-colors-text-success-default, #2f7d32)',
    },
    accent: {
      border: 'var(--dt-colors-border-primary-default, #1496ff)',
      background: 'var(--dt-colors-background-container-primary-subdued, #eef7ff)',
      color: 'var(--dt-colors-text-primary-default, #0b65c2)',
    },
  };
  const style = styles[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        border: `1px solid ${style.border}`,
        background: style.background,
        color: style.color,
        borderRadius: 999,
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.4,
      }}
    >
      {children}
    </span>
  );
}

function priorityTone(value: RecommendationPriority): 'critical' | 'warning' | 'success' {
  if (value === 'IMMEDIATE') return 'critical';
  if (value === 'SHORT_TERM') return 'warning';
  return 'success';
}

function evidenceItems(reason: string): Array<{ signal: string; label: string; value: string }> {
  return reason
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const [signal, ...valueParts] = part.split('=');
      const normalizedSignal = signal.trim();
      const value = valueParts.join('=').trim();
      return {
        signal: normalizedSignal,
        label: signalLabel(normalizedSignal),
        value: displaySignalValue(normalizedSignal, value || 'absent'),
      };
    });
}

function formatObjective(objective: PatternDetail['assistContext']['objective']): string {
  return objective.replace('_', ' ');
}

function evidenceValue(pattern: PatternDetail, key: string): string {
  return signalText(pattern.assistContext.evidence[key]);
}

function meaningfulDrivers(drivers: LegacyRecommendationResult['drivers']): LegacyRecommendationResult['drivers'] {
  return drivers.filter(driver => driver.value !== 'absent' && driver.value !== '');
}

function personaCapability(persona: PatternDetail['assistContext']['persona'], kind: GenerationKind, objective: PatternDetail['assistContext']['objective']): string {
  if (objective === 'alert_optimization') return 'Davis AI';
  if (persona === 'developer') return kind === 'remediation' ? 'Application Observability' : 'Live Debugger';
  if (persona === 'sre') return kind === 'remediation' ? 'Workflows' : 'Site Reliability Guardian';
  return 'Davis AI';
}

function personaActionTitle(pattern: PatternDetail, kind: GenerationKind): string {
  const persona = pattern.assistContext.persona;
  const objective = pattern.assistContext.objective;
  const rootCause = evidenceValue(pattern, 'root_cause_entity');
  const services = evidenceValue(pattern, 'affected_services');

  if (objective === 'alert_optimization') {
    if (kind === 'alert_tuning') return 'Suggest scoped alert tuning for this recurring signal';
    return 'Review alert tuning and routing for this recurring signal';
  }

  if (persona === 'sre') {
    return kind === 'remediation'
      ? 'Create a prevention path for the recurring reliability risk'
      : 'Assess reliability drivers and automation opportunity';
  }

  if (persona === 'developer') {
    if (kind === 'remediation') {
      return rootCause !== 'absent'
        ? `Remediate the observed root cause: ${rootCause}`
        : 'Prepare technical remediation after root cause is confirmed';
    }
    return services !== 'absent'
      ? `Investigate affected service path: ${services}`
      : 'Identify the affected service before code-level investigation';
  }

  return pattern.recommendedAction;
}

function buildGenericRecommendation(pattern: PatternDetail, kind: GenerationKind = 'recommendation'): LegacyRecommendationResult | null {
  const evidence = pattern.assistContext.evidence;
  const objective = pattern.assistContext.objective;
  const persona = pattern.assistContext.persona;
  const signals = Object.entries(evidence).filter(([, value]) => isMeaningfulSignal(value));

  if (signals.length < 3) return null;

  const occurrences = signalText(evidence.occurrence_count);
  const cost = signalText(evidence.operational_cost);
  const savings = signalText(evidence.potential_savings);
  const users = signalText(evidence.affected_users);
  const trend = signalText(evidence.trend);
  const rca = signalText(evidence.rca_availability);
  const category = signalText(evidence.event_category);
  const affectedServices = signalText(evidence.affected_services);
  const rootCause = signalText(evidence.root_cause_entity);
  const recommendationType = signalText(evidence.recommendation_type);
  const alertEvents = signalText(evidence.alert_event_count);
  const avgDuration = signalText(evidence.avg_duration);
  const affectedEntityCount = signalText(evidence.affected_entity_count);
  const scopeTier = signalText(evidence.scope_tier);

  const drivers = meaningfulDrivers([
    isMeaningfulSignal(evidence.operational_cost)
      ? {
          signal: 'operational_cost',
          value: cost,
          whyItMatters: objective === 'cost_impact'
            ? 'Cost is the primary executive signal for prioritising recurring risk.'
            : 'Cost provides guardrails for how much tuning effort is justified.',
        }
      : null,
    isMeaningfulSignal(evidence.occurrence_count)
      ? {
          signal: 'occurrence_count',
          value: occurrences,
          whyItMatters: objective === 'alert_optimization'
            ? 'Repeated signals indicate whether alert tuning is worth reviewing.'
            : 'Recurring problems multiply business exposure over the selected period.',
        }
      : null,
    isMeaningfulSignal(evidence.affected_users)
      ? {
          signal: 'affected_users',
          value: users,
          whyItMatters: 'Customer impact changes the executive priority of the pattern.',
        }
      : null,
    isMeaningfulSignal(evidence.trend)
      ? {
          signal: 'trend',
          value: trend,
          whyItMatters: 'Trend shows whether recurrence is improving, stable, or getting worse.',
      }
      : null,
    isMeaningfulSignal(evidence.event_category)
      ? {
          signal: 'event_category',
          value: category,
          whyItMatters: persona === 'developer'
            ? 'Failure category helps choose the technical investigation path.'
            : 'Failure category helps classify the operational signal without inferring hidden causes.',
        }
      : null,
    isMeaningfulSignal(evidence.affected_services)
      ? {
          signal: 'affected_services',
          value: affectedServices,
          whyItMatters: persona === 'developer'
            ? 'Affected services define the starting point for engineering investigation.'
            : 'Affected services define ownership and routing scope.',
        }
      : null,
    isMeaningfulSignal(evidence.rca_availability)
      ? {
          signal: 'rca_availability',
          value: rca,
          whyItMatters: 'RCA is treated as present or missing evidence, not as a confidence score.',
        }
      : null,
  ].filter(Boolean) as LegacyRecommendationResult['drivers']);

  const dataGaps = [
    !isMeaningfulSignal(evidence.potential_savings) ? 'Recoverable value is missing.' : null,
    !isMeaningfulSignal(evidence.affected_users) ? 'Affected users are missing.' : null,
    !isMeaningfulSignal(evidence.root_cause_entity) ? 'Root cause entity is missing.' : null,
    !isMeaningfulSignal(evidence.affected_services) ? 'Affected services are missing.' : null,
  ].filter(Boolean) as string[];

  if (kind === 'alert_tuning') {
    const strength = drivers.length >= 3 ? 'Evidence-backed' : 'Candidate';
    const hasUserImpact = Number(users) > 0;
    const appearsSystemic = Number(occurrences) >= 3 || trend.toLowerCase() === 'increasing';
    const tuningTitle = recommendationType === 'ADD_TIME_WINDOW'
      ? 'Review time-window tuning for this recurring signal'
      : recommendationType === 'RAISE_THRESHOLD'
        ? 'Review detector sensitivity for this recurring signal'
        : 'Review alert routing and detector tuning for this recurring signal';

    return {
      assessment: `This alert tuning review uses ${occurrences} occurrence(s), ${displaySignalValue('alert_event_count', alertEvents)} alert event(s), a ${displaySignalValue('trend', trend)} trend, and ${displaySignalValue('event_category', category)} signal type. The repeated grouping appears ${appearsSystemic ? 'systemic within the selected timeframe' : 'limited in the selected timeframe'} based only on the supplied recurrence signals.`,
      drivers: meaningfulDrivers([
        ...drivers,
        isMeaningfulSignal(evidence.alert_event_count)
          ? {
              signal: 'alert_event_count',
              value: alertEvents,
              whyItMatters: 'Alert event volume helps separate noisy repetition from isolated problem recurrence.',
            }
          : null,
        isMeaningfulSignal(evidence.avg_duration)
          ? {
              signal: 'avg_duration',
              value: avgDuration,
              whyItMatters: 'Short-lived signals may justify window or sample tuning, while longer durations require more caution.',
            }
          : null,
        isMeaningfulSignal(evidence.scope_tier)
          ? {
              signal: 'scope_tier',
              value: scopeTier,
              whyItMatters: 'Scope determines whether tuning should be narrow, routed, or reviewed at detector level.',
            }
          : null,
      ].filter(Boolean) as LegacyRecommendationResult['drivers']),
      action: {
        priority: strength === 'Evidence-backed' ? 'SHORT_TERM' : 'STRATEGIC',
        title: tuningTitle,
        strength,
        reason: `occurrence_count=${occurrences}; alert_event_count=${alertEvents}; avg_duration=${avgDuration}; affected_users=${users}; recommendation_type=${recommendationType}`,
        capability: personaCapability(persona, kind, objective),
      },
      risks: [
        hasUserImpact
          ? `Affected users are ${users}; do not suppress or widen windows until customer-impact risk is reviewed.`
          : 'Affected users are 0 or absent; verify this before treating the signal as low-impact noise.',
        `Scope is ${displaySignalValue('scope_tier', scopeTier)} across ${displaySignalValue('affected_entity_count', affectedEntityCount)} affected entity count; avoid broad suppression without scoped evidence.`,
        'RCA is treated only as Present or Missing; do not use this action to validate RCA correctness.',
      ],
      dataGaps: [
        ...dataGaps,
        !isMeaningfulSignal(evidence.alert_event_count) ? 'Alert event count is missing.' : null,
        !isMeaningfulSignal(evidence.avg_duration) ? 'Average duration is missing.' : null,
        !isMeaningfulSignal(evidence.recommendation_type) ? 'Recommended tuning lever is missing.' : null,
      ].filter(Boolean) as string[],
    };
  }

  if (kind === 'analysis') {
    const title = personaActionTitle(pattern, kind);
    const capability = personaCapability(persona, kind, objective);
    const serviceClause = affectedServices !== 'absent' && affectedServices !== 'Unknown Service'
      ? `${displaySignalValue('affected_services', affectedServices)} affected service evidence`
      : 'no confirmed service evidence';
    return {
      assessment: persona === 'sre'
        ? `This reliability review uses ${occurrences} occurrence(s), a ${displaySignalValue('trend', trend)} trend, ${displaySignalValue('event_category', category)} signal type, and ${displaySignalValue('rca_availability', rca)} root cause evidence. Next steps focus on recurrence drivers, automation, and routing based only on the supplied signals.`
        : `This developer review uses ${occurrences} occurrence(s), ${serviceClause}, ${displaySignalValue('event_category', category)} signal type, and ${displaySignalValue('rca_availability', rca)} root cause evidence. The investigation path is derived from the supplied evidence only.`,
      drivers,
      action: {
        priority: 'SHORT_TERM',
        title,
        strength: drivers.length >= 3 ? 'Evidence-backed' : 'Candidate',
        reason: `occurrence_count=${occurrences}; affected_services=${affectedServices}; rca_availability=${rca}`,
        capability,
      },
      dataGaps,
    };
  }

  if (kind === 'remediation') {
    const title = personaActionTitle(pattern, kind);
    const capability = personaCapability(persona, kind, objective);
    const rcaClause = rootCause !== 'absent' ? `root cause: ${rootCause}` : 'no confirmed root cause';
    const svcClause = affectedServices !== 'absent' && affectedServices !== 'Unknown Service'
      ? `${displaySignalValue('affected_services', affectedServices)} service evidence`
      : 'no confirmed service evidence';
    return {
      assessment: persona === 'sre'
        ? `This remediation path uses ${occurrences} occurrence(s), ${displaySignalValue('operational_cost', cost)} operational cost, a ${displaySignalValue('trend', trend)} trend, and ${displaySignalValue('rca_availability', rca)} root cause evidence. It prioritises prevention and automation only where the signals justify it.`
        : `This remediation path uses ${occurrences} occurrence(s), ${svcClause}, ${rcaClause}, and ${displaySignalValue('event_category', category)} signal type. Code-level steps are only suggested when root cause evidence is present.`,
      drivers,
      action: {
        priority: drivers.length >= 3 ? 'SHORT_TERM' : 'STRATEGIC',
        title,
        strength: drivers.length >= 3 ? 'Evidence-backed' : 'Candidate',
        reason: `operational_cost=${cost}; occurrence_count=${occurrences}; root_cause_entity=${rootCause}`,
        capability,
      },
      dataGaps,
    };
  }

  if (objective === 'alert_optimization') {
    const strength = drivers.length >= 3 ? 'Evidence-backed' : 'Candidate';
    const title = persona === 'executive'
      ? 'Decide whether alert noise reduction is justified by observed recurrence'
      : 'Review alert tuning for this recurring signal';
    return {
      assessment: persona === 'executive'
        ? `This recurring signal appeared ${occurrences} time(s) with ${displaySignalValue('operational_cost', cost)} in modeled operational cost and a ${displaySignalValue('trend', trend)} trend. Because the goal is alert optimization, the executive recommendation focuses on whether noise reduction is worth sponsoring, not on detector configuration.`
        : `This recurring signal appeared ${occurrences} time(s) with ${displaySignalValue('operational_cost', cost)} in modeled operational cost and a ${displaySignalValue('trend', trend)} trend. Because the objective is alert optimization, the recommendation focuses on signal quality, routing, and scoped tuning rather than service remediation.`,
      drivers,
      action: {
        priority: strength === 'Evidence-backed' ? 'SHORT_TERM' : 'STRATEGIC',
        title,
        strength,
        reason: `occurrence_count=${occurrences}; trend=${trend}; recommendation_type=${recommendationType}`,
        capability: personaCapability(persona, kind, objective),
      },
      dataGaps,
    };
  }

  const strength = drivers.length >= 3 ? 'Evidence-backed' : 'Candidate';
  return {
    assessment: `This recurring pattern appeared ${occurrences} time(s) and represents ${displaySignalValue('operational_cost', cost)} in modeled operational cost. ${users !== 'absent' ? `${displaySignalValue('affected_users', users)} affected user(s) are recorded in the supplied evidence.` : 'Affected-user evidence is not available.'} ${savings !== 'absent' ? `${displaySignalValue('potential_savings', savings)} is modeled as recoverable value.` : 'Recoverable value is not available, so the recommendation stays conservative.'}`,
    drivers,
    action: {
      priority: strength === 'Evidence-backed' ? 'IMMEDIATE' : 'SHORT_TERM',
      title: pattern.recommendedAction,
      strength,
      reason: `operational_cost=${cost}; occurrence_count=${occurrences}; affected_users=${users}`,
      capability: personaCapability(persona, kind, objective),
    },
    dataGaps,
  };
}

function driverEvidence(drivers: LegacyRecommendationResult['drivers']): string[] {
  return drivers.slice(0, 4).map(driver => `${signalLabel(driver.signal)}: ${displaySignalValue(driver.signal, driver.value)}`);
}

function buildExecutiveResult(pattern: PatternDetail, base: LegacyRecommendationResult): ExecutiveAssistResult {
  const ev = pattern.assistContext.evidence;
  const objective = pattern.assistContext.objective;
  const hasRCA = ev.rca_availability === 'Present';
  const occurrences = signalText(ev.occurrence_count);
  const trend = signalText(ev.trend);
  const entities = signalText(ev.affected_entity_count);
  const evidence = driverEvidence(base.drivers);

  const decisionOptions: ExecutiveAssistResult['decisionOptions'] = [
    {
      title: base.action.title,
      recommendationStrength: base.action.strength,
      priority: base.action.priority,
      businessRationale: base.action.reason,
      evidenceUsed: evidence,
      dynatraceCapability: base.action.capability,
      effort: 'Medium',
    },
  ];

  if (objective === 'cost_impact') {
    if (!hasRCA) {
      decisionOptions.push({
        title: `Mandate root cause documentation on the next occurrence to break the ${occurrences}-recurrence cycle`,
        recommendationStrength: 'Evidence-backed',
        priority: 'IMMEDIATE',
        businessRationale: `With ${occurrences} occurrences and no RCA record, the organisation has no basis for prevention. Mandating structured investigation output on the next occurrence is the minimum action required.`,
        evidenceUsed: ['rca_availability: Missing', `occurrence_count: ${occurrences}`, `trend: ${trend}`],
        dynatraceCapability: 'Davis AI',
        effort: 'Low',
      });
    }
    decisionOptions.push({
      title: `Establish an availability SLO covering the ${entities} affected entities to formalise reliability targets`,
      recommendationStrength: 'Evidence-backed',
      priority: 'SHORT_TERM',
      businessRationale: `No formal availability target exists across ${entities} entities with a ${trend} trend. Formalising an SLO creates a governance structure needed to prioritise remediation investment.`,
      evidenceUsed: [`affected_entity_count: ${entities}`, `trend: ${trend}`, `occurrence_count: ${occurrences}`, 'event_category: AVAILABILITY'],
      dynatraceCapability: 'SLO',
      effort: 'Medium',
    });
    decisionOptions.push({
      title: 'Assign service ownership to enable routing and accountability for recurrence prevention',
      recommendationStrength: hasRCA ? 'Evidence-backed' : 'Candidate',
      priority: 'STRATEGIC',
      businessRationale: 'Without ownership assignment, there is no accountable party to act on cost recovery findings or sponsor remediation investment.',
      evidenceUsed: ['affected_services: Unknown Service', 'root_cause_entity: null'],
      dynatraceCapability: 'Ownership and Routing',
      effort: 'Low',
    });
  } else {
    decisionOptions.push({
      title: 'Sponsor a structured alert quality review to reduce noise from this recurring signal',
      recommendationStrength: 'Evidence-backed',
      priority: 'SHORT_TERM',
      businessRationale: `${occurrences} occurrences with a ${trend} trend qualifies this signal for executive-sponsored tuning prioritisation.`,
      evidenceUsed: [`occurrence_count: ${occurrences}`, `trend: ${trend}`],
      dynatraceCapability: 'Davis AI',
      effort: 'Low',
    });
  }

  const uniqueOptions = decisionOptions.filter((opt, idx, arr) =>
    arr.findIndex(o => o.title === opt.title) === idx
  );

  return {
    executiveSummary: base.assessment,
    businessSignals: base.drivers.slice(0, 5).map(driver => ({
      signal: signalLabel(driver.signal),
      value: displaySignalValue(driver.signal, driver.value),
      whyItMatters: driver.whyItMatters,
    })),
    decisionOptions: uniqueOptions,
    risks: base.risks ?? [],
    dataGaps: base.dataGaps,
  };
}

function buildSreResult(pattern: PatternDetail, base: LegacyRecommendationResult): SreAssistResult {
  const ev = pattern.assistContext.evidence;
  const evidence = driverEvidence(base.drivers);
  const hasRCA = ev.rca_availability === 'Present';
  const rootCause = signalText(ev.root_cause_entity);
  const occurrences = signalText(ev.occurrence_count);
  const trend = signalText(ev.trend);
  const entities = signalText(ev.affected_entity_count);
  const category = signalText(ev.event_category);

  const automationOpportunities: SreAssistResult['automationOpportunities'] = [
    ...(hasRCA ? [{
      title: `Immediately investigate root cause entity "${rootCause}" using Davis AI to confirm whether it is the active failure origin`,
      priority: 'IMMEDIATE' as RecommendationPriority,
      capability: 'Davis AI',
      effort: 'Low' as RecommendationEffort,
    }] : [{
      title: `Trigger structured incident investigation to establish root cause evidence — ${occurrences} recurrences with no RCA record`,
      priority: 'IMMEDIATE' as RecommendationPriority,
      capability: 'Davis AI',
      effort: 'Low' as RecommendationEffort,
    }]),
    {
      title: `Set up a Site Reliability Guardian SLO covering the ${entities} affected entities to track ${category} failure rate`,
      priority: 'SHORT_TERM' as RecommendationPriority,
      capability: 'Site Reliability Guardian',
      effort: 'Medium' as RecommendationEffort,
    },
    {
      title: `Build an AutomationEngine Workflow to auto-remediate on next recurrence and reduce manual engineering intervention`,
      priority: 'STRATEGIC' as RecommendationPriority,
      capability: 'AutomationEngine',
      effort: 'High' as RecommendationEffort,
    },
  ];

  const preventionRecommendations: SreAssistResult['preventionRecommendations'] = [
    {
      title: hasRCA
        ? `Confirm and document the root cause at "${rootCause}" — ${occurrences} occurrences require structured prevention`
        : `Mandate root cause documentation on the next occurrence to break the ${occurrences}-recurrence cycle`,
      priority: 'IMMEDIATE',
      recommendationStrength: 'Evidence-backed',
      evidenceUsed: [`rca_availability: ${hasRCA ? 'Present' : 'Missing'}`, `occurrence_count: ${occurrences}`],
      dynatraceCapability: 'Davis AI',
      effort: 'Low',
    },
    {
      title: `Establish SLO-based reliability targets for the ${entities} affected entities with a ${trend} recurrence trend`,
      priority: 'SHORT_TERM',
      recommendationStrength: 'Evidence-backed',
      evidenceUsed: [`affected_entity_count: ${entities}`, `trend: ${trend}`, `occurrence_count: ${occurrences}`],
      dynatraceCapability: 'SLO',
      effort: 'Medium',
    },
    {
      title: 'Assign service ownership to create accountability and enable automated routing for future incidents',
      priority: 'STRATEGIC',
      recommendationStrength: base.action.strength,
      evidenceUsed: evidence,
      dynatraceCapability: 'Ownership and Routing',
      effort: 'Low',
    },
  ];

  return {
    reliabilitySignals: base.drivers.slice(0, 5).map(driver => ({
      signal: signalLabel(driver.signal),
      recommendationStrength: base.action.strength,
      evidence: [`${displaySignalValue(driver.signal, driver.value)} - ${driver.whyItMatters}`],
    })),
    recurrenceDrivers: base.drivers
      .filter(driver => ['occurrence_count', 'trend', 'event_category'].includes(driver.signal))
      .map(driver => `${signalLabel(driver.signal)}: ${displaySignalValue(driver.signal, driver.value)}`),
    operationalWeaknesses: base.dataGaps.length
      ? base.dataGaps
      : ['No unresolved operational evidence gaps detected in the supplied signals.'],
    automationOpportunities,
    preventionRecommendations,
    risks: base.risks ?? [],
    dataGaps: base.dataGaps,
  };
}

function buildDeveloperResult(pattern: PatternDetail, base: LegacyRecommendationResult): DeveloperAssistResult {
  const ev = pattern.assistContext.evidence;
  const service = evidenceValue(pattern, 'affected_services');
  const rootCause = evidenceValue(pattern, 'root_cause_entity');
  const hasRCA = ev.rca_availability === 'Present';
  const occurrences = signalText(ev.occurrence_count);
  const category = signalText(ev.event_category);
  const entities = signalText(ev.affected_entity_count);
  const evidence = driverEvidence(base.drivers);

  const debuggingPath: DeveloperAssistResult['debuggingPath'] = [
    {
      step: hasRCA
        ? `Use Live Debugger to inspect "${rootCause}" — root cause entity is confirmed present in the supplied evidence`
        : `Reproduce the ${category} failure in the affected service and collect trace data to establish root cause`,
      priority: 'IMMEDIATE',
      recommendationStrength: hasRCA ? 'Evidence-backed' : 'Candidate',
      evidenceUsed: [`rca_availability: ${hasRCA ? 'Present' : 'Missing'}`, `event_category: ${category}`, ...(hasRCA ? [`root_cause_entity: ${rootCause}`] : [])],
      dynatraceCapability: 'Live Debugger',
      effort: 'Low',
    },
    {
      step: `Validate that the fix does not regress across the ${entities} affected entities using Application Observability traces`,
      priority: 'SHORT_TERM',
      recommendationStrength: 'Evidence-backed',
      evidenceUsed: [`affected_entity_count: ${entities}`, `occurrence_count: ${occurrences}`],
      dynatraceCapability: 'Application Observability',
      effort: 'Medium',
    },
    {
      step: `Add a deployment quality gate in Release Management to prevent the ${category} pattern from recurring across ${entities} entities`,
      priority: 'STRATEGIC',
      recommendationStrength: base.action.strength,
      evidenceUsed: evidence,
      dynatraceCapability: 'Release Management',
      effort: 'High',
    },
  ];

  const remediationCandidates: DeveloperAssistResult['remediationCandidates'] = [
    {
      title: hasRCA
        ? `Fix the defect at "${rootCause}" — root cause entity is confirmed by Davis AI`
        : `Identify and fix the root cause of the ${category} failure in ${service !== 'absent' ? service : 'the affected service'}`,
      priority: 'IMMEDIATE',
      recommendationStrength: hasRCA ? 'Evidence-backed' : 'Candidate',
      evidenceUsed: [`rca_availability: ${hasRCA ? 'Present' : 'Missing'}`, `event_category: ${category}`],
      dynatraceCapability: 'Application Observability',
      effort: 'Medium',
    },
    {
      title: `Add canary deployment gate for ${service !== 'absent' ? service : 'the affected service'} to catch regressions before they reach production`,
      priority: 'SHORT_TERM',
      recommendationStrength: 'Candidate',
      evidenceUsed: [`occurrence_count: ${occurrences}`, `affected_entity_count: ${entities}`],
      dynatraceCapability: 'Release Management',
      effort: 'Medium',
    },
    {
      title: `Refactor service boundary to isolate the ${category} failure domain and prevent blast radius expansion beyond ${entities} entities`,
      priority: 'STRATEGIC',
      recommendationStrength: base.action.strength,
      evidenceUsed: evidence,
      dynatraceCapability: 'Site Reliability Guardian',
      effort: 'High',
    },
  ];

  return {
    investigationSummary: base.assessment,
    affectedComponents: [
      {
        component: service !== 'absent' ? service : 'Affected service not supplied',
        evidence: evidence.filter(item => item.includes('Affected services') || item.includes('Failure type')),
      },
      ...(rootCause !== 'absent'
        ? [{ component: rootCause, evidence: [`Root cause entity: ${rootCause}`] }]
        : []),
    ],
    debuggingPath,
    validationSteps: [
      'Validate the affected service and failure type against the selected pattern evidence.',
      'Confirm whether RCA is Present or Missing before applying remediation.',
      `Verify fix does not regress across all ${entities} affected entities.`,
    ],
    remediationCandidates,
    risks: base.risks ?? [],
    dataGaps: base.dataGaps,
  };
}

function buildRecommendation(pattern: PatternDetail, kind: GenerationKind = 'recommendation'): RecommendationResult | null {
  const base = buildGenericRecommendation(pattern, kind);
  if (!base) return null;

  if (pattern.assistContext.persona === 'executive') return buildExecutiveResult(pattern, base);
  if (pattern.assistContext.persona === 'sre') return buildSreResult(pattern, base);
  return buildDeveloperResult(pattern, base);
}

const PROMPT_EXCLUDED_SIGNALS = ['operational_cost', 'potential_savings', 'avg_duration'];

function buildRawPrompt(pattern: PatternDetail, kind: GenerationKind): string {
  const evidence = Object.fromEntries(
    Object.entries(pattern.assistContext.evidence).filter(([k]) => !PROMPT_EXCLUDED_SIGNALS.includes(k))
  );
  return buildSignalPrompt({
    persona: pattern.assistContext.persona,
    objective: pattern.assistContext.objective,
    evidence,
    patternTitle: pattern.title,
    recommendedAction: pattern.recommendedAction,
    kind,
  });
}

function AssistAttribution({ state }: { state: RecommendationState }) {
  if (state.status !== 'ready') return null;
  return <span style={{ fontSize: 10, color: MUTED }}>Generated by Dynatrace Assist</span>;
}

function RawPrompt({ pattern, kind }: { pattern: PatternDetail; kind: GenerationKind }) {
  const [open, setOpen] = React.useState(false);
  const prompt = buildRawPrompt(pattern, kind);
  return (
    <div style={{ marginTop: 4 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontSize: 11,
          color: MUTED,
          textDecoration: 'underline',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {open ? 'v' : '>'} View raw prompt
      </button>
      {open && (
        <pre
          style={{
            marginTop: 6,
            padding: 10,
            background: 'var(--dt-colors-background-container-neutral-subdued, #f7f8fa)',
            border: '1px solid var(--dt-colors-border-neutral-subdued, #d5d8df)',
            borderRadius: 6,
            fontSize: 10,
            lineHeight: 1.5,
            color: MUTED,
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {prompt}
        </pre>
      )}
    </div>
  );
}

function RawResponse({ state }: { state: RecommendationState }) {
  const [open, setOpen] = React.useState(false);
  if (state.status !== 'ready' || !state.result) return null;
  return (
    <div style={{ marginTop: 4 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 11, color: MUTED, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        {open ? 'v' : '>'} View raw response
      </button>
      {open && (
        <pre style={{ marginTop: 6, padding: 10, background: 'var(--dt-colors-background-container-neutral-subdued,#f7f8fa)', border: '1px solid var(--dt-colors-border-neutral-subdued,#d5d8df)', borderRadius: 6, fontSize: 10, lineHeight: 1.5, color: MUTED, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto' }}>
          {JSON.stringify(state.result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function TrendArrow({ trend }: { trend: TrendDirection }) {
  const arrow = trend === 'Increasing' ? 'Up' : trend === 'Decreasing' ? 'Down' : 'Stable';
  const color = trend === 'Increasing' ? DANGER : trend === 'Decreasing' ? OK : MUTED;
  return <span style={{ color, fontWeight: 600 }}>{arrow} {trend}</span>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontWeight: 600, fontSize: 13,
      color: 'var(--dt-colors-text-neutral-default, #23282d)' }}>
      {children}
    </span>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <Flex justifyContent="space-between" alignItems="center">
      <span style={{ fontSize: 12, color: MUTED }}>{label}</span>
      <Text>{String(value)}</Text>
    </Flex>
  );
}

function levelColor(value: string): string {
  if (value === 'High' || value === 'IMMEDIATE') return DANGER;
  if (value === 'Medium' || value === 'SHORT_TERM') return WARNING;
  if (value === 'Low' || value === 'STRATEGIC') return OK;
  return MUTED;
}

function SignalCard({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  const color = tone ? levelColor(tone) : 'var(--dt-colors-border-neutral-subdued, #d5d8df)';
  return (
    <div
      style={{
        border: '1px solid var(--dt-colors-border-neutral-subdued, #d5d8df)',
        borderLeft: `3px solid ${color}`,
        borderRadius: 6,
        padding: '5px 8px',
      }}
    >
      <div style={{
        fontWeight: 600,
        fontSize: 12,
        color: 'var(--dt-colors-text-neutral-default, #23282d)',
        overflowWrap: 'anywhere',
        lineHeight: 1.3,
      }}>
        {String(value)}
      </div>
      <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SignalGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>{children}</div>;
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Flex flexDirection="column" gap={4}>
      <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{title}</span>
      {children}
    </Flex>
  );
}

function TextList({ items }: { items: string[] }) {
  if (!items.length) return <Text textStyle="small" style={{ color: MUTED }}>No items returned.</Text>;
  return (
    <Flex flexDirection="column" gap={4}>
      {items.map((item, index) => (
        <Text key={`${item}-${index}`} textStyle="small" style={{ color: MUTED }}>{item}</Text>
      ))}
    </Flex>
  );
}

function RecommendationMeta({
  priority,
  strength,
  capability,
  effort,
}: {
  priority?: RecommendationPriority;
  strength?: RecommendationStrength;
  capability?: string;
  effort?: RecommendationEffort;
}) {
  return (
    <Flex alignItems="center" gap={8} style={{ flexWrap: 'wrap' }}>
      {priority && (
        <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_TEXT_COLOR[priority], letterSpacing: '0.04em' }}>
          {priority === 'IMMEDIATE' ? '⚡' : priority === 'SHORT_TERM' ? '⏱' : '◎'} {displayPriority(priority).toUpperCase()}
        </span>
      )}
      {capability && (
        <span style={{ fontSize: 10, color: 'var(--dt-colors-text-primary-default,#0b65c2)', border: '1px solid var(--dt-colors-border-primary-default,#1496ff)', borderRadius: 3, padding: '1px 5px' }}>
          {capability}
        </span>
      )}
      {effort && <span style={{ fontSize: 10, color: MUTED }}>{effort} effort</span>}
      {strength && strength !== 'Evidence-backed' && (
        <span style={{ fontSize: 10, color: strength === 'Candidate' ? WARNING : MUTED }}>{displayStrength(strength)}</span>
      )}
    </Flex>
  );
}

// ── New card-based layout components ────────────────────────────────────────

type KpiSignal = { label: string; value: string; tone?: 'neutral' | 'critical' | 'warning' | 'success' };

function trendTone(trend: string): 'warning' | 'success' | 'neutral' {
  const t = trend.toLowerCase();
  if (t === 'increasing') return 'warning';
  if (t === 'decreasing') return 'success';
  return 'neutral';
}

function kpiTone(signal: string, value: string): 'neutral' | 'critical' | 'warning' | 'success' {
  if (signal === 'rca_availability') return value === 'Present' ? 'success' : 'critical';
  if (signal === 'trend') return trendTone(value);
  if (signal === 'occurrence_count') {
    const n = Number(value);
    if (n > 20) return 'critical';
    if (n > 8) return 'warning';
    return 'neutral';
  }
  return 'neutral';
}

function SignalSnapshot({ signals }: { signals: KpiSignal[] }) {
  if (!signals.length) return null;
  const textColor: Record<string, string> = {
    neutral: 'var(--dt-colors-text-neutral-default,#23282d)',
    critical: 'var(--dt-colors-text-critical-default,#c41425)',
    warning: 'var(--dt-colors-text-warning-default,#8a5a00)',
    success: 'var(--dt-colors-text-success-default,#1a7a4a)',
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6 }}>
      {signals.map(sig => {
        const tone = sig.tone ?? 'neutral';
        const color = textColor[tone];
        return (
          <div key={sig.label} style={{
            border: '1px solid var(--dt-colors-border-neutral-subdued,#d5d8df)',
            borderRadius: 6,
            padding: '6px 8px',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color, lineHeight: 1.3, overflowWrap: 'anywhere' }}>{sig.value}</div>
            <div style={{ fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{sig.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function TierDivider({ label, icon, tone }: { label: string; icon: string; tone: 'critical' | 'warning' | 'success' }) {
  const color = tone === 'critical' ? 'var(--dt-colors-text-critical-default,#c41425)'
    : tone === 'warning' ? 'var(--dt-colors-text-warning-default,#8a5a00)'
    : 'var(--dt-colors-text-success-default,#1a7a4a)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '6px 0 2px' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color, whiteSpace: 'nowrap' }}>{icon} {label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--dt-colors-border-neutral-subdued,#eee)' }} />
    </div>
  );
}

type ActionCardItem = {
  title: string;
  priority?: RecommendationPriority;
  strength?: RecommendationStrength;
  capability?: string;
  effort?: RecommendationEffort;
  evidenceUsed?: string[];
};

const PRIORITY_TEXT_COLOR: Record<RecommendationPriority, string> = {
  IMMEDIATE: 'var(--dt-colors-text-critical-default,#c41425)',
  SHORT_TERM: 'var(--dt-colors-text-warning-default,#b45309)',
  STRATEGIC: 'var(--dt-colors-text-success-default,#1a7a4a)',
};

function ActionCard({ item }: { item: ActionCardItem }) {
  const borderColor = item.priority ? PRIORITY_TEXT_COLOR[item.priority] : 'var(--dt-colors-border-neutral-subdued,#d5d8df)';
  return (
    <div style={{
      border: '1px solid var(--dt-colors-border-neutral-subdued,#d5d8df)',
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 6,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--dt-colors-text-neutral-default,#23282d)', lineHeight: 1.4 }}>{item.title}</span>
      <Flex alignItems="center" gap={8} style={{ flexWrap: 'wrap' }}>
        {item.priority && (
          <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_TEXT_COLOR[item.priority], letterSpacing: '0.04em' }}>
            {item.priority === 'IMMEDIATE' ? '⚡' : item.priority === 'SHORT_TERM' ? '⏱' : '◎'} {displayPriority(item.priority).toUpperCase()}
          </span>
        )}
        {item.capability && (
          <span style={{ fontSize: 10, color: 'var(--dt-colors-text-primary-default,#0b65c2)', border: '1px solid var(--dt-colors-border-primary-default,#1496ff)', borderRadius: 3, padding: '1px 5px' }}>
            {item.capability}
          </span>
        )}
        {item.effort && item.effort !== 'Unknown' && (
          <span style={{ fontSize: 10, color: MUTED }}>{item.effort} effort</span>
        )}
        {item.strength && item.strength !== 'Evidence-backed' && (
          <span style={{ fontSize: 10, color: item.strength === 'Candidate' ? WARNING : MUTED }}>{displayStrength(item.strength)}</span>
        )}
      </Flex>
    </div>
  );
}

function TieredActions({ items }: { items: ActionCardItem[] }) {
  const immediate = items.filter(i => i.priority === 'IMMEDIATE');
  const shortTerm = items.filter(i => i.priority === 'SHORT_TERM');
  const strategic = items.filter(i => i.priority === 'STRATEGIC');
  const untiered = items.filter(i => !i.priority);
  return (
    <Flex flexDirection="column" gap={6}>
      {immediate.length > 0 && <>
        <TierDivider label="Immediate" icon="⚡" tone="critical" />
        {immediate.map((item, i) => <ActionCard key={i} item={item} />)}
      </>}
      {shortTerm.length > 0 && <>
        <TierDivider label="Short term" icon="⏱" tone="warning" />
        {shortTerm.map((item, i) => <ActionCard key={i} item={item} />)}
      </>}
      {strategic.length > 0 && <>
        <TierDivider label="Strategic" icon="◎" tone="success" />
        {strategic.map((item, i) => <ActionCard key={i} item={item} />)}
      </>}
      {untiered.map((item, i) => <ActionCard key={i} item={item} />)}
    </Flex>
  );
}

function DisclosureRow({ label, items }: { label: string; items: string[] }) {
  const [open, setOpen] = React.useState(false);
  if (!items.length) return null;
  return (
    <div style={{ borderTop: '1px solid var(--dt-colors-border-neutral-subdued,#eee)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '6px 0', background: 'transparent',
          border: 'none', cursor: 'pointer', fontSize: 11, color: MUTED,
        }}
      >
        <span>{label} <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700 }}>{items.length}</span></span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ paddingBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, i) => (
            <span key={i} style={{ fontSize: 11, color: MUTED }}>{item}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function buildSignalSnapshot(
  evidence: PatternDetail['assistContext']['evidence'],
  keys: string[],
  labelOverrides: Record<string, string> = {}
): KpiSignal[] {
  return (keys.map(k => {
    // RCA: show actual entity name when present, else "Missing"
    if (k === 'rca_availability') {
      const entity = evidence.root_cause_entity;
      const hasEntity = entity && String(entity) !== 'absent' && entity !== null;
      return {
        label: labelOverrides[k] ?? 'Root cause',
        value: hasEntity ? String(entity) : 'Missing',
        tone: (hasEntity ? 'success' : 'critical') as KpiSignal['tone'],
      };
    }
    // Blast radius: show absolute entity count
    if (k === 'affected_entity_count') {
      const raw = signalText(evidence[k]);
      const n = Number(raw);
      return {
        label: labelOverrides[k] ?? 'Blast radius',
        value: Number.isFinite(n) && n > 0 ? `${n} ${n === 1 ? 'entity' : 'entities'}` : 'Unknown',
        tone: (n > 5 ? 'warning' : 'neutral') as KpiSignal['tone'],
      };
    }
    // MTTR: show "Not resolved" when zero or absent
    if (k === 'avg_duration') {
      const raw = signalText(evidence[k]);
      const isZero = raw === 'absent' || raw === '0m' || raw === '0h 0m' || raw === '0';
      return {
        label: labelOverrides[k] ?? 'Avg MTTR',
        value: isZero ? 'Not resolved' : raw,
        tone: 'neutral' as KpiSignal['tone'],
      };
    }
    // Operational cost: always show
    if (k === 'operational_cost') {
      const raw = signalText(evidence[k]);
      return {
        label: labelOverrides[k] ?? 'Operational cost',
        value: formatCostValue(raw),
        tone: 'neutral' as KpiSignal['tone'],
      };
    }
    // Default
    if (!isMeaningfulSignal(evidence[k])) return null;
    const raw = signalText(evidence[k]);
    const display = displaySignalValue(k, raw);
    return { label: labelOverrides[k] ?? signalLabel(k), value: display, tone: kpiTone(k, raw) };
  }) as (KpiSignal | null)[]).filter((s): s is KpiSignal => s !== null);
}

function isExecutiveResult(result: RecommendationResult): result is ExecutiveAssistResult {
  return 'executiveSummary' in result;
}

function isSreResult(result: RecommendationResult): result is SreAssistResult {
  return 'reliabilitySignals' in result;
}

function isDeveloperResult(result: RecommendationResult): result is DeveloperAssistResult {
  return 'investigationSummary' in result;
}

function isLegacyResult(result: RecommendationResult): result is LegacyRecommendationResult {
  return 'assessment' in result;
}

function GeneratedOutput({ state, pattern, kind }: { state: RecommendationState; pattern: PatternDetail; kind: GenerationKind }) {
  if (state.status === 'error') {
    return (
      <Container color="critical" variant="default" padding={8}>
        <Flex flexDirection="column" gap={6}>
          <Text textStyle="small">{state.errorMessage || 'Assist unavailable. Try again.'}</Text>
          <Text textStyle="small" style={{ color: MUTED }}>Try again after confirming the selected pattern still has usable evidence.</Text>
        </Flex>
      </Container>
    );
  }
  if (state.status === 'insufficient') {
    return (
      <Container color="critical" variant="default" padding={8}>
        <Text textStyle="small">Insufficient signal data. Add at least three meaningful observed signals before generating output.</Text>
      </Container>
    );
  }
  if (state.status !== 'ready' || !state.result) return null;

  const ev = pattern.assistContext.evidence;
  const persona = pattern.assistContext.persona;

  // ── Executive ─────────────────────────────────────────────────────────────
  if (isExecutiveResult(state.result)) {
    const signals = buildSignalSnapshot(ev, ['operational_cost', 'avg_duration', 'occurrence_count', 'trend', 'rca_availability', 'affected_entity_count']);
    const actions: ActionCardItem[] = state.result.decisionOptions.map(o => ({
      title: o.title,
      priority: o.priority,
      strength: o.recommendationStrength,
      capability: o.dynatraceCapability,
      effort: o.effort,
      evidenceUsed: o.evidenceUsed,
    }));
    return (
      <Flex flexDirection="column" gap={8}>
        {signals.length > 0 && <SignalSnapshot signals={signals} />}
        <TieredActions items={actions} />
        <DisclosureRow label="Risks" items={state.result.risks} />
        <DisclosureRow label="Data gaps" items={state.result.dataGaps} />
      </Flex>
    );
  }

  // ── SRE ───────────────────────────────────────────────────────────────────
  if (isSreResult(state.result)) {
    if (kind === 'analysis') {
      // Analysis: focus on recurrence + reliability drivers, no tier cards
      const signals = buildSignalSnapshot(ev, ['occurrence_count', 'trend', 'rca_availability', 'event_category', 'affected_users', 'affected_entity_count']);
      return (
        <Flex flexDirection="column" gap={8}>
          {signals.length > 0 && <SignalSnapshot signals={signals} />}
          {state.result.recurrenceDrivers.length > 0 && (
            <PanelSection title="Recurrence drivers">
              <Flex flexDirection="column" gap={4}>
                {state.result.recurrenceDrivers.map((d, i) => (
                  <Text key={i} textStyle="small" style={{ color: MUTED }}>{d}</Text>
                ))}
              </Flex>
            </PanelSection>
          )}
          {state.result.operationalWeaknesses.length > 0 && (
            <PanelSection title="Operational weaknesses">
              <Flex flexDirection="column" gap={4}>
                {state.result.operationalWeaknesses.map((w, i) => (
                  <Text key={i} textStyle="small" style={{ color: MUTED }}>{w}</Text>
                ))}
              </Flex>
            </PanelSection>
          )}
          {state.result.automationOpportunities.length > 0 && (
            <PanelSection title="Automation opportunities">
              <TieredActions items={state.result.automationOpportunities.map(a => ({
                title: a.title,
                priority: a.priority,
                capability: a.capability,
                effort: a.effort,
              }))} />
            </PanelSection>
          )}
          <DisclosureRow label="Data gaps" items={state.result.dataGaps} />
          </Flex>
      );
    }
    // Remediation / Alert Tuning: full tiered cards
    const signals = buildSignalSnapshot(ev, ['operational_cost', 'avg_duration', 'occurrence_count', 'trend', 'rca_availability', 'affected_entity_count']);
    const actions: ActionCardItem[] = state.result.preventionRecommendations.map(r => ({
      title: r.title,
      priority: r.priority,
      strength: r.recommendationStrength,
      capability: r.dynatraceCapability,
      effort: r.effort,
      evidenceUsed: r.evidenceUsed,
    }));
    return (
      <Flex flexDirection="column" gap={8}>
        {signals.length > 0 && <SignalSnapshot signals={signals} />}
        <TieredActions items={actions} />
        <DisclosureRow label="Risks" items={state.result.risks} />
        <DisclosureRow label="Data gaps" items={state.result.dataGaps} />
      </Flex>
    );
  }

  // ── Developer ─────────────────────────────────────────────────────────────
  if (isDeveloperResult(state.result)) {
    if (kind === 'analysis') {
      // Analysis: debugging path + affected components
      const signals = buildSignalSnapshot(ev, ['occurrence_count', 'trend', 'rca_availability', 'event_category', 'affected_entity_count', 'avg_duration']);
      const steps: ActionCardItem[] = state.result.debuggingPath.map(s => ({
        title: s.step,
        priority: s.priority,
        strength: s.recommendationStrength,
        capability: s.dynatraceCapability,
        effort: s.effort,
        evidenceUsed: s.evidenceUsed,
      }));
      return (
        <Flex flexDirection="column" gap={8}>
          {signals.length > 0 && <SignalSnapshot signals={signals} />}
          <Text textStyle="small" style={{ color: MUTED }}>{state.result.investigationSummary}</Text>
          {state.result.affectedComponents.length > 0 && (
            <PanelSection title="Affected components">
              <Flex flexDirection="column" gap={4}>
                {state.result.affectedComponents.map((c, i) => (
                  <div key={i} style={{ paddingLeft: 8, borderLeft: '2px solid var(--dt-colors-border-neutral-subdued,#d5d8df)', marginBottom: 4 }}>
                    <Text textStyle="small" style={{ fontWeight: 600 }}>{c.component}</Text>
                    {c.evidence.map((ev, j) => (
                      <Text key={j} textStyle="small" style={{ color: MUTED }}>{ev}</Text>
                    ))}
                  </div>
                ))}
              </Flex>
            </PanelSection>
          )}
          {steps.length > 0 && (
            <PanelSection title="Debugging path">
              <TieredActions items={steps} />
            </PanelSection>
          )}
          {state.result.validationSteps.length > 0 && (
            <DisclosureRow label="Validation steps" items={state.result.validationSteps} />
          )}
          <DisclosureRow label="Data gaps" items={state.result.dataGaps} />
          </Flex>
      );
    }
    // Remediation: tiered remediation candidates
    const signals = buildSignalSnapshot(ev, ['operational_cost', 'avg_duration', 'occurrence_count', 'rca_availability', 'affected_entity_count', 'event_category']);
    const actions: ActionCardItem[] = state.result.remediationCandidates.map(r => ({
      title: r.title,
      priority: r.priority,
      strength: r.recommendationStrength,
      capability: r.dynatraceCapability,
      effort: r.effort,
      evidenceUsed: r.evidenceUsed,
    }));
    return (
      <Flex flexDirection="column" gap={8}>
        {signals.length > 0 && <SignalSnapshot signals={signals} />}
        <TieredActions items={actions} />
        {state.result.validationSteps.length > 0 && (
          <DisclosureRow label="Validation steps" items={state.result.validationSteps} />
        )}
        <DisclosureRow label="Risks" items={state.result.risks} />
        <DisclosureRow label="Data gaps" items={state.result.dataGaps} />
      </Flex>
    );
  }

  // ── Legacy fallback ────────────────────────────────────────────────────────
  if (!isLegacyResult(state.result)) return null;
  const legacySignalKeys = kind === 'alert_tuning'
    ? ['occurrence_count', 'alert_event_count', 'avg_duration', 'trend', 'affected_entity_count', 'recommendation_type']
    : persona === 'executive'
      ? ['operational_cost', 'avg_duration', 'affected_users', 'occurrence_count', 'trend', 'rca_availability']
      : ['occurrence_count', 'trend', 'rca_availability', 'affected_entity_count', 'avg_duration', 'affected_users'];
  const signals = buildSignalSnapshot(ev, legacySignalKeys);
  const action: ActionCardItem = {
    title: state.result.action.title,
    priority: state.result.action.priority,
    strength: state.result.action.strength,
    capability: state.result.action.capability,
    evidenceUsed: evidenceItems(state.result.action.reason).map(i => `${i.label}: ${i.value}`),
  };
  return (
    <Flex flexDirection="column" gap={8}>
      {signals.length > 0 && <SignalSnapshot signals={signals} />}
      <ActionCard item={action} />
      <DisclosureRow label="Risks" items={state.result.risks ?? []} />
      <DisclosureRow label="Data gaps" items={state.result.dataGaps} />
      <div style={{ marginTop: 4 }}><span style={{ fontSize: 10, color: MUTED }}>Generated by Dynatrace Assist</span></div>
    </Flex>
  );
}

function LegacyGeneratedOutput({ state }: { state: RecommendationState }) {
  if (state.status !== 'ready' || !state.result) return null;
  if (!isLegacyResult(state.result)) return null;
  return (
    <Flex flexDirection="column" gap={8}>
      <Text textStyle="small">{state.result.assessment}</Text>
      <Flex flexDirection="column" gap={4}>
        {state.result.drivers.slice(0, 3).map(driver => (
          <Text key={driver.signal} textStyle="small" style={{ color: MUTED }}>
            <strong>{driver.signal}</strong>: {driver.value} - {driver.whyItMatters}
          </Text>
        ))}
      </Flex>
      <Divider />
      <Flex flexDirection="column" gap={4}>
        <Text textStyle="small" style={{ fontWeight: 700 }}>{state.result.action.title}</Text>
        <Text textStyle="small" style={{ color: MUTED }}>
          {state.result.action.priority} | {state.result.action.strength} | {state.result.action.capability}
        </Text>
        <Text textStyle="small">{state.result.action.reason}</Text>
      </Flex>
      {state.result.dataGaps.length > 0 && (
        <Text textStyle="small" style={{ color: MUTED }}>
          Data gaps: {state.result.dataGaps.join(' ')}
        </Text>
      )}
    </Flex>
  );
}

function readyResult(state: RecommendationState): RecommendationResult | undefined {
  return state.status === 'ready' ? state.result : undefined;
}

function hasActionPlanOutput(outputs: ActionPlanOutputs): boolean {
  return Boolean(outputs.analysis || outputs.remediation || outputs.recommendations);
}

function ExportActionPlanControl({
  pattern,
  timeWindow,
  dqlNotebookContext,
  outputs,
}: {
  pattern: PatternDetail;
  timeWindow?: string;
  dqlNotebookContext?: DqlNotebookContext;
  outputs: ActionPlanOutputs;
}) {
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  if (pattern.assistContext.persona === 'executive' || !hasActionPlanOutput(outputs)) return null;

  const input = {
    persona: pattern.assistContext.persona,
    objective: pattern.assistContext.objective,
    timeWindow: timeWindow || 'Not available',
    patternDetail: pattern,
    pattern: {
      id: pattern.id,
      title: pattern.title,
      problemIds: pattern.assistContext.problemIds,
    },
    observedSignals: pattern.assistContext.evidence,
    outputs,
  };

  async function run(action: 'markdown' | 'notebook-json') {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const generatedAt = new Date().toISOString();
      const exportInput = { ...input, generatedAt };
      if (action === 'markdown') {
        const markdown = buildActionPlanMarkdown(exportInput);
        downloadTextFile(actionPlanFilename(exportInput), markdown, 'text/markdown;charset=utf-8');
        setStatus({ type: 'success', message: 'Markdown report downloaded.' });
      } else {
        const notebookInput = {
          persona: pattern.assistContext.persona,
          objective: pattern.assistContext.objective,
          timeWindow: timeWindow || 'Not available',
          generatedAt,
          pattern,
          dqlContext: dqlNotebookContext,
          outputs,
        };
        const notebook = buildEvidenceNotebookJson(notebookInput);
        const notebookJson = JSON.stringify(notebook, null, 2);
        downloadTextFile(evidenceNotebookFilename(notebookInput, 'json'), notebookJson, 'application/json;charset=utf-8');
        setStatus({ type: 'success', message: 'Notebook JSON downloaded.' });
      }
    } catch (error) {
      console.error('[Calibrate export] Unable to generate export', error);
      setStatus({ type: 'error', message: 'Unable to generate the export. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Flex
      flexDirection="column"
      gap={6}
      style={{
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        marginTop: 8,
      }}
    >
      <Flex
        flexDirection="column"
        gap={6}
        style={{
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
          padding: 8,
          border: '1px solid var(--dt-colors-border-neutral-subdued,#2f3044)',
          borderRadius: 8,
          background: 'var(--dt-colors-background-container-neutral-subdued, rgba(255,255,255,0.03))',
        }}
      >
        <Flex flexDirection="column" gap={4}>
          <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Export Action Plan</span>
          {status && (
            <Text textStyle="small" style={{ color: status.type === 'success' ? OK : DANGER, whiteSpace: 'normal' }}>
              {status.message}
            </Text>
          )}
        </Flex>
        <Button variant="default" onClick={() => run('markdown')} disabled={isExporting} style={{ width: '100%' }}>
          {isExporting ? 'Generating...' : 'Download Markdown Report'}
        </Button>
        <Button variant="default" onClick={() => run('notebook-json')} disabled={isExporting} style={{ width: '100%' }}>
          {isExporting ? 'Generating...' : 'Download Notebook JSON'}
        </Button>
      </Flex>
    </Flex>
  );
}

export function PatternDetailPanel({ pattern, onClose, timeWindow, dqlNotebookContext }: PatternDetailPanelProps) {
  const [panelTab, setPanelTab] = useState(0);
  const [recommendation, setRecommendation] = useState<RecommendationState>({ status: 'idle' });
  const [analysis, setAnalysis] = useState<RecommendationState>({ status: 'idle' });
  const [remediation, setRemediation] = useState<RecommendationState>({ status: 'idle' });
  const [alertTuning, setAlertTuning] = useState<RecommendationState>({ status: 'idle' });
  const persona = pattern?.assistContext.persona;
  const isExecutive = persona === 'executive';
  const activeObjective = pattern?.assistContext.objective ?? 'cost_impact';
  // Executive: single action tab driven by objective
  // SRE/Developer: always show Analysis + a second tab (Remediation for cost_impact, Alert Tuning for alert_optimization)
  const execActionKind: GenerationKind = activeObjective === 'cost_impact' ? 'remediation' : 'recommendation';
  const execActionState = execActionKind === 'remediation' ? remediation : recommendation;
  const execTabTitle = activeObjective === 'cost_impact' ? 'Remediation' : 'Recommendations';
  const execButtonLabel = activeObjective === 'cost_impact' ? 'Get Remediation Path' : 'Generate Recommendations';
  const actionPlanOutputs: ActionPlanOutputs = {
    analysis: readyResult(analysis),
    remediation: readyResult(remediation),
    recommendations: readyResult(recommendation) ?? readyResult(alertTuning),
  };

  useEffect(() => {
    setRecommendation({ status: 'idle' });
    setAnalysis({ status: 'idle' });
    setRemediation({ status: 'idle' });
    setAlertTuning({ status: 'idle' });
  }, [pattern?.id, pattern?.assistContext.objective]);

  useEffect(() => {
    setPanelTab(0);
  }, [pattern?.id]);

  async function generateRecommendation(kind: GenerationKind = 'recommendation') {
    if (!pattern) return;
    const setState = kind === 'analysis'
      ? setAnalysis
      : kind === 'remediation'
        ? setRemediation
        : kind === 'alert_tuning'
          ? setAlertTuning
          : setRecommendation;
    try {
      setState({ status: 'loading' });
      await new Promise(resolve => setTimeout(resolve, 250));
      const result = buildRecommendation(pattern, kind);
      setState(result ? { status: 'ready', result } : { status: 'insufficient' });
    } catch (error) {
      setState({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Assist unavailable. Try again.',
      });
    }
  }

  return (
    <Surface
      elevation="raised"
      style={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
      padding={0}
    >
      {/* Header */}
      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        padding={16}
        style={{ borderBottom: '1px solid var(--dt-colors-border-neutral-subdued, #eee)' }}
      >
        <Flex flexDirection="column" gap={4} style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: MUTED }}>Pattern detail</span>
          {pattern
            ? <Heading level={4}>{pattern.title}</Heading>
            : <span style={{ fontSize: 13, color: MUTED }}>No pattern selected</span>
          }
        </Flex>
        {pattern && (
          <Button variant="default" onClick={onClose} style={{ marginLeft: 8, flexShrink: 0 }}>x</Button>
        )}
      </Flex>

      {/* Empty state - rich preview sections */}
      {!pattern && (
        <Flex flexDirection="column" gap={12} padding={16} style={{ flex: 1 }}>
          <EmptyState size="small">
            <EmptyState.Visual>
              <EmptyState.VisualPreset context="chart" type="no-result" />
            </EmptyState.Visual>
            <EmptyState.Title>No pattern selected</EmptyState.Title>
            <EmptyState.Details>Select a bubble from the Act-First Map or a row from the Pattern Explorer to see investigation details.</EmptyState.Details>
          </EmptyState>

          {/* Preview section placeholders */}
          <Divider />
          <Text textStyle="small" style={{ color: MUTED, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10 }}>
            When selected, you'll see:
          </Text>

          {[
            { title: 'Business Impact', desc: 'Risk exposure, recoverable value, affected users' },
            { title: 'Recurrence Timeline', desc: 'Occurrence history and trend direction' },
            { title: 'Investigation Friction', desc: 'Evidence quality, readiness, remediation effort' },
            { title: 'Recommended Remediation', desc: 'Davis-backed action with evidence status' },
          ].map(section => (
            <div key={section.title} style={{
              paddingLeft: 10,
              borderLeft: `2px solid var(--dt-colors-border-neutral-subdued, #d5d8df)`,
              opacity: 0.6,
            }}>
              <Text textStyle="small" style={{ fontWeight: 600 }}>{section.title}</Text>
              <Text textStyle="small" style={{ color: MUTED }}>{section.desc}</Text>
            </div>
          ))}
        </Flex>
      )}

      {pattern && (
        <div style={{ padding: 16 }}>
          <Tabs selectedIndex={panelTab} onChange={setPanelTab}>
            <Tab title="Details">
              <Flex flexDirection="column" gap={16} style={{ paddingTop: 12 }}>

        {/* Business Impact */}
        <PanelSection title={isExecutive ? 'Business Impact' : persona === 'sre' ? 'Reliability Context' : 'Developer Context'}>
          {(() => {
            const rawServices = pattern.assistContext.evidence.affected_services;
            const serviceList: string[] = Array.isArray(rawServices)
              ? rawServices.filter(s => s !== 'Unknown Service')
              : typeof rawServices === 'string' && rawServices !== 'absent' && rawServices !== 'Unknown Service'
                ? [rawServices]
                : [];
            const blastRadiusValue = serviceList.length > 0
              ? serviceList.length <= 2
                ? serviceList.join(', ')
                : `${serviceList.slice(0, 2).join(', ')} +${serviceList.length - 2} more`
              : `${signalText(pattern.assistContext.evidence.affected_entity_count)} entities`;

            const rawMttr = signalText(pattern.assistContext.evidence.avg_duration);
            const mttrValue = rawMttr === 'absent' || rawMttr === '0m' || rawMttr === '0h 0m' ? 'Not resolved' : rawMttr;

            return (
              <SignalGrid>
                <SignalCard label="Operational cost" value={pattern.businessImpact.exposure} />
                <SignalCard label="Recoverable" value={pattern.businessImpact.recoverableValue} />
                <SignalCard label="Avg MTTR" value={mttrValue} tone={mttrValue === 'Not resolved' ? undefined : 'High'} />
                <SignalCard label="Open incidents" value={pattern.businessImpact.openIncidents} tone={pattern.businessImpact.openIncidents > 0 ? 'High' : 'Low'} />
                <SignalCard label="Affected users" value={pattern.businessImpact.affectedUsers} />
                <SignalCard label="Blast radius" value={blastRadiusValue} />
              </SignalGrid>
            );
          })()}
        </PanelSection>

        <Divider />

        {/* Recurrence */}
        <Flex flexDirection="column" gap={8}>
          <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recurrence</span>
          <Flex flexDirection="column" gap={6}>
            <StatRow label="Occurrences" value={pattern.recurrence.occurrences} />
            <Flex justifyContent="space-between" alignItems="center">
              <span style={{ fontSize: 12, color: MUTED }}>Trend</span>
              <TrendArrow trend={pattern.recurrence.trend} />
            </Flex>
          </Flex>
          {/* Sparkline */}
          <Flex gap={4} alignItems="flex-end" style={{ height: 36 }}>
            {pattern.recurrence.timeline.map((bucket, i) => {
              const max = Math.max(...pattern.recurrence.timeline.map(b => b.count), 1);
              const h   = Math.max(4, Math.round((bucket.count / max) * 28));
              return (
                <Flex key={i} flexDirection="column" alignItems="center" gap={2} style={{ flex: 1 }}>
                  <div style={{ width: '100%', height: h, background: ACCENT, borderRadius: 2 }} />
                  <span style={{ fontSize: 9, color: MUTED }}>{bucket.label}</span>
                </Flex>
              );
            })}
          </Flex>
        </Flex>

        <Divider />

        {/* Actionability */}
        <Flex flexDirection="column" gap={8}>
          <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{isExecutive ? 'Technical Actionability' : persona === 'sre' ? 'Operational Debt' : 'Investigation Complexity'}</span>
          <SignalGrid>
            <SignalCard label="Remediation effort" value={pattern.technicalActionability.remediationEffort} tone={pattern.technicalActionability.remediationEffort} />
            <SignalCard label="Evidence quality" value={pattern.technicalActionability.evidenceQuality} tone={pattern.technicalActionability.evidenceQuality} />
            <SignalCard label="Investigation readiness" value={pattern.technicalActionability.investigationReadiness} tone={pattern.technicalActionability.investigationReadiness} />
            <SignalCard label="RCA" value={pattern.assistContext.evidence.rca_availability === 'Present' ? 'Present' : 'Missing'} tone={pattern.assistContext.evidence.rca_availability === 'Present' ? 'Low' : 'High'} />
          </SignalGrid>
        </Flex>

        <Divider />

        {/* Recommended Action */}
        <Flex flexDirection="column" gap={8}>
          <span style={{ fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommended Action</span>
          <div style={{
            padding: '8px 12px',
            borderLeft: `3px solid var(--dt-colors-background-container-primary-accent, #1496ff)`,
          }}>
            <Text textStyle="small">{pattern.recommendedAction}</Text>
          </div>
        </Flex>

              </Flex>
            </Tab>

            {/* Executive: single objective tab */}
            {isExecutive && (
              <Tab title={execTabTitle}>
                <Flex flexDirection="column" gap={8} style={{ paddingTop: 8 }}>
                  <Button variant="accent" style={{ alignSelf: 'flex-start' }}
                    onClick={() => generateRecommendation(execActionKind)}
                    disabled={execActionState.status === 'loading'}>
                    {execActionState.status === 'loading' ? 'Generating...' : execButtonLabel}
                  </Button>
                  <RawPrompt pattern={pattern} kind={execActionKind} />
                  <RawResponse state={execActionState} />
                  <AssistAttribution state={execActionState} />
                  <GeneratedOutput state={execActionState} pattern={pattern} kind={execActionKind} />
                </Flex>
              </Tab>
            )}

            {/* SRE / Developer: Analysis tab (always) */}
            {!isExecutive && (
              <Tab title="Analysis">
                <Flex flexDirection="column" gap={8} style={{ paddingTop: 8 }}>
                  <Button variant="accent" style={{ alignSelf: 'flex-start' }}
                    onClick={() => generateRecommendation('analysis')}
                    disabled={analysis.status === 'loading'}>
                    {analysis.status === 'loading' ? 'Analysing...' : 'Get Analysis'}
                  </Button>
                  <RawPrompt pattern={pattern} kind="analysis" />
                  <RawResponse state={analysis} />
                  <AssistAttribution state={analysis} />
                  <GeneratedOutput state={analysis} pattern={pattern} kind="analysis" />
                  <ExportActionPlanControl pattern={pattern} timeWindow={timeWindow} dqlNotebookContext={dqlNotebookContext} outputs={actionPlanOutputs} />
                </Flex>
              </Tab>
            )}

            {/* SRE / Developer on cost_impact: Remediation tab */}
            {!isExecutive && activeObjective === 'cost_impact' && (
              <Tab title="Remediation">
                <Flex flexDirection="column" gap={8} style={{ paddingTop: 8 }}>
                  <Button variant="accent" style={{ alignSelf: 'flex-start' }}
                    onClick={() => generateRecommendation('remediation')}
                    disabled={remediation.status === 'loading'}>
                    {remediation.status === 'loading' ? 'Generating...' : 'Get Remediation Path'}
                  </Button>
                  <RawPrompt pattern={pattern} kind="remediation" />
                  <RawResponse state={remediation} />
                  <AssistAttribution state={remediation} />
                  <GeneratedOutput state={remediation} pattern={pattern} kind="remediation" />
                  <ExportActionPlanControl pattern={pattern} timeWindow={timeWindow} dqlNotebookContext={dqlNotebookContext} outputs={actionPlanOutputs} />
                </Flex>
              </Tab>
            )}

            {/* SRE / Developer on alert_optimization: Alert Tuning tab */}
            {!isExecutive && activeObjective === 'alert_optimization' && (
              <Tab title="Alert Tuning">
                <Flex flexDirection="column" gap={8} style={{ paddingTop: 8 }}>
                  <Button variant="accent" style={{ alignSelf: 'flex-start' }}
                    onClick={() => generateRecommendation('alert_tuning')}
                    disabled={alertTuning.status === 'loading'}>
                    {alertTuning.status === 'loading' ? 'Generating...' : 'Suggest Alert Tuning'}
                  </Button>
                  <RawPrompt pattern={pattern} kind="alert_tuning" />
                  <RawResponse state={alertTuning} />
                  <AssistAttribution state={alertTuning} />
                  <GeneratedOutput state={alertTuning} pattern={pattern} kind="alert_tuning" />
                  <ExportActionPlanControl pattern={pattern} timeWindow={timeWindow} dqlNotebookContext={dqlNotebookContext} outputs={actionPlanOutputs} />
                </Flex>
              </Tab>
            )}

          </Tabs>
        </div>
      )}
    </Surface>
  );
}
