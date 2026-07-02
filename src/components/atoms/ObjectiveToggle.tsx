import React from 'react';
import { ToggleButtonGroup } from '@dynatrace/strato-components/forms';
import { ObjectiveType } from '../../types/views';

interface ObjectiveToggleProps {
  value: ObjectiveType;
  onChange: (v: ObjectiveType) => void;
}

export function ObjectiveToggle({ value, onChange }: ObjectiveToggleProps) {
  return (
    <ToggleButtonGroup
      value={value}
      onChange={(v) => onChange(v as ObjectiveType)}
    >
      <ToggleButtonGroup.Item value="cost_impact">Cost Impact</ToggleButtonGroup.Item>
      <ToggleButtonGroup.Item value="alert_optimization">Alert Optimization</ToggleButtonGroup.Item>
    </ToggleButtonGroup>
  );
}
