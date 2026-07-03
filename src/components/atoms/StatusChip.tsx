import React from 'react';
import { Chip } from '@dynatrace/strato-components/content';
import { DisplayLevel, TrendDirection, PatternStatus, RecommendationPriority } from '../../types/views';

// Chip color: 'neutral' | 'primary' | 'success' | 'warning' | 'critical'
// Chip variant: 'accent' | 'emphasized'

export function SeverityChip({ value }: { value: DisplayLevel }) {
  const color = value === 'High' ? 'critical' : value === 'Medium' ? 'warning' : 'neutral';
  return <Chip color={color} variant="emphasized">{value}</Chip>;
}

export function TrendChip({ value }: { value: TrendDirection }) {
  const color = value === 'Increasing'
    ? 'var(--dt-colors-text-critical-default, #c41a00)'
    : value === 'Decreasing'
      ? 'var(--dt-colors-text-success-default, #1a7a4a)'
      : 'var(--dt-colors-text-neutral-subdued, #74777a)';
  const arrow = value === 'Increasing' ? '↑' : value === 'Decreasing' ? '↓' : '→';
  return (
    <span style={{ color, fontWeight: 700, fontSize: 16, lineHeight: 1 }} title={value}>
      {arrow}
    </span>
  );
}

export function StatusChip({ value }: { value: PatternStatus }) {
  const color = value === 'Open'
    ? 'var(--dt-colors-text-critical-default, #c41a00)'
    : value === 'Resolved'
      ? 'var(--dt-colors-text-success-default, #1a7a4a)'
      : 'var(--dt-colors-text-warning-default, #b45309)';
  return <span style={{ color, fontSize: 12, fontWeight: 600 }}>{value}</span>;
}

export function PriorityChip({ value }: { value: RecommendationPriority }) {
  const color = value === 'Immediate'
    ? 'var(--dt-colors-text-critical-default, #c41a00)'
    : value === 'Short term'
      ? 'var(--dt-colors-text-warning-default, #b45309)'
      : value === 'Strategic'
        ? 'var(--dt-colors-text-primary-default, #1496ff)'
        : 'var(--dt-colors-text-neutral-subdued, #74777a)';
  return <span style={{ color, fontSize: 12, fontWeight: 600 }}>{value}</span>;
}

export function EvidenceChip({ value }: { value: DisplayLevel }) {
  const dotColor = value === 'High'
    ? 'var(--dt-colors-text-success-default, #1a7a4a)'
    : value === 'Medium'
      ? 'var(--dt-colors-text-warning-default, #b45309)'
      : 'var(--dt-colors-text-neutral-subdued, #74777a)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
      <span style={{ color: dotColor }}>{value}</span>
    </span>
  );
}
