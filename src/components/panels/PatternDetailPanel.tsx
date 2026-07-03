import React, { useEffect, useState } from 'react';
import { Flex, Surface, Divider } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { Container } from '@dynatrace/strato-components/layouts';
import { EmptyState } from '@dynatrace/strato-components/content';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { PatternDetail, TrendDirection } from '../../types/views';
import { buildSignalPrompt } from '../../persona/PersonaPromptBuilder';

const MUTED  = 'var(--dt-colors-text-neutral-subdued, #74777a)';
const DANGER = 'var(--dt-colors-text-critical-default, #c41a00)';
const OK     = 'var(--dt-colors-text-success-default, #1a7a4a)';
const WARNING = 'var(--dt-colors-text-warning-default, #b45309)';
const ACCENT = 'var(--dt-colors-background-container-primary-accent, #1496ff)';

interface PatternDetailPanelProps {
  pattern: PatternDetail | null;
  onClose: () => void;
}

type RecommendationStatus = 'idle' | 'loading' | 'ready' | 'insufficient' | 'error';

type RecommendationResult = {
  assessment: string;
  drivers: Array<{ signal: string; value: string; whyItMatters: string }>;
  action: {
    priority: 'IMMEDIATE' | 'SHORT_TERM' | 'STRATEGIC';
    title: string;
    strength: 'Evidence-backed' | 'Candidate' | 'Data-gap';
    reason: string;
    capability: string;
  };
  risks?: string[];
  dataGaps: string[];
};

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
    avg_duration: 'Average duration',
    event_category: 'Failure type',
    occurrence_count: 'Occurrences',
    operational_cost: 'Operational cost',
    potential_savings: 'Recoverable value',
    rca_availability: 'Root cause evidence',
    recommendation_type: 'Recommended lever',
    root_cause_entity: 'Root cause entity',
    scope_tier: 'Scope',
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

function displayPriority(value: RecommendationResult['action']['priority']): string {
  const labels: Record<RecommendationResult['action']['priority'], string> = {
    IMMEDIATE: 'Immediate',
    SHORT_TERM: 'Short term',
    STRATEGIC: 'Strategic',
  };
  return labels[value];
}

function displayStrength(value: RecommendationResult['action']['strength']): string {
  return value === 'Evidence-backed' ? 'Evidence backed' : value;
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

function meaningfulDrivers(drivers: RecommendationResult['drivers']): RecommendationResult['drivers'] {
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

function buildRecommendation(pattern: PatternDetail, kind: GenerationKind = 'recommendation'): RecommendationResult | null {
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
  ].filter(Boolean) as RecommendationResult['drivers']);

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
      ].filter(Boolean) as RecommendationResult['drivers']),
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
    return {
      assessment: persona === 'sre'
        ? `This reliability review is based on ${occurrences} occurrence(s), a ${displaySignalValue('trend', trend)} trend, ${displaySignalValue('event_category', category)} signal type, and ${displaySignalValue('rca_availability', rca)} root cause evidence. The next step stays focused on recurrence, automation, prevention, and routing using only the supplied signals.`
        : `This developer review is based on ${occurrences} occurrence(s), ${displaySignalValue('affected_services', affectedServices)} affected service evidence, ${displaySignalValue('event_category', category)} signal type, and ${displaySignalValue('rca_availability', rca)} root cause evidence. The next step focuses on the investigation starting point and validation path from the supplied evidence.`,
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
    return {
      assessment: persona === 'sre'
        ? `This remediation path is based on ${occurrences} occurrence(s), ${displaySignalValue('operational_cost', cost)} operational cost, a ${displaySignalValue('trend', trend)} trend, and ${displaySignalValue('rca_availability', rca)} root cause evidence. It prioritizes prevention, automation, and ownership or routing only where the supplied signals justify it.`
        : `This remediation path is based on ${occurrences} occurrence(s), ${displaySignalValue('affected_services', affectedServices)} affected service evidence, ${displaySignalValue('root_cause_entity', rootCause)} root cause entity, and ${displaySignalValue('event_category', category)} signal type. It avoids code-level assumptions when root cause or service evidence is missing.`,
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
    return {
      assessment: `This recurring signal appeared ${occurrences} time(s) with ${displaySignalValue('operational_cost', cost)} in modeled operational cost and a ${displaySignalValue('trend', trend)} trend. Because the objective is alert optimization, the recommendation focuses on signal quality, routing, and scoped tuning rather than service remediation.`,
      drivers,
      action: {
        priority: strength === 'Evidence-backed' ? 'SHORT_TERM' : 'STRATEGIC',
        title: 'Review alert tuning for this recurring signal',
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

function buildRawPrompt(pattern: PatternDetail, kind: GenerationKind): string {
  return buildSignalPrompt({
    persona: pattern.assistContext.persona,
    objective: pattern.assistContext.objective,
    evidence: pattern.assistContext.evidence,
    patternTitle: pattern.title,
    recommendedAction: pattern.recommendedAction,
    kind,
  });
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
        {open ? '▾' : '▸'} View raw prompt
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

function TrendArrow({ trend }: { trend: TrendDirection }) {
  const arrow = trend === 'Increasing' ? '↑' : trend === 'Decreasing' ? '↓' : '→';
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
        background: 'var(--dt-colors-background-container-neutral-subdued, #f7f8fa)',
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
    <Flex flexDirection="column" gap={8}>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </Flex>
  );
}

function GeneratedOutput({ state }: { state: RecommendationState }) {
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
        <Text textStyle="small">
          Insufficient signal data. Add at least three meaningful observed signals before generating output.
        </Text>
      </Container>
    );
  }

  if (state.status !== 'ready' || !state.result) return null;
  const parsedEvidence = evidenceItems(state.result.action.reason);

  return (
    <Flex flexDirection="column" gap={8}>
      <PanelSection title="Summary">
        <Container color="neutral" variant="default" padding={8}>
          <Text textStyle="small">{state.result.assessment}</Text>
        </Container>
      </PanelSection>
      <PanelSection title="Observed Signals">
        <SignalGrid>
          {state.result.drivers.slice(0, 4).map(driver => (
            <SignalCard
              key={driver.signal}
              label={signalLabel(driver.signal)}
              value={displaySignalValue(driver.signal, driver.value)}
            />
          ))}
        </SignalGrid>
      </PanelSection>
      <PanelSection title="Next Step">
        <Container color="neutral" variant="default" padding={8}>
          <Flex flexDirection="column" gap={6}>
            <Text textStyle="small" style={{ fontWeight: 700 }}>{state.result.action.title}</Text>
            <SignalGrid>
              <SignalCard label="Priority" value={displayPriority(state.result.action.priority)} tone={state.result.action.priority} />
              <SignalCard label="Strength" value={displayStrength(state.result.action.strength)} />
              <SignalCard label="Dynatrace capability" value={state.result.action.capability} />
            </SignalGrid>
            {parsedEvidence.length > 0 && (
              <Flex flexDirection="column" gap={6}>
                <Text textStyle="small" style={{ color: MUTED, fontWeight: 600 }}>Evidence used</Text>
                <SignalGrid>
                  {parsedEvidence.map(item => (
                    <SignalCard key={`${item.signal}-${item.value}`} label={item.label} value={item.value} />
                  ))}
                </SignalGrid>
              </Flex>
            )}
          </Flex>
        </Container>
      </PanelSection>
      {state.result.dataGaps.length > 0 && (
        <PanelSection title="Missing Evidence">
          <Container color="neutral" variant="default" padding={8}>
            <Flex flexDirection="column" gap={4}>
              {state.result.dataGaps.map(gap => (
                <Text key={gap} textStyle="small" style={{ color: MUTED }}>{gap}</Text>
              ))}
            </Flex>
          </Container>
        </PanelSection>
      )}
      {state.result.risks && state.result.risks.length > 0 && (
        <PanelSection title="Tuning Risks">
          <Container color="neutral" variant="default" padding={8}>
            <Flex flexDirection="column" gap={4}>
              {state.result.risks.map(risk => (
                <Text key={risk} textStyle="small" style={{ color: MUTED }}>{risk}</Text>
              ))}
            </Flex>
          </Container>
        </PanelSection>
      )}
    </Flex>
  );
}

function LegacyGeneratedOutput({ state }: { state: RecommendationState }) {
  if (state.status !== 'ready' || !state.result) return null;
  return (
    <Container color="neutral" variant="default" padding={8}>
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
            {state.result.action.priority} · {state.result.action.strength} · {state.result.action.capability}
          </Text>
          <Text textStyle="small">{state.result.action.reason}</Text>
        </Flex>
        {state.result.dataGaps.length > 0 && (
          <Text textStyle="small" style={{ color: MUTED }}>
            Data gaps: {state.result.dataGaps.join(' ')}
          </Text>
        )}
      </Flex>
    </Container>
  );
}

export function PatternDetailPanel({ pattern, onClose }: PatternDetailPanelProps) {
  const [panelTab, setPanelTab] = useState(0);
  const [recommendation, setRecommendation] = useState<RecommendationState>({ status: 'idle' });
  const [analysis, setAnalysis] = useState<RecommendationState>({ status: 'idle' });
  const [remediation, setRemediation] = useState<RecommendationState>({ status: 'idle' });
  const persona = pattern?.assistContext.persona;
  const isExecutive = persona === 'executive';

  useEffect(() => {
    setRecommendation({ status: 'idle' });
    setAnalysis({ status: 'idle' });
    setRemediation({ status: 'idle' });
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
          <Button variant="default" onClick={onClose} style={{ marginLeft: 8, flexShrink: 0 }}>✕</Button>
        )}
      </Flex>

      {/* Empty state — rich preview sections */}
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
            { icon: '💰', title: 'Business Impact', desc: 'Risk exposure, recoverable value, affected users' },
            { icon: '🔄', title: 'Recurrence Timeline', desc: 'Occurrence history and trend direction' },
            { icon: '🔍', title: 'Investigation Friction', desc: 'Evidence quality, readiness, remediation effort' },
            { icon: '⚡', title: 'Recommended Remediation', desc: 'Davis-backed action with confidence score' },
          ].map(section => (
            <Container key={section.title} color="neutral" variant="default" padding={12}
              style={{ opacity: 0.6 }}>
              <Flex alignItems="flex-start" gap={8}>
                <span style={{ fontSize: 14, flexShrink: 0, color: ACCENT }}>•</span>
                <Flex flexDirection="column" gap={2}>
                  <Text textStyle="small" style={{ fontWeight: 600 }}>{section.title}</Text>
                  <Text textStyle="small" style={{ color: MUTED }}>{section.desc}</Text>
                </Flex>
              </Flex>
            </Container>
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
          <SignalGrid>
            <SignalCard label="Exposure" value={pattern.businessImpact.exposure} />
            <SignalCard label="Recoverable" value={pattern.businessImpact.recoverableValue} />
            <SignalCard label="Open incidents" value={pattern.businessImpact.openIncidents} tone={pattern.businessImpact.openIncidents > 0 ? 'High' : 'Low'} />
            <SignalCard label={isExecutive ? 'Affected users' : persona === 'developer' ? 'Affected services' : 'Blast radius'} value={pattern.businessImpact.affectedUsers || signalText(pattern.assistContext.evidence.affected_entity_count) || 0} />
          </SignalGrid>
        </PanelSection>

        <Divider />

        {/* Recurrence */}
        <Flex flexDirection="column" gap={8}>
          <SectionLabel>Recurrence</SectionLabel>
          <Container color="neutral" variant="default" padding={12}>
            <Flex flexDirection="column" gap={6}>
              <StatRow label="Occurrences" value={pattern.recurrence.occurrences} />
              <Flex justifyContent="space-between" alignItems="center">
                <span style={{ fontSize: 12, color: MUTED }}>Trend</span>
                <TrendArrow trend={pattern.recurrence.trend} />
              </Flex>
            </Flex>
            {/* Sparkline */}
            <Flex gap={4} alignItems="flex-end" style={{ marginTop: 12, height: 36 }}>
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
          </Container>
        </Flex>

        <Divider />

        {/* Actionability */}
        <Flex flexDirection="column" gap={8}>
          <SectionLabel>{isExecutive ? 'Technical Actionability' : persona === 'sre' ? 'Operational Debt' : 'Investigation Complexity'}</SectionLabel>
          <SignalGrid>
            <SignalCard label="Remediation effort" value={pattern.technicalActionability.remediationEffort} tone={pattern.technicalActionability.remediationEffort} />
            <SignalCard label="Evidence quality" value={pattern.technicalActionability.evidenceQuality} tone={pattern.technicalActionability.evidenceQuality} />
            <SignalCard label="Investigation readiness" value={pattern.technicalActionability.investigationReadiness} tone={pattern.technicalActionability.investigationReadiness} />
            <SignalCard label="RCA" value={pattern.assistContext.evidence.rca_availability === 'Present' ? 'Present' : 'Missing'} tone={pattern.assistContext.evidence.rca_availability === 'Present' ? 'Low' : 'High'} />
          </SignalGrid>
          <Container color="neutral" variant="default" padding={12} style={{ display: 'none' }}>
            <Flex flexDirection="column" gap={6}>
              <StatRow label="Evidence quality"        value={pattern.technicalActionability.evidenceQuality} />
              <StatRow label="Investigation readiness" value={pattern.technicalActionability.investigationReadiness} />
              <StatRow label="Remediation effort"      value={pattern.technicalActionability.remediationEffort} />
              <StatRow label="RCA" value={
                pattern.assistContext.evidence.rca_availability === 'Present'
                  ? `Present${pattern.assistContext.evidence.root_cause_entity
                      ? ` · ${pattern.assistContext.evidence.root_cause_entity}` : ''}`
                  : 'Missing'
              } />
            </Flex>
          </Container>
        </Flex>

        <Divider />

        {/* Recommended Action */}
        <Flex flexDirection="column" gap={8}>
          <SectionLabel>Recommended Action</SectionLabel>
          <div style={{
            padding: 12,
            borderLeft: `3px solid var(--dt-colors-background-container-primary-accent, #1496ff)`,
            background: 'var(--dt-colors-background-container-neutral-subdued, #f7f8fa)',
            borderRadius: '0 6px 6px 0',
          }}>
            <Text textStyle="small">{pattern.recommendedAction}</Text>
          </div>
        </Flex>

              </Flex>
            </Tab>

            <Tab title={isExecutive ? 'Recommendation' : 'Analysis'}>
        <Flex flexDirection="column" gap={8} style={{ paddingTop: 12 }}>
          <Container color="neutral" variant="default" padding={12}>
            <Flex flexDirection="column" gap={8}>
              <span style={{ fontSize: 11, color: MUTED }}>
                Calibrate Assist · {pattern.assistContext.persona} · {formatObjective(pattern.assistContext.objective)}
              </span>
              <Text textStyle="small">
                {isExecutive
                  ? 'Generate an evidence-gated recommendation from the selected pattern and its observed signals.'
                  : 'Generate persona-specific analysis from observed recurrence, impact, RCA, and trend signals.'}
              </Text>
              <Flex alignItems="center" gap={8}>
                <Button
                  variant="accent"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() => generateRecommendation(isExecutive ? 'recommendation' : 'analysis')}
                  disabled={isExecutive ? recommendation.status === 'loading' : analysis.status === 'loading'}
                >
                  {(isExecutive ? recommendation.status : analysis.status) === 'loading'
                    ? 'Generating...'
                    : isExecutive ? 'Generate Recommendation' : 'Generate Analysis'}
                </Button>
              </Flex>
              <RawPrompt pattern={pattern} kind={isExecutive ? 'recommendation' : 'analysis'} />
              <GeneratedOutput state={isExecutive ? recommendation : analysis} />
            </Flex>
          </Container>
        </Flex>
            </Tab>

        {!isExecutive && (
          <Tab title="Remediation">
            <Flex flexDirection="column" gap={8} style={{ paddingTop: 12 }}>
              <Container color="neutral" variant="default" padding={12}>
                <Flex flexDirection="column" gap={8}>
                  <Text textStyle="small">
                    Generate a practical remediation path using only supplied pattern evidence.
                  </Text>
                  <Button
                    variant="accent"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={() => generateRecommendation('remediation')}
                    disabled={remediation.status === 'loading'}
                  >
                    {remediation.status === 'loading' ? 'Generating...' : 'Get Remediation Path'}
                  </Button>
                  <RawPrompt pattern={pattern} kind="remediation" />
                  <GeneratedOutput state={remediation} />
                </Flex>
              </Container>
            </Flex>
          </Tab>
        )}

          </Tabs>
        </div>
      )}
    </Surface>
  );
}
