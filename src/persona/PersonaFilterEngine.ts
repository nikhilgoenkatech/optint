// ============================================================
// PERSONA FILTER ENGINE
// Controls what data each persona sees, how it's ranked,
// what terminology is used, and which columns are visible
// ============================================================

import { DynatraceProblem, Severity } from '../models';
import { PersonaType } from './PersonaResolver';

// ------------------------------------
// Noise rules — what executives should NOT see
// ------------------------------------
const EXEC_NOISE_TITLES = [
  'cpu spike', 'gc pause', 'garbage collection', 'disk i/o',
  'oomkilled', 'container restart', 'pod eviction', 'node pressure',
  'jvm heap', 'thread pool', 'connection refused', 'dns resolution',
  'network latency: cross-region',  // infra-level, not customer-facing
];

const EXEC_NOISE_SEVERITIES: Severity[] = ['RESOURCE_CONTENTION', 'CUSTOM_ALERT'];

function isNoisyForExec(p: DynatraceProblem): boolean {
  const titleLower = p.title.toLowerCase();
  if (EXEC_NOISE_SEVERITIES.includes(p.severity) && (p.affectedUsers ?? 0) === 0) return true;
  if (EXEC_NOISE_TITLES.some(n => titleLower.includes(n))) return true;
  return false;
}

function isNoisyForDeveloper(p: DynatraceProblem): boolean {
  // Developers see almost everything except pure infra disk/network at host level
  const titleLower = p.title.toLowerCase();
  if (titleLower.includes('disk i/o') && (p.affectedUsers ?? 0) === 0) return true;
  return false;
}

// ------------------------------------
// Filter by persona
// ------------------------------------
export function filterByPersona(
  problems: DynatraceProblem[],
  persona: PersonaType
): DynatraceProblem[] {
  switch (persona) {
    case 'executive':
      return problems.filter(p => !isNoisyForExec(p));
    case 'developer':
      return problems.filter(p => !isNoisyForDeveloper(p));
    case 'sre':
      return problems; // SRE sees everything
  }
}

// ------------------------------------
// Re-rank by persona priority
// ------------------------------------
export function rankByPersona(
  problems: DynatraceProblem[],
  persona: PersonaType
): DynatraceProblem[] {
  const sorted = [...problems];
  switch (persona) {
    case 'executive':
      // Rank by: affected users × duration (business impact first)
      return sorted.sort((a, b) =>
        ((b.affectedUsers ?? 0) * (b.duration ?? 1)) -
        ((a.affectedUsers ?? 0) * (a.duration ?? 1))
      );
    case 'developer':
      // Rank by: severity weight → recurrence score
      const sevW: Record<string, number> = { AVAILABILITY:5, ERROR:4, PERFORMANCE:3, RESOURCE_CONTENTION:2, CUSTOM_ALERT:1 };
      return sorted.sort((a, b) =>
        ((sevW[b.severity] ?? 0) + (b.recurrenceScore ?? 0) / 20) -
        ((sevW[a.severity] ?? 0) + (a.recurrenceScore ?? 0) / 20)
      );
    case 'sre':
      // Rank by: operational impact score
      return sorted.sort((a, b) => (b.operationalImpactScore ?? 0) - (a.operationalImpactScore ?? 0));
  }
}

// ------------------------------------
// Column visibility per persona
// ------------------------------------
export type ColumnId =
  | 'severity' | 'title' | 'businessTitle'
  | 'impactScore' | 'recurrenceScore'
  | 'cost' | 'affectedUsers' | 'duration' | 'mttr'
  | 'rootCause' | 'service' | 'status'
  | 'startTime' | 'sloImpact' | 'noiseFlag' | 'open';

export interface ColumnDef {
  id: ColumnId;
  label: string;
  sortable: boolean;
  width?: string;
}

export const PERSONA_COLUMNS: Record<PersonaType, ColumnDef[]> = {
  executive: [
    { id: 'businessTitle',  label: 'Business Incident',       sortable: true,  width: '320px' },
    { id: 'cost',           label: 'Est. Cost Impact',        sortable: true  },
    { id: 'affectedUsers',  label: 'Customers Affected',      sortable: true  },
    { id: 'duration',       label: 'Duration',                sortable: true  },
    { id: 'recurrenceScore',label: 'Recurrence Risk',         sortable: true  },
    { id: 'status',         label: 'Status',                  sortable: false },
  ],
  developer: [
    { id: 'severity',       label: 'Severity',                sortable: true  },
    { id: 'title',          label: 'Problem',                 sortable: false, width: '280px' },
    { id: 'service',        label: 'Service',                 sortable: true  },
    { id: 'rootCause',      label: 'Root Cause',              sortable: false },
    { id: 'mttr',           label: 'MTTR',                    sortable: true  },
    { id: 'recurrenceScore',label: 'Recurrence',              sortable: true  },
    { id: 'affectedUsers',  label: 'Users Hit',               sortable: true  },
    { id: 'open',           label: 'Trace',                   sortable: false },
  ],
  sre: [
    { id: 'severity',       label: 'Severity',                sortable: true  },
    { id: 'title',          label: 'Problem',                 sortable: false, width: '260px' },
    { id: 'impactScore',    label: 'Impact',                  sortable: true  },
    { id: 'recurrenceScore',label: 'Recurrence',              sortable: true  },
    { id: 'cost',           label: 'Est. Cost',               sortable: true  },
    { id: 'mttr',           label: 'MTTR',                    sortable: true  },
    { id: 'affectedUsers',  label: 'Users',                   sortable: true  },
    { id: 'rootCause',      label: 'Root Cause',              sortable: false },
    { id: 'noiseFlag',      label: 'Noise?',                  sortable: false },
    { id: 'startTime',      label: 'Start',                   sortable: true  },
    { id: 'open',           label: 'Open',                    sortable: false },
  ],
};

// ------------------------------------
// Business-friendly title rewriting (exec view)
// ------------------------------------
const TITLE_REWRITE: Array<[RegExp, string]> = [
  [/response time degradation on \/api\/checkout/i,       'Checkout Experience Degraded'],
  [/high failure rate on payment-gateway/i,               'Payment Processing Failures'],
  [/service unavailability: auth-service/i,               'Login & Authentication Outage'],
  [/slow database queries detected: product-catalog/i,    'Product Search Performance Impact'],
  [/external api timeout: shipping-provider/i,            'Order Shipping Estimate Delays'],
  [/high gc pause rate: search-indexer/i,                 'Search & Discovery Performance Drop'],
  [/memory leak detected: recommendation-engine/i,        'Personalisation Engine Degraded'],
  [/network latency: cross-region replication/i,          'Regional Service Connectivity Issue'],
  [/container oomkilled: session-service/i,               'User Session Interruption'],
  [/disk i\/o saturation: log-aggregator/i,               'Platform Logging Disruption'],
  [/cpu spike on inventory-service/i,                     'Inventory System Performance Issue'],
];

export function getBusinessTitle(title: string): string {
  for (const [pattern, replacement] of TITLE_REWRITE) {
    if (pattern.test(title)) return replacement;
  }
  return title; // fallback: use original
}

// ------------------------------------
// Persona metadata
// ------------------------------------
export interface PersonaMeta {
  label: string;
  icon: string;
  color: string;
  accentColor: string;
  description: string;
  kpiLabels: { total: string; metric1: string; metric2: string; metric3: string };
}

export const PERSONA_META: Record<PersonaType, PersonaMeta> = {
  executive: {
    label: 'Executive',
    icon: '👔',
    color: '#4db8ff',
    accentColor: 'rgba(77,184,255,0.15)',
    description: 'Business impact view — customer-facing incidents only',
    kpiLabels: {
      total:   'Revenue at Risk',
      metric1: 'Customers Affected',
      metric2: 'Avg Resolution Time',
      metric3: 'Recurring Issues',
    },
  },
  developer: {
    label: 'Developer',
    icon: '💻',
    color: '#3dd68c',
    accentColor: 'rgba(61,214,140,0.15)',
    description: 'Engineering view — service errors, root causes, traces',
    kpiLabels: {
      total:   'Active Problems',
      metric1: 'Services Affected',
      metric2: 'Missing Root Cause',
      metric3: 'Avg MTTR',
    },
  },
  sre: {
    label: 'SRE / Platform',
    icon: '🔧',
    color: '#9b8fe4',
    accentColor: 'rgba(155,143,228,0.15)',
    description: 'Full operational view — all signals, noise analysis, SLO impact',
    kpiLabels: {
      total:   'Total Problems',
      metric1: 'Open Now',
      metric2: 'Noisy Alerts',
      metric3: 'P95 MTTR',
    },
  },
};
