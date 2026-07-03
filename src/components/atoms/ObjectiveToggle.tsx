import React from 'react';
import { ToggleButtonGroup } from '@dynatrace/strato-components/forms';
import { TargetFilledIcon } from '@dynatrace/strato-icons';
import { ObjectiveType } from '../../types/views';

interface ObjectiveToggleProps {
  value: ObjectiveType;
  onChange: (v: ObjectiveType) => void;
}

export function ObjectiveToggle({ value, onChange }: ObjectiveToggleProps) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--dt-colors-text-neutral-subdued, #74777a)',
        letterSpacing: '0.02em',
      }}>
        <TargetFilledIcon />
        Goal
      </span>
      <ToggleButtonGroup
        value={value}
        onChange={(v) => onChange(v as ObjectiveType)}
      >
        <ToggleButtonGroup.Item value="cost_impact">Cost Impact</ToggleButtonGroup.Item>
        <ToggleButtonGroup.Item value="alert_optimization">Alert Optimization</ToggleButtonGroup.Item>
      </ToggleButtonGroup>
    </span>
  );
}
