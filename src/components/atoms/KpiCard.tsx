import React from 'react';
import { Container, Flex } from '@dynatrace/strato-components/layouts';
import { Heading, Text } from '@dynatrace/strato-components/typography';
import { MetricCardViewModel, DisplayLevel } from '../../types/views';

function levelToColor(level?: DisplayLevel): 'critical' | 'warning' | 'success' | 'neutral' {
  if (level === 'High') return 'critical';
  if (level === 'Medium') return 'warning';
  if (level === 'Low') return 'success';
  return 'neutral';
}

interface KpiCardProps {
  metric: MetricCardViewModel;
}

export function KpiCard({ metric }: KpiCardProps) {
  const color = levelToColor(metric.level);
  const variant = metric.level ? 'emphasized' : 'default';

  return (
    <Container color={color} variant={variant} padding={16} style={{ flex: 1, minWidth: 0 }}>
      <Flex flexDirection="column" gap={4}>
        <Text textStyle="small">{metric.label}</Text>
        <Heading level={3}>{metric.value}</Heading>
        {metric.helper && <Text textStyle="small">{metric.helper}</Text>}
      </Flex>
    </Container>
  );
}
