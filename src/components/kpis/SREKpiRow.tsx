import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { SREKPIs } from '../../types/views';
import { KpiCard } from '../atoms/KpiCard';

interface SREKpiRowProps {
  kpis: SREKPIs;
}

export function SREKpiRow({ kpis }: SREKpiRowProps) {
  return (
    <Flex gap={12}>
      <KpiCard metric={kpis.operationalDebt}      semantic="danger"
        tooltip="Recurring reliability risks that lack sufficient evidence or remediation readiness. These patterns are harder to automate or resolve without richer signal data." />
      <KpiCard metric={kpis.automationCandidates} semantic="warning"
        tooltip="Recurring patterns with sufficient evidence that may benefit from automation. These have clear recurrence history and investigation readiness above the low threshold." />
      <KpiCard metric={kpis.repeatOffenders}      semantic="danger"
        tooltip="Patterns that have recurred at least twice within the selected timeframe. Frequent recurrence suggests systemic issues that are not being fully resolved." />
      <KpiCard metric={kpis.medianMttr}           semantic="neutral"
        tooltip="Median time to resolve incidents across all patterns, calculated from resolved incidents within the selected timeframe." />
    </Flex>
  );
}
