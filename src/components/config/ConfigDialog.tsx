import React, { useRef, useState, useCallback } from 'react';
import { Modal } from '@dynatrace/strato-components/overlays';
import { Flex } from '@dynatrace/strato-components/layouts';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { Text } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { FormField, Label, TextInput } from '@dynatrace/strato-components/forms';
import { CostConfig } from '../../models';
import { ObjectiveType } from '../../types/views';

// ── Types ──────────────────────────────────────────────────

export interface WeightSegment {
  label: string;
  pct: number;   // 0–100, all segments sum to 100
  color: string;
}

export interface WeightsConfig {
  cost_impact: WeightSegment[];
  alert_optimization: WeightSegment[];
}

export const DEFAULT_WEIGHTS: WeightsConfig = {
  cost_impact: [
    { label: 'Estimated cost', pct: 30, color: '#1a6af4' },
    { label: 'Recurrence',     pct: 27, color: '#7c4dff' },
    { label: 'Blast radius',   pct: 23, color: '#00897b' },
    { label: 'Actionability',  pct: 20, color: '#ef6c00' },
  ],
  alert_optimization: [
    { label: 'Noise likelihood',  pct: 32, color: '#1a6af4' },
    { label: 'Alert frequency',   pct: 28, color: '#7c4dff' },
    { label: 'Auto-resolve rate', pct: 25, color: '#00897b' },
    { label: 'Blast radius',      pct: 15, color: '#ef6c00' },
  ],
};

interface ConfigDialogProps {
  show: boolean;
  onDismiss: () => void;
  costConfig: CostConfig;
  onCostConfigChange: (c: CostConfig) => void;
  weightsConfig: WeightsConfig;
  onWeightsChange: (w: WeightsConfig) => void;
  objective: ObjectiveType;
}

// ── Allocation bar ─────────────────────────────────────────

interface AllocBarProps {
  segments: WeightSegment[];
  onChange: (segs: WeightSegment[]) => void;
}

function AllocBar({ segments, onChange }: AllocBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const startDrag = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    const bar = barRef.current;
    if (!bar) return;
    const barW = bar.getBoundingClientRect().width;
    let lastX = e.clientX;

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      const dpct = (dx / barW) * 100;
      const next = segments.map(s => ({ ...s }));
      const newA = Math.max(5, Math.min(next[idx].pct + dpct, next[idx].pct + next[idx + 1].pct - 5));
      next[idx + 1].pct = next[idx].pct + next[idx + 1].pct - newA;
      next[idx].pct = newA;
      onChange(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [segments, onChange]);

  return (
    <Flex flexDirection="column" gap={8}>
      {/* Bar */}
      <div
        ref={barRef}
        style={{ display: 'flex', height: 36, borderRadius: 6, overflow: 'hidden', userSelect: 'none' }}
      >
        {segments.map((seg, i) => (
          <div
            key={seg.label}
            style={{
              position: 'relative',
              width: `${seg.pct}%`,
              background: seg.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              transition: 'width 0.05s',
            }}
          >
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {seg.label} {Math.round(seg.pct)}%
            </span>
            {i < segments.length - 1 && (
              <div
                onMouseDown={(e) => startDrag(e, i)}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  background: 'rgba(255,255,255,0.35)',
                  cursor: 'col-resize',
                  zIndex: 2,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <Flex gap={12} style={{ flexWrap: 'wrap' }}>
        {segments.map(seg => (
          <Flex key={seg.label} alignItems="center" gap={4}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <Text textStyle="small">{seg.label}</Text>
          </Flex>
        ))}
      </Flex>
    </Flex>
  );
}

// ── Dialog ─────────────────────────────────────────────────

export function ConfigDialog({
  show, onDismiss, costConfig, onCostConfigChange, weightsConfig, onWeightsChange, objective,
}: ConfigDialogProps) {
  const [objTab, setObjTab] = useState<ObjectiveType>(objective);

  const updateCost = (key: keyof CostConfig, raw: string) => {
    const val = parseFloat(raw);
    if (!Number.isNaN(val) && val >= 0) onCostConfigChange({ ...costConfig, [key]: val });
  };

  const updateWeights = (segs: WeightSegment[]) => {
    onWeightsChange({ ...weightsConfig, [objTab]: segs });
  };

  return (
    <Modal title="Configuration" show={show} onDismiss={onDismiss} size="small">
      <Tabs>
        <Tab title="Cost model">
          <Flex flexDirection="column" gap={16} padding={4}>
            <Text textStyle="small">
              Used to estimate $ cost per incident pattern. Changes apply immediately.
            </Text>
            <FormField>
              <Label>Revenue per user per minute ($)</Label>
              <TextInput
                value={String(costConfig.revenuePerUserPerMinute)}
                onChange={(v) => updateCost('revenuePerUserPerMinute', v)}
              />
            </FormField>
            <FormField>
              <Label>Engineering hourly rate ($)</Label>
              <TextInput
                value={String(costConfig.engineeringHourlyRate)}
                onChange={(v) => updateCost('engineeringHourlyRate', v)}
              />
            </FormField>
            <FormField>
              <Label>Average incident responders</Label>
              <TextInput
                value={String(costConfig.avgIncidentResponders)}
                onChange={(v) => updateCost('avgIncidentResponders', v)}
              />
            </FormField>
          </Flex>
        </Tab>

        <Tab title="Weights">
          <Flex flexDirection="column" gap={16} padding={4}>
            <Text textStyle="small">
              Drag segment handles to redistribute ranking weight. Total is always 100%.
            </Text>
            <Flex gap={8}>
              {(['cost_impact', 'alert_optimization'] as ObjectiveType[]).map(obj => (
                <Button
                  key={obj}
                  variant={objTab === obj ? 'accent' : 'default'}
                  onClick={() => setObjTab(obj)}
                >
                  {obj === 'cost_impact' ? 'Cost impact' : 'Alert optimization'}
                </Button>
              ))}
            </Flex>
            <AllocBar
              segments={weightsConfig[objTab]}
              onChange={updateWeights}
            />
          </Flex>
        </Tab>
      </Tabs>

      <Flex justifyContent="flex-end" padding={4}>
        <Button variant="accent" onClick={onDismiss}>Done</Button>
      </Flex>
    </Modal>
  );
}
