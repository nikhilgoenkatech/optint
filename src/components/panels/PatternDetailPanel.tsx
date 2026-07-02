import React from 'react';
import { Flex, Surface, Divider } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { Container } from '@dynatrace/strato-components/layouts';
import { EmptyState } from '@dynatrace/strato-components/content';
import { PatternDetail, TrendDirection } from '../../types/views';

const MUTED  = 'var(--dt-colors-text-neutral-subdued, #74777a)';
const DANGER = 'var(--dt-colors-text-critical-default, #c41a00)';
const OK     = 'var(--dt-colors-text-success-default, #1a7a4a)';
const ACCENT = 'var(--dt-colors-background-container-primary-accent, #1496ff)';

interface PatternDetailPanelProps {
  pattern: PatternDetail | null;
  onClose: () => void;
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

export function PatternDetailPanel({ pattern, onClose }: PatternDetailPanelProps) {
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
        <Flex flexDirection="column" gap={8}>
          <SectionLabel>Business Impact</SectionLabel>
          <Container color="neutral" variant="default" padding={12}>
            <Flex flexDirection="column" gap={6}>
              <StatRow label="Risk exposure"     value={pattern.businessImpact.exposure} />
              <StatRow label="Recoverable value" value={pattern.businessImpact.recoverableValue} />
              <StatRow label="Open incidents"    value={pattern.businessImpact.openIncidents} />
              {pattern.businessImpact.affectedUsers > 0 && (
                <StatRow label="Affected users" value={pattern.businessImpact.affectedUsers} />
              )}
            </Flex>
          </Container>
        </Flex>

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
          <SectionLabel>Actionability</SectionLabel>
          <Container color="neutral" variant="default" padding={12}>
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
          <SectionLabel>Assist</SectionLabel>
          <Container color="neutral" variant="emphasized" padding={12}>
            <Flex flexDirection="column" gap={8}>
              <span style={{ fontSize: 11, color: MUTED }}>
                Davis Copilot · {pattern.assistContext.persona} · {pattern.assistContext.objective.replace('_', ' ')}
              </span>
              <Text textStyle="small">
                Ask Davis to investigate this pattern across {pattern.assistContext.problemIds.length} problem
                {pattern.assistContext.problemIds.length !== 1 ? 's' : ''}.
              </Text>
              <Button variant="accent" style={{ alignSelf: 'flex-start' }}>
                Open in Davis Copilot
              </Button>
            </Flex>
          </Container>
        </Flex>

      </Flex>}
    </Surface>
  );
}
