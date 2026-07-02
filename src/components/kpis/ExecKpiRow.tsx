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
      <KpiCard metric={kpis.openRiskExposure} semantic="danger" />
      <KpiCard metric={kpis.recoverableNow}   semantic="success" />
      <KpiCard metric={kpis.activePatterns}   semantic="warning" />
      <KpiCard metric={kpis.resolutionTime}   semantic="neutral" />
    </Flex>
  );
}
