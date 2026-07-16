import { ConfidenceLevel, PatternTrendEnrichment, PersonaType as ModelPersonaType, Severity } from '../models';

export type PersonaType = ModelPersonaType;
export type ObjectiveType = 'cost_impact' | 'alert_optimization';

export type DisplayLevel = 'High' | 'Medium' | 'Low';
export type TrendDirection = 'Increasing' | 'Stable' | 'Decreasing';
export type PatternStatus = 'Open' | 'Resolved' | 'Mixed';
export type RecommendationPriority = 'Immediate' | 'Short term' | 'Strategic' | 'Monitor';
export type EvidenceValue = string | number | string[] | Record<string, string | number | string[]> | null;

export interface MetricCardViewModel {
  id: string;
  label: string;
  value: string;
  helper?: string;
  level?: DisplayLevel;
  selected?: boolean;
}

export interface ExecKPIs {
  openRiskExposure: MetricCardViewModel;
  recoverableNow: MetricCardViewModel;
  activePatterns: MetricCardViewModel;
  resolutionTime: MetricCardViewModel;
}

export interface SREKPIs {
  operationalDebt: MetricCardViewModel;
  automationCandidates: MetricCardViewModel;
  repeatOffenders: MetricCardViewModel;
  medianMttr: MetricCardViewModel;
}

export interface DeveloperKPIs {
  openErrors: MetricCardViewModel;
  servicesImpacted: MetricCardViewModel;
  needsInvestigation: MetricCardViewModel;
  medianResolutionTime: MetricCardViewModel;
}

export interface PatternRow {
  id: string;
  name: string;
  category: Severity | 'UNKNOWN';
  status: PatternStatus;
  costFormatted: string;
  recoverableFormatted: string;
  recurrenceCount: number;
  openProblemCount: number;
  totalProblemCount: number;
  blastRadius: number;
  affectedServices: string[];
  severity: DisplayLevel;
  priority: RecommendationPriority;
  trend: TrendDirection;
  evidenceQuality: DisplayLevel;
  evidenceQualityScore: number;
  investigationReadiness: DisplayLevel;
  investigationReadinessScore: number;
  rcaAvailability: 'Present' | 'Missing';
  rootCauseEntity?: string;
  primaryAction: string;
  lastSeen?: number;
}

export interface PatternTimelineBucket {
  label: string;
  count: number;
  startTime?: number;
  endTime?: number;
  estimated?: boolean;
}

export interface PatternDetail {
  id: string;
  title: string;
  businessImpact: {
    exposure: string;
    recoverableValue: string;
    openIncidents: number;
    affectedUsers: number;
  };
  technicalActionability: {
    remediationEffort: DisplayLevel;
    confidence: DisplayLevel;
    investigationFriction: DisplayLevel;
    evidenceQuality: DisplayLevel;
    investigationReadiness: DisplayLevel;
  };
  recurrence: {
    occurrences: number;
    trend: TrendDirection;
    timeline: PatternTimelineBucket[];
  };
  trendEnrichment?: PatternTrendEnrichment;
  trendObservation?: string | null;
  recommendedAction: string;
  assistContext: {
    persona: PersonaType;
    objective: ObjectiveType;
    problemIds: string[];
    evidence: Record<string, EvidenceValue>;
    lineage?: Record<string, { sourceField: string; transformation: string; fallbackUsed?: string; missingReason?: string }>;
  };
}

export interface WorkspaceViewModel<TKpis> {
  persona: PersonaType;
  objective: ObjectiveType;
  kpis: TKpis;
  patterns: PatternRow[];
  selectedPatternId: string | null;
  selectedPattern?: PatternDetail;
  rawProblemRecords?: Array<{
    id: string;
    title: string;
    status: string;
    category: string;
    exposure: string;
    users: number;
    duration: string;
    seen: string;
  }>;
  emptyState: {
    title: string;
    description: string;
    actionHint?: string;
  };
}

export function confidenceToDisplayLevel(level: ConfidenceLevel): DisplayLevel {
  return level === 'HIGH' ? 'High' : level === 'MEDIUM' ? 'Medium' : 'Low';
}
