import React from 'react';
import { Flex } from '@dynatrace/strato-components/layouts';
import { ExecKPIs } from '../../types/views';
import { KpiCard } from '../atoms/KpiCard';

interface ExecKpiRowProps {
  kpis: ExecKPIs;
}

export function ExecKpiRow({ kpis }: ExecKpiRowProps) {
  return (
    <Flex gap={12}>
      <KpiCard metric={kpis.openRiskExposure} />
      <KpiCard metric={kpis.recoverableNow} />
      <KpiCard metric={kpis.activePatterns} />
      <KpiCard metric={kpis.resolutionTime} />
    </Flex>
  );
}
