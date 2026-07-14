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
      <KpiCard metric={kpis.operationalDebt}      semantic="danger"  />
      <KpiCard metric={kpis.automationCandidates} semantic="warning" />
      <KpiCard metric={kpis.repeatOffenders}      semantic="danger"  />
      <KpiCard metric={kpis.medianMttr}           semantic="neutral" />
    </Flex>
  );
}
