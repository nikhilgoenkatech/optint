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

function KpiTooltip({ text }: { text: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  function handleMouseEnter() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    }
  }

  return (
    <span ref={ref} style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setPos(null)}
        style={{
          cursor: 'help',
          color: 'var(--dt-colors-text-neutral-subdued, #74777a)',
          fontSize: 11,
          lineHeight: 1,
          userSelect: 'none',
          opacity: 0.7,
        }}
      >
        ⓘ
      </span>
      {pos && (
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translateX(-50%) translateY(calc(-100% - 6px))',
            padding: '8px 10px',
            background: 'var(--dt-colors-background-base-default, #fff)',
            border: '1px solid var(--dt-colors-border-neutral-default, #cfd3d8)',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--dt-colors-text-neutral-default, #23282d)',
            whiteSpace: 'normal',
            width: 220,
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            lineHeight: 1.5,
            pointerEvents: 'none',
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}

interface KpiCardProps {
  metric: MetricCardViewModel;
  semantic?: SemanticIntent;
  tooltip?: string;
}

export function KpiCard({ metric, semantic, tooltip }: KpiCardProps) {
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
        <Flex alignItems="center" gap={4}>
          <Text textStyle="small" style={{ color: 'var(--dt-colors-text-neutral-subdued, #74777a)' }}>{metric.label}</Text>
          {tooltip && <KpiTooltip text={tooltip} />}
        </Flex>
        <Heading level={3} style={{ color: accentColor }}>{metric.value}</Heading>
        {metric.helper && <Text textStyle="small">{metric.helper}</Text>}
      </Flex>
    </Container>
  );
}
