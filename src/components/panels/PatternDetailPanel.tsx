import React from 'react';
import { Flex, Surface, Divider } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { Container } from '@dynatrace/strato-components/layouts';
import { PatternDetail, TrendDirection } from '../../types/views';

interface PatternDetailPanelProps {
  pattern: PatternDetail;
  onClose: () => void;
}

function TrendArrow({ trend }: { trend: TrendDirection }) {
  const arrow = trend === 'Increasing' ? '↑' : trend === 'Decreasing' ? '↓' : '→';
  const color =
    trend === 'Increasing'
      ? 'var(--dt-colors-text-critical-default)'
      : trend === 'Decreasing'
        ? 'var(--dt-colors-text-success-default)'
        : 'var(--dt-colors-text-neutral-subdued)';
  return <span style={{ color, fontWeight: 600 }}>{arrow} {trend}</span>;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <Flex justifyContent="space-between" alignItems="center">
      <Text textStyle="small" style={{ color: 'var(--dt-colors-text-neutral-subdued)' }}>{label}</Text>
      <Text>{String(value)}</Text>
    </Flex>
  );
}

export function PatternDetailPanel({ pattern, onClose }: PatternDetailPanelProps) {
  return (
    <Surface
      elevation="raised"
      style={{
        width: 360,
        minWidth: 360,
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--dt-colors-border-neutral-default)',
      }}
      padding={0}
    >
      {/* Header */}
      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        padding={16}
        style={{ borderBottom: '1px solid var(--dt-colors-border-neutral-subdued)' }}
      >
        <Flex flexDirection="column" gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text textStyle="small" style={{ color: 'var(--dt-colors-text-neutral-subdued)' }}>
            Pattern detail
          </Text>
          <Heading level={4} style={{ margin: 0 }}>{pattern.title}</Heading>
        </Flex>
        <Button variant="default" onClick={onClose} style={{ marginLeft: 8, flexShrink: 0 }}>✕</Button>
      </Flex>

      <Flex flexDirection="column" gap={16} padding={16}>

        {/* Business Impact */}
        <Flex flexDirection="column" gap={8}>
          <Text style={{ fontWeight: 600 }}>Business Impact</Text>
          <Container color="neutral" variant="default" padding={12}>
            <Flex flexDirection="column" gap={6}>
              <StatRow label="Risk exposure" value={pattern.businessImpact.exposure} />
              <StatRow label="Recoverable value" value={pattern.businessImpact.recoverableValue} />
              <StatRow label="Open incidents" value={pattern.businessImpact.openIncidents} />
              {pattern.businessImpact.affectedUsers > 0 && (
                <StatRow label="Affected users" value={pattern.businessImpact.affectedUsers} />
              )}
            </Flex>
          </Container>
        </Flex>

        <Divider />

        {/* Recurrence */}
        <Flex flexDirection="column" gap={8}>
          <Text style={{ fontWeight: 600 }}>Recurrence</Text>
          <Container color="neutral" variant="default" padding={12}>
            <Flex flexDirection="column" gap={6}>
              <StatRow label="Occurrences" value={pattern.recurrence.occurrences} />
              <Flex justifyContent="space-between" alignItems="center">
                <Text textStyle="small" style={{ color: 'var(--dt-colors-text-neutral-subdued)' }}>Trend</Text>
                <TrendArrow trend={pattern.recurrence.trend} />
              </Flex>
            </Flex>
            {/* Mini sparkline */}
            <Flex gap={4} alignItems="flex-end" style={{ marginTop: 12, height: 32 }}>
              {pattern.recurrence.timeline.map((bucket, i) => {
                const max = Math.max(...pattern.recurrence.timeline.map(b => b.count), 1);
                const h = Math.max(4, Math.round((bucket.count / max) * 28));
                return (
                  <Flex key={i} flexDirection="column" alignItems="center" gap={2} style={{ flex: 1 }}>
                    <div
                      style={{
                        width: '100%',
                        height: h,
                        background: 'var(--dt-colors-background-container-primary-accent)',
                        borderRadius: 2,
                      }}
                    />
                    <Text textStyle="small" style={{ color: 'var(--dt-colors-text-neutral-subdued)', fontSize: 9 }}>
                      {bucket.label}
                    </Text>
                  </Flex>
                );
              })}
            </Flex>
          </Container>
        </Flex>

        <Divider />

        {/* Actionability */}
        <Flex flexDirection="column" gap={8}>
          <Text style={{ fontWeight: 600 }}>Actionability</Text>
          <Container color="neutral" variant="default" padding={12}>
            <Flex flexDirection="column" gap={6}>
              <StatRow label="Evidence quality" value={pattern.technicalActionability.evidenceQuality} />
              <StatRow label="Investigation readiness" value={pattern.technicalActionability.investigationReadiness} />
              <StatRow label="Remediation effort" value={pattern.technicalActionability.remediationEffort} />
              <StatRow label="RCA" value={
                pattern.assistContext.evidence.rca_availability === 'Present'
                  ? `Present${pattern.assistContext.evidence.root_cause_entity ? ` · ${pattern.assistContext.evidence.root_cause_entity}` : ''}`
                  : 'Missing'
              } />
            </Flex>
          </Container>
        </Flex>

        <Divider />

        {/* Recommended Action */}
        <Flex flexDirection="column" gap={8}>
          <Text style={{ fontWeight: 600 }}>Recommended Action</Text>
          <Container color="primary" variant="default" padding={12}>
            <Text textStyle="small">{pattern.recommendedAction}</Text>
          </Container>
        </Flex>

        <Divider />

        {/* Assist — Davis Copilot placeholder */}
        <Flex flexDirection="column" gap={8}>
          <Text style={{ fontWeight: 600 }}>Assist</Text>
          <Container color="neutral" variant="emphasized" padding={12}>
            <Flex flexDirection="column" gap={8}>
              <Text textStyle="small" style={{ color: 'var(--dt-colors-text-neutral-subdued)' }}>
                Davis Copilot · {pattern.assistContext.persona} · {pattern.assistContext.objective.replace('_', ' ')}
              </Text>
              <Text textStyle="small">
                Ask Davis to investigate this pattern across {pattern.assistContext.problemIds.length} problem{pattern.assistContext.problemIds.length !== 1 ? 's' : ''}.
              </Text>
              <Button variant="accent" style={{ alignSelf: 'flex-start' }}>
                Open in Davis Copilot
              </Button>
            </Flex>
          </Container>
        </Flex>

      </Flex>
    </Surface>
  );
}
