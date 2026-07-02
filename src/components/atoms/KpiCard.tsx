import React from 'react';
import { Container, Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { MetricCardViewModel, DisplayLevel } from '../../types/views';

type SemanticIntent = 'danger' | 'success' | 'warning' | 'neutral';

const ACCENT_COLORS: Record<SemanticIntent, string> = {
  danger:  'var(--dt-colors-text-critical-default, #c41a00)',
  success: 'var(--dt-colors-text-success-default, #1a7a4a)',
  warning: 'var(--dt-colors-text-warning-default, #b45309)',
  neutral: 'var(--dt-colors-border-neutral-default, #b0b4b8)',
};

function levelToColor(level?: DisplayLevel): 'critical' | 'warning' | 'success' | 'neutral' {
  if (level === 'High') return 'critical';
  if (level === 'Medium') return 'warning';
  if (level === 'Low') return 'success';
  return 'neutral';
}

interface KpiCardProps {
  metric: MetricCardViewModel;
  semantic?: SemanticIntent;
}

export function KpiCard({ metric, semantic }: KpiCardProps) {
  const color = levelToColor(metric.level);
  const accentColor = semantic ? ACCENT_COLORS[semantic] : undefined;

  return (
    <Container
      color={color}
      variant="default"
      padding={16}
      style={{
        flex: 1,
        minWidth: 0,
        borderTop: accentColor ? `3px solid ${accentColor}` : undefined,
      }}
    >
      <Flex flexDirection="column" gap={4}>
        <Text textStyle="small" style={{ color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}>{metric.label}</Text>
        <Heading level={3} style={{ color: accentColor }}>{metric.value}</Heading>
        {metric.helper && <Text textStyle="small">{metric.helper}</Text>}
      </Flex>
    </Container>
  );
}
