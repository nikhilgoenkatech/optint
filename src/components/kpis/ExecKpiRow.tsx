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
      <KpiCard metric={kpis.openRiskExposure} semantic="danger"
        tooltip="Estimated business exposure from recurring operational patterns. Combines the modeled cost of all open incidents within the selected timeframe." />
      <KpiCard metric={kpis.recoverableNow}   semantic="success"
        tooltip="Portion of total exposure that is potentially recoverable through targeted remediation, based on the configured recovery rate." />
      <KpiCard metric={kpis.activePatterns}   semantic="warning"
        tooltip="Number of distinct recurring problem patterns detected in this timeframe. Each pattern groups related incidents with shared signals." />
      <KpiCard metric={kpis.resolutionTime}   semantic="neutral"
        tooltip="Median time to resolve incidents across all patterns, calculated from resolved incidents within the selected timeframe." />
    </Flex>
  );
}
