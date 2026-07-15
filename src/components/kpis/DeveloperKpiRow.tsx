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
      <KpiCard metric={kpis.openErrors}            semantic="danger"
        tooltip="Total number of open problems across all detected patterns in the selected scope. Counts all severity categories, not only errors." />
      <KpiCard metric={kpis.servicesImpacted}      semantic="warning"
        tooltip="Number of unique services or endpoints appearing across all pattern groups in the selected scope. Indicates the breadth of current operational risk." />
      <KpiCard metric={kpis.needsInvestigation}    semantic="warning"
        tooltip="Patterns with missing root cause analysis or low evidence quality. These require active investigation before remediation can be planned." />
      <KpiCard metric={kpis.medianResolutionTime}  semantic="neutral"
        tooltip="Median time to resolve incidents across all patterns in the selected scope, calculated from resolved incidents within the selected timeframe." />
    </Flex>
  );
}
