import React, { useRef, useCallback } from 'react';
import { Modal } from '@dynatrace/strato-components/overlays';
import { Flex, Divider } from '@dynatrace/strato-components/layouts';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';
import { Text, Heading } from '@dynatrace/strato-components/typography';
import { Button } from '@dynatrace/strato-components/buttons';
import { FormField, Label, NumberInputV2 } from '@dynatrace/strato-components/forms';
import { ExtendedCostConfig } from '../../models';
import { ObjectiveType } from '../../types/views';

// ── Types ──────────────────────────────────────────────────

export interface WeightSegment {
  label: string;
  pct: number;
  color: string;
}

export interface WeightsConfig {
  cost_impact: WeightSegment[];
  alert_optimization: WeightSegment[];
}

export const DEFAULT_EXTENDED_COST_CONFIG: ExtendedCostConfig = {
  affectedUserCostPerHr:  4.8,
  fallbackEntityCost:     0,
  engineeringHourlyRate:  150,
  defaultResponders:      3,
  recoveryRatePct:        35,
  severityMultipliers: {
    AVAILABILITY:        1.0,
    ERROR:               0.7,
    PERFORMANCE:         0.3,
    RESOURCE_CONTENTION: 0.15,
    CUSTOM_ALERT:        0.05,
  },
};

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
  open: boolean;
  onClose: () => void;
  costConfig: ExtendedCostConfig;
  onCostConfigChange: (c: ExtendedCostConfig) => void;
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
    let current = segments.map(s => ({ ...s }));

    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - lastX;
      lastX = ev.clientX;
      const dpct = (dx / barW) * 100;
      const next = current.map(s => ({ ...s }));
      const newA = Math.max(5, Math.min(next[idx].pct + dpct, next[idx].pct + next[idx + 1].pct - 5));
      next[idx + 1].pct = next[idx].pct + next[idx + 1].pct - newA;
      next[idx].pct = newA;
      current = next;
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
      <div ref={barRef} style={{ display: 'flex', height: 36, borderRadius: 6, overflow: 'hidden', userSelect: 'none' }}>
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
            }}
          >
            <span style={{ color: '#fff', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {seg.label} {Math.round(seg.pct)}%
            </span>
            {i < segments.length - 1 && (
              <div
                onMouseDown={(e) => startDrag(e, i)}
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 6, background: 'rgba(255,255,255,0.35)', cursor: 'col-resize', zIndex: 2 }}
              />
            )}
          </div>
        ))}
      </div>
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

// ── Section label ──────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--dt-colors-text-neutral-subdued, #74777a)', textTransform: 'uppercase' }}>
      {children}
    </span>
  );
}

// ── Dialog ─────────────────────────────────────────────────

export function ConfigDialog({
  open, onClose, costConfig, onCostConfigChange, weightsConfig, onWeightsChange, objective,
}: ConfigDialogProps) {
  const updateCost = (key: keyof Omit<ExtendedCostConfig, 'severityMultipliers'>, value: number | null) => {
    if (value == null) return;
    onCostConfigChange({ ...costConfig, [key]: value });
  };

  const updateSeverity = (sev: keyof ExtendedCostConfig['severityMultipliers'], value: number | null) => {
    if (value == null) return;
    onCostConfigChange({
      ...costConfig,
      severityMultipliers: { ...costConfig.severityMultipliers, [sev]: value },
    });
  };

  const updateWeights = (obj: ObjectiveType, segs: WeightSegment[]) => {
    onWeightsChange({ ...weightsConfig, [obj]: segs });
  };

  const summaryText = `Standard profile: severity factors are AVAILABILITY ${costConfig.severityMultipliers.AVAILABILITY}, ` +
    `ERROR ${costConfig.severityMultipliers.ERROR}, PERFORMANCE ${costConfig.severityMultipliers.PERFORMANCE}, ` +
    `RESOURCE_CONTENTION ${costConfig.severityMultipliers.RESOURCE_CONTENTION}, ` +
    `CUSTOM_ALERT ${costConfig.severityMultipliers.CUSTOM_ALERT}; ` +
    `engineer rate $${costConfig.engineeringHourlyRate}/hr; responders ${costConfig.defaultResponders}; ` +
    `affected user cost $${costConfig.affectedUserCostPerHr}/hr; recovery rate ${costConfig.recoveryRatePct}%.`;

  return (
    <Modal
      title="Configuration"
      show={open}
      onDismiss={onClose}
      size="small"
    >
      <Tabs>
        <Tab title="Cost assumptions">
          <Flex flexDirection="column" gap={16} padding={4}>

            <Flex flexDirection="column" gap={12}>
              <SectionLabel>Business impact assumptions</SectionLabel>
              <FormField>
                <Label>Affected user cost / hr</Label>
                <NumberInputV2
                  value={costConfig.affectedUserCostPerHr}
                  onChange={(v) => updateCost('affectedUserCostPerHr', v)}
                  step={0.1}
                  min={0}
                />
              </FormField>
              <FormField>
                <Label>Fallback entity cost</Label>
                <NumberInputV2
                  value={costConfig.fallbackEntityCost}
                  onChange={(v) => updateCost('fallbackEntityCost', v)}
                  step={1}
                  min={0}
                />
              </FormField>
            </Flex>

            <Divider />

            <Flex flexDirection="column" gap={12}>
              <SectionLabel>Engineering assumptions</SectionLabel>
              <FormField>
                <Label>Engineer hourly rate ($)</Label>
                <NumberInputV2
                  value={costConfig.engineeringHourlyRate}
                  onChange={(v) => updateCost('engineeringHourlyRate', v)}
                  step={10}
                  min={0}
                />
              </FormField>
              <FormField>
                <Label>Default responders</Label>
                <NumberInputV2
                  value={costConfig.defaultResponders}
                  onChange={(v) => updateCost('defaultResponders', v)}
                  step={1}
                  min={1}
                />
              </FormField>
              <FormField>
                <Label>Recovery rate (%)</Label>
                <NumberInputV2
                  value={costConfig.recoveryRatePct}
                  onChange={(v) => updateCost('recoveryRatePct', v)}
                  step={1}
                  min={0}
                  max={100}
                />
              </FormField>
            </Flex>

            <Divider />

            <Flex flexDirection="column" gap={12}>
              <SectionLabel>Severity multipliers</SectionLabel>
              {(Object.entries(costConfig.severityMultipliers) as [keyof ExtendedCostConfig['severityMultipliers'], number][]).map(([sev, val]) => (
                <FormField key={sev}>
                  <Label>{sev.charAt(0) + sev.slice(1).toLowerCase().replace('_', ' ')}</Label>
                  <NumberInputV2
                    value={val}
                    onChange={(v) => updateSeverity(sev, v)}
                    step={0.05}
                    min={0}
                    max={1}
                  />
                </FormField>
              ))}
            </Flex>

            <Divider />
            <Text textStyle="small">{summaryText}</Text>
            <Text textStyle="small">These values are modeled estimates based on configured assumptions and available Davis problem data.</Text>

            <Button variant="accent" onClick={onClose} style={{ width: '100%' }}>
              Apply &amp; Recalculate
            </Button>
          </Flex>
        </Tab>

        <Tab title="Weights">
          <Flex flexDirection="column" gap={16} padding={4}>
            <Text textStyle="small">
              Drag segment handles to redistribute ranking weight. Total is always 100%.
            </Text>

            <Flex flexDirection="column" gap={12}>
              <SectionLabel>Cost impact</SectionLabel>
              <AllocBar
                segments={weightsConfig.cost_impact}
                onChange={(segs) => updateWeights('cost_impact', segs)}
              />
            </Flex>

            <Divider />

            <Flex flexDirection="column" gap={12}>
              <SectionLabel>Alert optimization</SectionLabel>
              <AllocBar
                segments={weightsConfig.alert_optimization}
                onChange={(segs) => updateWeights('alert_optimization', segs)}
              />
            </Flex>
          </Flex>
        </Tab>
      </Tabs>
    </Modal>
  );
}
