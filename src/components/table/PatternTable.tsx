import React, { useMemo } from 'react';
import { DataTable, DataTableColumnDef } from '@dynatrace/strato-components/tables';
import { PatternRow } from '../../types/views';
import { SeverityChip, TrendChip, EvidenceChip, StatusChip, PriorityChip } from '../atoms/StatusChip';

const columns: DataTableColumnDef<PatternRow>[] = [
  {
    id: 'name',
    header: 'Pattern',
    accessor: 'name',
    width: '2fr',
  },
  {
    id: 'cost',
    header: 'Cost',
    accessor: 'costFormatted',
    width: 'content',
  },
  {
    id: 'recur',
    header: 'Recurrences',
    accessor: 'recurrenceCount',
    width: 'content',
  },
  {
    id: 'blast',
    header: 'Blast radius',
    accessor: 'blastRadius',
    width: 'content',
  },
  {
    id: 'severity',
    header: 'Severity',
    accessor: 'severity',
    width: 'content',
    cell: ({ value }) => <SeverityChip value={value as PatternRow['severity']} />,
  },
  {
    id: 'trend',
    header: 'Trend',
    accessor: 'trend',
    width: 'content',
    cell: ({ value }) => <TrendChip value={value as PatternRow['trend']} />,
  },
  {
    id: 'evidence',
    header: 'Evidence',
    accessor: 'evidenceQuality',
    width: 'content',
    cell: ({ value }) => <EvidenceChip value={value as PatternRow['evidenceQuality']} />,
  },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    width: 'content',
    cell: ({ value }) => <StatusChip value={value as PatternRow['status']} />,
  },
  {
    id: 'priority',
    header: 'Priority',
    accessor: 'priority',
    width: 'content',
    cell: ({ value }) => <PriorityChip value={value as PatternRow['priority']} />,
  },
];

interface PatternTableProps {
  data: PatternRow[];
  sortable?: boolean;
}

export function PatternTable({ data, sortable = true }: PatternTableProps) {
  const memoData = useMemo(() => data, [data]);
  const memoColumns = useMemo(() => columns, []);

  return (
    <DataTable
      data={memoData}
      columns={memoColumns}
      fullWidth
      sortable={sortable}
    />
  );
}
