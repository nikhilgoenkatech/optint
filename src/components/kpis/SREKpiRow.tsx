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
      <KpiCard metric={kpis.operationalDebt} />
      <KpiCard metric={kpis.automationCandidates} />
      <KpiCard metric={kpis.repeatOffenders} />
      <KpiCard metric={kpis.medianMttr} />
    </Flex>
  );
}
