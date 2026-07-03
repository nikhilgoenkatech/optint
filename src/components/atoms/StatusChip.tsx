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
  const dotColor = value === 'Increasing'
    ? 'var(--dt-colors-text-critical-default, #c41a00)'
    : value === 'Decreasing'
      ? 'var(--dt-colors-text-success-default, #1a7a4a)'
      : 'var(--dt-colors-text-neutral-subdued, #74777a)';
  const arrow = value === 'Increasing' ? '↑' : value === 'Decreasing' ? '↓' : '→';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
      <span style={{ color: dotColor, fontWeight: 700, fontSize: 13 }}>{arrow}</span>
      <span style={{ color: dotColor }}>{value}</span>
    </span>
  );
}

export function StatusChip({ value }: { value: PatternStatus }) {
  const color = value === 'Open' ? 'critical' : value === 'Resolved' ? 'success' : 'warning';
  return <Chip color={color} variant="emphasized">{value}</Chip>;
}

export function PriorityChip({ value }: { value: RecommendationPriority }) {
  const color =
    value === 'Immediate' ? 'critical' :
    value === 'Short term' ? 'warning' :
    value === 'Strategic' ? 'primary' : 'neutral';
  return <Chip color={color} variant="emphasized">{value}</Chip>;
}

export function EvidenceChip({ value }: { value: DisplayLevel }) {
  const color = value === 'High' ? 'success' : value === 'Medium' ? 'warning' : 'neutral';
  return <Chip color={color} variant="emphasized">{value}</Chip>;
}
