import React, { useEffect, useState } from 'react';
import { Flex, Surface, Divider } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { Container } from '@dynatrace/strato-components/layouts';
import { EmptyState } from '@dynatrace/strato-components/content';
import { PatternDetail, TrendDirection } from '../../types/views';

const MUTED  = 'var(--dt-colors-text-neutral-subdued, #74777a)';
const DANGER = 'var(--dt-colors-text-critical-default, #c41a00)';
const OK     = 'var(--dt-colors-text-success-default, #1a7a4a)';
const WARNING = 'var(--dt-colors-text-warning-default, #b45309)';
const ACCENT = 'var(--dt-colors-background-container-primary-accent, #1496ff)';

interface PatternDetailPanelProps {
  pattern: PatternDetail | null;
  onClose: () => void;
}

type RecommendationStatus = 'idle' | 'loading' | 'ready' | 'insufficient';

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
  dataGaps: string[];
};

type RecommendationState = {
  status: RecommendationStatus;
  result?: RecommendationResult;
};

type GenerationKind = 'recommendation' | 'analysis' | 'remediation';

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

function formatObjective(objective: PatternDetail['assistContext']['objective']): string {
  return objective.replace('_', ' ');
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

  const drivers = [
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
  ].filter(Boolean) as RecommendationResult['drivers'];

  const dataGaps = [
    !isMeaningfulSignal(evidence.potential_savings) ? 'potential_savings is missing.' : null,
    !isMeaningfulSignal(evidence.affected_users) ? 'affected_users is missing.' : null,
    !isMeaningfulSignal(evidence.root_cause_entity) ? 'root_cause_entity is missing.' : null,
  ].filter(Boolean) as string[];

  if (kind === 'analysis') {
    return {
      assessment: `This ${persona} analysis uses ${occurrences} observed occurrence(s), trend ${trend}, RCA availability ${rca}, and ${users} affected user(s). The analysis is limited to supplied pattern evidence and does not infer missing dependencies.`,
      drivers,
      action: {
        priority: 'SHORT_TERM',
        title: persona === 'sre' ? 'Review reliability drivers for this recurring risk' : 'Inspect the affected service path for this recurring issue',
        strength: drivers.length >= 3 ? 'Evidence-backed' : 'Candidate',
        reason: `occurrence_count=${occurrences}; trend=${trend}; rca_availability=${rca}`,
        capability: persona === 'developer' ? 'Application Observability' : 'Davis AI',
      },
      dataGaps,
    };
  }

  if (kind === 'remediation') {
    return {
      assessment: `This ${persona} remediation path uses ${occurrences} observed occurrence(s), ${cost} operational cost, and RCA availability ${rca}. Recommended next steps stay proportional to supplied recurrence, cost, and evidence quality signals.`,
      drivers,
      action: {
        priority: drivers.length >= 3 ? 'SHORT_TERM' : 'STRATEGIC',
        title: pattern.recommendedAction,
        strength: drivers.length >= 3 ? 'Evidence-backed' : 'Candidate',
        reason: `operational_cost=${cost}; occurrence_count=${occurrences}; rca_availability=${rca}`,
        capability: persona === 'developer' ? 'Application Observability' : 'Workflows',
      },
      dataGaps,
    };
  }

  if (objective === 'alert_optimization') {
    return {
      assessment: `This Executive recommendation uses ${occurrences} observed occurrence(s), ${cost} operational cost, and trend ${trend}. Because the active objective is alert optimization, action should stay focused on signal quality and routing rather than service remediation.`,
      drivers,
      action: {
        priority: drivers.length >= 3 ? 'SHORT_TERM' : 'STRATEGIC',
        title: 'Review alert tuning for this recurring signal',
        strength: drivers.length >= 3 ? 'Evidence-backed' : 'Candidate',
        reason: `occurrence_count=${occurrences}; trend=${trend}; operational_cost=${cost}`,
        capability: 'Davis AI',
      },
      dataGaps,
    };
  }

  return {
    assessment: `This Executive recommendation uses ${occurrences} observed occurrence(s), ${cost} operational cost, ${savings} potential savings, and ${users} affected user(s). RCA availability is ${rca}, so the recommendation stays tied to the supplied business and recurrence signals.`,
    drivers,
    action: {
      priority: drivers.length >= 3 ? 'IMMEDIATE' : 'SHORT_TERM',
      title: pattern.recommendedAction,
      strength: drivers.length >= 3 ? 'Evidence-backed' : 'Candidate',
      reason: `operational_cost=${cost}; occurrence_count=${occurrences}; affected_users=${users}`,
      capability: 'Davis AI',
    },
    dataGaps,
  };
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
        borderLeft: `4px solid ${color}`,
        borderRadius: 8,
        padding: '10px 12px',
        background: 'var(--dt-colors-background-container-neutral-subdued, #f7f8fa)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--dt-colors-text-neutral-default, #23282d)' }}>{String(value)}</div>
      <div style={{ fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 4 }}>{label}</div>
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
            <SignalCard key={driver.signal} label={driver.signal.replace(/_/g, ' ')} value={driver.value} />
          ))}
        </SignalGrid>
      </PanelSection>
      <PanelSection title="Next Step">
        <Container color="neutral" variant="default" padding={8}>
          <Flex flexDirection="column" gap={6}>
            <Text textStyle="small" style={{ fontWeight: 700 }}>{state.result.action.title}</Text>
            <SignalGrid>
              <SignalCard label="Priority" value={state.result.action.priority.replace('_', ' ')} tone={state.result.action.priority} />
              <SignalCard label="Strength" value={state.result.action.strength} />
              <SignalCard label="Capability" value={state.result.action.capability} />
              <SignalCard label="Evidence" value={state.result.action.reason} />
            </SignalGrid>
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

  async function generateRecommendation(kind: GenerationKind = 'recommendation') {
    if (!pattern) return;
    const setState = kind === 'analysis' ? setAnalysis : kind === 'remediation' ? setRemediation : setRecommendation;
    setState({ status: 'loading' });
    await new Promise(resolve => setTimeout(resolve, 250));
    const result = buildRecommendation(pattern, kind);
    setState(result ? { status: 'ready', result } : { status: 'insufficient' });
  }

  async function generatePrimaryOutput() {
    if (!pattern) return;
    if (isExecutive) {
      await generateRecommendation('recommendation');
      return;
    }
    setRecommendation({ status: 'loading' });
    await new Promise(resolve => setTimeout(resolve, 250));
    const result = buildRecommendation(pattern, 'analysis');
    setRecommendation(result ? { status: 'ready', result } : { status: 'insufficient' });
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
                <span style={{ fontSize: 14, flexShrink: 0 }}>{section.icon}</span>
                <Flex flexDirection="column" gap={2}>
                  <Text textStyle="small" style={{ fontWeight: 600 }}>{section.title}</Text>
                  <Text textStyle="small" style={{ color: MUTED }}>{section.desc}</Text>
                </Flex>
              </Flex>
            </Container>
          ))}
        </Flex>
      )}

      {pattern && <Flex flexDirection="column" gap={16} padding={16}>

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
          <Container color="primary" variant="default" padding={12}>
            <Text textStyle="small">{pattern.recommendedAction}</Text>
          </Container>
        </Flex>

        <Divider />

        {/* Assist */}
        <Flex flexDirection="column" gap={8}>
          <SectionLabel>{isExecutive ? 'Recommendation' : 'Analysis'}</SectionLabel>
          <Container color="neutral" variant="emphasized" padding={12}>
            <Flex flexDirection="column" gap={8}>
              <span style={{ fontSize: 11, color: MUTED }}>
                Calibrate Assist · {pattern.assistContext.persona} · {formatObjective(pattern.assistContext.objective)}
              </span>
              <Text textStyle="small">
                {isExecutive
                  ? 'Generate an evidence-gated recommendation from the selected pattern and its observed signals.'
                  : 'Generate persona-specific analysis from observed recurrence, impact, RCA, and trend signals.'}
              </Text>
              <Button
                variant="accent"
                style={{ alignSelf: 'flex-start' }}
                onClick={generatePrimaryOutput}
                disabled={recommendation.status === 'loading'}
              >
                {recommendation.status === 'loading' ? 'Generating...' : isExecutive ? 'Generate Recommendation' : 'Generate Analysis'}
              </Button>
              {recommendation.status === 'insufficient' && (
                <Container color="critical" variant="default" padding={8}>
                  <Text textStyle="small">
                    Insufficient signal data. Add at least three meaningful observed signals before generating a recommendation.
                  </Text>
                </Container>
              )}
              {recommendation.status === 'ready' && recommendation.result && (
                <Container color="neutral" variant="default" padding={8}>
                  <Flex flexDirection="column" gap={8}>
                    <Text textStyle="small">{recommendation.result.assessment}</Text>
                    <Flex flexDirection="column" gap={4}>
                      {recommendation.result.drivers.slice(0, 3).map(driver => (
                        <Text key={driver.signal} textStyle="small" style={{ color: MUTED }}>
                          <strong>{driver.signal}</strong>: {driver.value} - {driver.whyItMatters}
                        </Text>
                      ))}
                    </Flex>
                    <Divider />
                    <Flex flexDirection="column" gap={4}>
                      <Text textStyle="small" style={{ fontWeight: 700 }}>{recommendation.result.action.title}</Text>
                      <Text textStyle="small" style={{ color: MUTED }}>
                        {recommendation.result.action.priority} · {recommendation.result.action.strength} · {recommendation.result.action.capability}
                      </Text>
                      <Text textStyle="small">{recommendation.result.action.reason}</Text>
                    </Flex>
                    {recommendation.result.dataGaps.length > 0 && (
                      <Text textStyle="small" style={{ color: MUTED }}>
                        Data gaps: {recommendation.result.dataGaps.join(' ')}
                      </Text>
                    )}
                  </Flex>
                </Container>
              )}
            </Flex>
          </Container>
        </Flex>

        {!isExecutive && (
          <>
            <Divider />
            <Flex flexDirection="column" gap={8}>
              <SectionLabel>Remediation</SectionLabel>
              <Container color="neutral" variant="emphasized" padding={12}>
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
                  <GeneratedOutput state={remediation} />
                </Flex>
              </Container>
            </Flex>
          </>
        )}

      </Flex>}
    </Surface>
  );
}
