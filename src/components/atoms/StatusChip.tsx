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
  const color = value === 'Increasing' ? 'critical' : value === 'Decreasing' ? 'success' : 'neutral';
  return <Chip color={color} variant="emphasized">{value}</Chip>;
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
