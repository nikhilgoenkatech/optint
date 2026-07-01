// ============================================================
// DYNATRACE OPERATIONAL INTELLIGENCE - DATA MODELS
// ============================================================

export type Severity =
  | 'AVAILABILITY'
  | 'ERROR'
  | 'PERFORMANCE'
  | 'RESOURCE_CONTENTION'
  | 'CUSTOM_ALERT';

export type ProblemStatus = 'OPEN' | 'RESOLVED' | 'CLOSED';
export type PersonaType   = 'executive' | 'developer' | 'sre';
export type CloudProvider = 'aws' | 'azure' | 'gcp' | null;
export type ProblemType   = 'RESOURCE' | 'CONFIG' | 'CODE_DEFECT' | 'DEPENDENCY' | 'UNKNOWN';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type SystemDirection = 'IMPROVING' | 'STABLE' | 'DEGRADING';

// ── Core problem entity ────────────────────────────────────
export interface DynatraceProblem {
  problemId:           string;
  title:               string;
  businessTitle?:      string;   // exec-friendly rewrite
  status:              ProblemStatus;
  severity:            Severity;
  startTime:           number;   // epoch ms
  endTime?:            number;
  duration?:           number;   // minutes
  impactedEntities:    Entity[];
  rootCauseEntity?:    Entity;
  affectedUsers?:      number;
  managementZones:     string[];
  tags:                string[];
  evidenceDetails?:    EvidenceDetail[];
  linkedTickets?:      LinkedTicket[];
  hasRootCause:        boolean;
  recurrenceScore?:    number;   // 0–100
  operationalImpactScore?: number;
  problemUrl?:         string;
  // Infrastructure context (from entity metadata)
  cloud?:              CloudProvider;
  region?:             string;
  isKubernetes?:       boolean;
}

export interface Entity {
  entityId: string;
  name:     string;
  type:
    | 'SERVICE'
    | 'APPLICATION'
    | 'HOST'
    | 'PROCESS_GROUP'
    | 'CUSTOM_DEVICE'
    | 'SYNTHETIC_TEST'
    | 'KUBERNETES_CLUSTER';
  tags?:      string[];
  teamOwner?: string;
}

export interface EvidenceDetail {
  evidenceType:
    | 'AVAILABILITY_EVIDENCE'
    | 'USER_DEFINED_EVIDENCE'
    | 'ROOT_CAUSE_EVIDENCE'
    | 'TRANSACTIONAL_EVIDENCE'
    | 'METRIC_EVIDENCE'
    | 'EVENT_EVIDENCE';
  displayName:        string;
  entity:             Entity;
  rootCauseRelevant:  boolean;
  startTime:          number;
}

// ── ServiceNow linked ticket ───────────────────────────────
// Source: Dynatrace Problems API → linkedTickets field
// Populated automatically when Dynatrace ↔ ServiceNow integration is active
export interface LinkedTicket {
  ticketId:    string;   // e.g. "INC0043821"
  url:         string;   // ServiceNow direct URL
  status:      'open' | 'in_progress' | 'resolved' | 'closed';
  assignee?:   string;
  team?:       string;
  openedAt:    number;   // epoch ms
  resolvedAt?: number;
}

// ── Pattern detection ──────────────────────────────────────
export interface ProblemPattern {
  patternId:        string;
  signature:        string;   // normalised title plus causal/entity fingerprint
  causalEntity:     string;
  dimensions:       PatternDimensions;
  title:            string;
  occurrences:      number;
  firstSeen:        number;
  lastSeen:         number;
  avgMTTR:          number;   // minutes
  maxMTTR:          number;
  totalCost:        number;
  totalUsers:       number;
  affectedServices: string[];
  severity:         Severity;
  problems:         DynatraceProblem[];
  trend:            'INCREASING' | 'STABLE' | 'DECREASING';
  concentration:    ConfidenceLevel;
  evidenceQuality:  ConfidenceLevel;
  investigationReadiness: ConfidenceLevel;
  fixability:       ConfidenceLevel;
  confidence:       ConfidenceLevel;
  recurrenceScore:  number;
  hasTimeCluster:   boolean;
  dominantHour?:    number;
  hasRCA:           boolean;
  autoResolveRate:  number;
  sparkData:        TrendPoint[];
  recommendation:   PatternRecommendation;
}

export interface PatternDimensions {
  rootCauseEntities: string[];
  causalEntities:    string[];
  impactedServices:  string[];
  managementZones:   string[];
  regions:           string[];
  clouds:            string[];
  severities:        Severity[];
  primaryRootCause:  string | null;
  primaryService:    string | null;
  primaryZone:       string | null;
  primaryRegion:     string | null;
  primaryCloud:      string | null;
  dimensionPurity:   number;
}

export type RecommendationType =
  | 'DISABLE_ALERT'
  | 'ADD_TIME_WINDOW'
  | 'RAISE_THRESHOLD'
  | 'FIX_ROOT_CAUSE'
  | 'INVESTIGATE_FIRST'
  | 'TUNE_FREQUENCY';

export interface PatternRecommendation {
  type:       RecommendationType;
  confidence: number;  // 0–100
  text:       string;
  config:     string;  // suggested config snippet
}

// ── Operational metrics (KPIs) ─────────────────────────────
export interface OperationalMetrics {
  totalProblems:      number;
  openProblems:       number;
  resolvedProblems:   number;
  repetitiveProblems: number;
  missingRCACount:    number;
  avgMTTR:            number;
  p95MTTR:            number;
  totalAffectedUsers: number;
  noisyAlertCount:    number;
  estimatedCost:      number;
  recurringWaste:     number;
  mttrTrend:          'IMPROVING' | 'DEGRADING' | 'STABLE';
}

// ── Application impact ─────────────────────────────────────
export interface ApplicationImpact {
  applicationId:        string;
  applicationName:      string;
  problemCount:         number;
  avgMTTR:              number;
  totalDowntimeMinutes: number;
  affectedUsers:        number;
  estimatedCost:        number;
  severityBreakdown:    Record<Severity, number>;
  trend:                'IMPROVING' | 'DEGRADING' | 'STABLE';
}

// ── Root cause cluster ─────────────────────────────────────
export interface RootCauseCluster {
  clusterId:      string;
  label:          string;
  count:          number;
  services:       string[];
  avgMTTR:        number;
  lastOccurrence: number;
  category:
    | 'MEMORY' | 'CPU' | 'NETWORK' | 'DATABASE'
    | 'DEPLOYMENT' | 'DEPENDENCY' | 'CONFIGURATION' | 'UNKNOWN';
}

// ── AI summarisation ───────────────────────────────────────
export type RecommendationStrength = 'Evidence-backed' | 'Candidate' | 'Data-gap';

export interface AIRecommendation {
  priority:               'IMMEDIATE' | 'SHORT_TERM' | 'STRATEGIC';
  title:                  string;
  recommendationStrength: RecommendationStrength;
  reason:                 string;
  dynatraceCapability:    string;
  effort:                 'Low' | 'Medium' | 'High' | 'Unknown';
  personaFit:             string;
  // legacy compat
  description?:           string;
  dynatraceFeature?:      string;
  estimatedImpact?:       string;
  owner?:                 string;
}

export interface AIDriver {
  signal:       string;
  value:        string;
  whyItMatters: string;
}

export interface AIRemediationContext {
  horizon:             'IMMEDIATE' | 'SHORT_TERM' | 'STRATEGIC';
  effortJustification: string;
  blockers:            string[];
}

export interface AISummary {
  objectiveAssessment:  string;
  drivers:              AIDriver[];
  recommendedActions:   AIRecommendation[];
  remediationContext?:  AIRemediationContext;
  risks:                string[];
  dataGaps:             string[];
  // legacy compat
  summary?:             string;
  patterns?:            string[];
  costNarrative?:       string;
  sloImpact?:           string;
  noiseAssessment?:     string;
  recommendations?:     AIRecommendation[];
  generatedBy:          'davis-copilot' | 'mock';
  latencyMs:            number;
}

// ── Cost model ─────────────────────────────────────────────
export interface CostEstimate {
  problemId:       string;
  revenueLoss:     number;
  engineeringCost: number;
  total:           number;
  breakdown:       string;
}

export interface CostConfig {
  revenuePerUserPerMinute: number;
  engineeringHourlyRate:   number;
  avgIncidentResponders:   number;
}

// ── Progress tracking ──────────────────────────────────────
export interface WeeklySnapshot {
  weekStart:      number;
  week:           string;  // display label e.g. "May 27"
  totalProblems:  number;
  avgMTTR:        number;
  recurringCount: number;
  missingRCA:     number;  // percentage
  estimatedCost:  number;
  noisyAlerts:    number;
}

export interface PatternHistoryRecord {
  id:               string;
  title:            string;
  technicalTitle:   string;
  firstFlagged:     number;
  severity:         Severity;
  recommendation:   RecommendationType;
  ticket:           LinkedTicket | null;
  occurrencesByWeek: number[];
  costByWeek:       number[];
  isRegressed:      boolean;
  rca:              string | null;
}

// ── Remediation ────────────────────────────────────────────
export interface InfrastructureContext {
  cloud:      CloudProvider;
  isKubernetes: boolean;
  isLinux:    boolean;
  region:     string | null;
  label:      string;
  chipClass:  string;
  icon:       string;
}

export interface RemediationOption {
  id:           string;
  icon:         string;
  label:        string;
  tier:         'auto' | 'semi' | 'manual';
  time:         string;
  desc:         string;
  confidence:   number;
  actionLabel:  string;
  actionClass:  string;
  recommended:  boolean;
  isLiveDebugger?: boolean;
}

// ── Filters ────────────────────────────────────────────────
export interface FilterState {
  timeRange:       TimeRange;
  applications:    string[];
  tags:            string[];
  managementZones: string[];
  severities:      Severity[];
  statuses:        ProblemStatus[];
  searchText:      string;
}

export interface TimeRange {
  from:  string;  // ISO or relative e.g. 'now-7d'
  to:    string;
  label: string;
}

// ── DQL result wrapper ─────────────────────────────────────
export interface DQLQueryResult<T> {
  records: T[];
  types:   Record<string, string>;
  metadata: {
    grailQueryId?:    string;
    executionTimeMs?: number;
    rowCount:         number;
  };
}

export interface TrendPoint {
  timestamp: number;
  value:     number;
  label?:    string;
}
