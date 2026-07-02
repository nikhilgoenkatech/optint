import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { DeveloperKPIs } from '../../types/views';
import { KpiCard } from '../atoms/KpiCard';

interface DeveloperKpiRowProps {
  kpis: DeveloperKPIs;
}

export function DeveloperKpiRow({ kpis }: DeveloperKpiRowProps) {
  return (
    <Flex gap={12}>
      <KpiCard metric={kpis.openErrors} />
      <KpiCard metric={kpis.servicesImpacted} />
      <KpiCard metric={kpis.needsInvestigation} />
      <KpiCard metric={kpis.medianResolutionTime} />
    </Flex>
  );
}
