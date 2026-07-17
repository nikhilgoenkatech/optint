import { PatternDetail, PatternRow, ExecKPIs, SREKPIs, DeveloperKPIs } from '../types/views';

export const samplePatternRows: PatternRow[] = [
  {
    id: 'pat-browser-monitor-global-outage',
    name: 'Browser monitor global outage',
    category: 'AVAILABILITY',
    status: 'Open',
    costFormatted: '$2.0K',
    recoverableFormatted: '$715',
    recurrenceCount: 9,
    openProblemCount: 9,
    totalProblemCount: 9,
    blastRadius: 24,
    affectedServices: ['CustomerFrontendREST', 'Browser monitor'],
    severity: 'High',
    priority: 'Immediate',
    trend: 'Stable',
    evidenceQuality: 'Medium',
    evidenceQualityScore: 0.6,
    investigationReadiness: 'Medium',
    investigationReadinessScore: 0.62,
    rcaAvailability: 'Missing',
    primaryAction: 'Review recurring browser monitor availability impact and define ownership.',
    lastSeen: Date.parse('2026-06-30T14:00:00Z'),
    avgMttr: 30,
    autoResolveRate: 0.1,
  },
  {
    id: 'pat-activegate-token-expiry',
    name: 'ActiveGate Token(s) will expire soon',
    category: 'CUSTOM_ALERT',
    status: 'Mixed',
    costFormatted: '$420',
    recoverableFormatted: '$147',
    recurrenceCount: 2,
    openProblemCount: 1,
    totalProblemCount: 2,
    blastRadius: 2,
    affectedServices: ['ActiveGate'],
    severity: 'Low',
    priority: 'Monitor',
    trend: 'Stable',
    evidenceQuality: 'High',
    evidenceQualityScore: 0.9,
    investigationReadiness: 'High',
    investigationReadinessScore: 0.86,
    rcaAvailability: 'Present',
    rootCauseEntity: 'ActiveGate',
    primaryAction: 'Route certificate ownership and validate renewal workflow.',
    lastSeen: Date.parse('2026-06-28T09:00:00Z'),
    avgMttr: 45,
    autoResolveRate: 0.2,
  },
  {
    id: 'pat-failure-rate-increase',
    name: 'Failure rate increase',
    category: 'ERROR',
    status: 'Resolved',
    costFormatted: '$1.1K',
    recoverableFormatted: '$385',
    recurrenceCount: 4,
    openProblemCount: 0,
    totalProblemCount: 4,
    blastRadius: 5,
    affectedServices: ['CustomerFrontendREST'],
    severity: 'Medium',
    priority: 'Short term',
    trend: 'Increasing',
    evidenceQuality: 'Low',
    evidenceQualityScore: 0.3,
    investigationReadiness: 'Low',
    investigationReadinessScore: 0.35,
    rcaAvailability: 'Missing',
    primaryAction: 'Improve evidence quality before recommending a remediation path.',
    lastSeen: Date.parse('2026-06-25T10:00:00Z'),
    avgMttr: 20,
    autoResolveRate: 0.5,
  },
];

export const emptyPatternRows: PatternRow[] = [];

export const mixedCategoryPatternRows: PatternRow[] = samplePatternRows;

export const lowEvidencePatternRows: PatternRow[] = samplePatternRows.filter(row => row.evidenceQuality === 'Low');

export const samplePatternDetail: PatternDetail = {
  id: samplePatternRows[0].id,
  title: samplePatternRows[0].name,
  businessImpact: {
    exposure: samplePatternRows[0].costFormatted,
    recoverableValue: samplePatternRows[0].recoverableFormatted,
    openIncidents: samplePatternRows[0].openProblemCount,
    affectedUsers: 0,
  },
  technicalActionability: {
    remediationEffort: 'Medium',
    confidence: 'Medium',
    investigationFriction: 'Medium',
    evidenceQuality: 'Medium',
    investigationReadiness: 'Medium',
  },
  recurrence: {
    occurrences: samplePatternRows[0].recurrenceCount,
    trend: 'Stable',
    timeline: [
      { label: '7d', count: 1 },
      { label: '5d', count: 1 },
      { label: '3d', count: 1 },
      { label: '2d', count: 2 },
      { label: 'now', count: 4 },
    ],
  },
  recommendedAction: samplePatternRows[0].primaryAction,
  assistContext: {
    persona: 'executive',
    objective: 'cost_impact',
    problemIds: ['P-1001', 'P-1002', 'P-1003'],
    evidence: {
      occurrence_count: 9,
      alert_event_count: 9,
      operational_cost: 2044,
      affected_users: 0,
      affected_entity_count: 24,
      affected_services: ['CustomerFrontendREST', 'Browser monitor'],
      event_category: 'AVAILABILITY',
      trend: 'STABLE',
      rca_availability: 'Missing',
      root_cause_entity: null,
    },
  },
};

export const sampleExecKPIs: ExecKPIs = {
  openRiskExposure:  { id: 'exec-risk',       label: 'Open risk exposure',  value: '$3.5K',   helper: 'Across 3 active patterns', level: 'High' },
  recoverableNow:    { id: 'exec-recover',     label: 'Recoverable now',     value: '$1.2K',   helper: '35% of exposure',          level: 'Medium' },
  activePatterns:    { id: 'exec-patterns',    label: 'Active patterns',     value: '3',       helper: '1 critical, 2 stable' },
  resolutionTime:    { id: 'exec-resolution',  label: 'Avg resolution time', value: '4.2 days',helper: 'Last 30 days' },
};

export const sampleSREKPIs: SREKPIs = {
  operationalDebt:       { id: 'sre-debt',        label: 'Operational debt',      value: '14 h/wk', helper: 'Engineer hours lost to recurring alerts', level: 'High' },
  automationCandidates:  { id: 'sre-automation',  label: 'Automation candidates', value: '2',       helper: 'Patterns with high evidence quality' },
  repeatOffenders:       { id: 'sre-repeat',      label: 'Repeat offenders',      value: '1',       helper: 'Fired 4+ times in 30 days',              level: 'Medium' },
  medianMttr:            { id: 'sre-mttr',         label: 'Median MTTR',           value: '2.1 days',helper: 'Across open patterns' },
};

export const sampleDeveloperKPIs: DeveloperKPIs = {
  openErrors:            { id: 'dev-errors',       label: 'Open errors',           value: '9',       helper: 'Browser monitor + failure rate',         level: 'High' },
  servicesImpacted:      { id: 'dev-services',     label: 'Services impacted',     value: '2',       helper: 'CustomerFrontendREST, Browser monitor' },
  needsInvestigation:    { id: 'dev-investigate',  label: 'Needs investigation',   value: '1',       helper: 'Low evidence quality',                   level: 'Medium' },
  medianResolutionTime:  { id: 'dev-resolution',   label: 'Median resolution time',value: '3.5 days',helper: 'Last 30 days' },
};
