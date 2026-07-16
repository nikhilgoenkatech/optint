import type { PatternTrendEnrichment } from '../models';
import type { EvidenceValue, PatternDetail } from '../types/views';

type ExportPersona = 'sre' | 'developer' | string;
type ExportObjective = 'cost_impact' | 'alert_optimization' | string;

export type ActionPlanOutputs = {
  analysis?: unknown;
  remediation?: unknown;
  recommendations?: unknown;
};

export type ActionPlanExportInput = {
  persona: ExportPersona;
  objective: ExportObjective;
  timeWindow?: string | null;
  generatedAt?: string;
  applicationVersion?: string | null;
  tenant?: string | null;
  pattern: {
    id?: string | null;
    title?: string | null;
    problemIds?: string[];
  };
  patternDetail?: PatternDetail | null;
  observedSignals?: Record<string, EvidenceValue | undefined>;
  outputs: ActionPlanOutputs;
};

export type ObservedSignalExport = {
  signal: string;
  observedValue: string | number | string[] | null;
  interpretationBoundary: string;
};

export type RecommendedActionExport = {
  id: string | null;
  title: string | null;
  strength: string | null;
  priority: string | null;
  persona: string;
  capability: string | null;
  effort: string | null;
  rationale: string | null;
  supportingEvidence: string[];
  validationRequired: string[];
  completionEvidence: string[];
  expectedOperationalPurpose: string | null;
  suggestedOwner: string | null;
  dependencies: string[];
  status: 'proposed';
};

export type RemediationStepExport = {
  step: number;
  title: string | null;
  purpose: string | null;
  supportingEvidence: string[];
  capability: string | null;
  validationCheckpoint: string | null;
  expectedOutput: string | null;
  escalationCondition: string | null;
};

export type DataGapExport = {
  missingEvidence: string | null;
  whyItMatters: string | null;
  requiredValidation: string | null;
  relatedActionIds: string[];
};

export type CalibrateActionPlanExport = {
  schemaVersion: '1.0';
  sourceApplication: 'Calibrate';
  exportType: 'detailed_action_plan';
  generatedAt: string;
  reportContext: {
    persona: string;
    objective: string;
    timeWindow: string | null;
    applicationVersion: string | null;
    tenant: string | null;
  };
  pattern: {
    id: string | null;
    title: string | null;
    category: string | null;
    severity: string | null;
    status: string | null;
    occurrenceCount: number | null;
    firstObserved: string | null;
    lastObserved: string | null;
    averageDuration: string | null;
    medianDuration: string | null;
    maximumDuration: string | null;
    trend: string | null;
    recurrenceTier: string | null;
    costTier: string | null;
    impactTier: string | null;
    noiseLikelihood: string | null;
    recommendationType: string | null;
  };
  impact: {
    affectedUsers: number | null;
    affectedEntityCount: number | null;
    affectedServiceCount: number | null;
    observedServices: string[];
    observedEntities: string[];
    scopeTier: string | null;
    operationalCost: string | number | null;
    potentialSavings: string | number | null;
  };
  rootCauseContext: {
    rcaAvailability: string | null;
    rootCauseEntity: string | null;
    rcaValidated: false;
    validationStatement: string;
  };
  trendEnrichment?: PatternTrendEnrichment;
  observedSignals: ObservedSignalExport[];
  analysis: {
    summary: string | null;
    objectiveAssessment: string | null;
    drivers: Array<{ signal: string | null; value: string | null; whyItMatters: string | null }>;
    technicalInterpretation: string | null;
    operationalInterpretation: string | null;
  };
  recommendedActions: RecommendedActionExport[];
  remediationPath: RemediationStepExport[];
  dataGaps: DataGapExport[];
  jiraHandoff: {
    suggestedTitle: string | null;
    problemStatement: string | null;
    observedEvidence: string[];
    recommendedNextAction: string | null;
    acceptanceCriteria: string[];
    dataGaps: string[];
    suggestedLabels: string[];
  };
  evidenceBoundaries: {
    rcaCorrectnessValidated: false;
    hiddenDependenciesInferred: false;
    ownershipIssuesInferred: false;
    deploymentCausationInferred: false;
    futureOutcomesPredicted: false;
    unobservedSavingsCalculated: false;
    blastRadiusCompletenessValidated: false;
    remediationSuccessGuaranteed: false;
  };
  limitations: string[];
  disclaimer: string;
};

const DISCLAIMER = 'Calibrate recommendations are derived only from the observed signals included in this report. Missing evidence is treated as a data gap and not as evidence of a problem. Root-cause availability indicates whether a root-cause entity was supplied; it does not represent independent validation of RCA correctness.';
const STATIC_RECORD_STATEMENT = 'This report is an evidence-based operational decision record generated from the signals available to Calibrate at the time of analysis.';
const RCA_VALIDATION_STATEMENT = 'Calibrate does not independently validate RCA correctness.';

const SIGNAL_BOUNDARIES: Record<string, string> = {
  occurrence_count: 'Directly observed recurring problem count from the selected Calibrate pattern',
  alert_event_count: 'Observed alert/event count only; alert value was not independently validated',
  operational_cost: 'Modeled operational impact from configured assumptions and available Davis problem data',
  potential_savings: 'Modeled recoverable value from configured assumptions; not guaranteed savings',
  affected_users: 'Observed affected-user count only; missing users were not inferred',
  affected_entity_count: 'Observed affected entity count only; hidden dependencies were not inferred',
  affected_services: 'Observed affected service names/count only; hidden dependencies were not inferred',
  observed_service_names: 'Observed service names only',
  observed_entity_names: 'Observed entity names only',
  event_category: 'Observed Davis event category',
  scope_tier: 'Existing Calibrate scope classification',
  trend: 'Existing Calibrate trend classification',
  avg_duration: 'Calculated from observed problem duration data when available',
  recommendation_type: 'Existing Calibrate recommendation type classification',
  rca_availability: 'Root-cause entity availability only; RCA correctness was not independently validated',
  root_cause_entity: 'Root-cause entity supplied by Davis when available',
  recurrence_tier: 'Existing Calibrate recurrence classification',
  cost_tier: 'Existing Calibrate cost classification',
  impact_tier: 'Existing Calibrate impact classification',
  noise_likelihood: 'Existing Calibrate noise-likelihood classification',
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isInvalidNumber(value: unknown): boolean {
  return typeof value === 'number' && !Number.isFinite(value);
}

function cleanScalar(value: unknown): string | number | null {
  if (value === null || value === undefined || value === '') return null;
  if (isInvalidNumber(value)) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || /^(undefined|null|nan|n\/a)$/i.test(trimmed)) return null;
    return trimmed;
  }
  if (typeof value === 'object') return null;
  return String(value);
}

function cleanString(value: unknown): string | null {
  const scalar = cleanScalar(value);
  return scalar === null ? null : String(scalar);
}

function cleanStringOrNumber(value: unknown): string | number | null {
  const scalar = cleanScalar(value);
  return scalar === null ? null : scalar;
}

function cleanNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[$,\s]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

function cleanStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(cleanString).filter((item): item is string => Boolean(item));
  const scalar = cleanString(value);
  return scalar ? [scalar] : [];
}

function evidence(input: ActionPlanExportInput, key: string): string | number | string[] | null {
  const value = input.observedSignals?.[key];
  if (value && typeof value === 'object' && !Array.isArray(value)) return null;
  if (Array.isArray(value)) return cleanStringArray(value);
  return cleanScalar(value);
}

function titleCase(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

function displayValue(value: unknown, unavailable = 'Not available'): string {
  if (Array.isArray(value)) return value.length ? value.join(', ') : unavailable;
  const scalar = cleanScalar(value);
  return scalar === null ? unavailable : String(scalar);
}

function markdownEscape(value: unknown): string {
  return displayValue(value).replace(/\|/g, '\\|');
}

function firstNonNull<T>(...values: Array<T | null | undefined>): T | null {
  for (const value of values) {
    if (value !== null && value !== undefined) return value;
  }
  return null;
}

function actionFromRecord(
  record: Record<string, unknown>,
  index: number,
  persona: string,
  titleKey: 'title' | 'step' = 'title',
): RecommendedActionExport {
  const strength = cleanString(firstNonNull(record.recommendationStrength, record.strength));
  const priority = cleanString(record.priority);
  return {
    id: cleanString(record.id) ?? `action-${index + 1}`,
    title: cleanString(record[titleKey]),
    strength,
    priority,
    persona,
    capability: cleanString(firstNonNull(record.dynatraceCapability, record.capability)),
    effort: cleanString(record.effort),
    rationale: cleanString(firstNonNull(record.businessRationale, record.reason, record.purpose)),
    supportingEvidence: [
      ...cleanStringArray(record.evidenceUsed),
      ...cleanStringArray(record.evidence),
      ...cleanStringArray(record.supportingEvidence),
    ],
    validationRequired: cleanStringArray(firstNonNull(record.validationRequired, record.validationSteps, record.validationCheckpoint)),
    completionEvidence: cleanStringArray(record.completionEvidence),
    expectedOperationalPurpose: cleanString(firstNonNull(record.expectedOperationalPurpose, record.purpose)),
    suggestedOwner: cleanString(firstNonNull(record.owner, record.suggestedOwner)),
    dependencies: cleanStringArray(record.dependencies),
    status: 'proposed',
  };
}

function collectActions(output: unknown, persona: string): RecommendedActionExport[] {
  const record = asRecord(output);
  const items: RecommendedActionExport[] = [];
  const add = (item: unknown, titleKey: 'title' | 'step' = 'title') => {
    const action = typeof item === 'string'
      ? actionFromRecord({ title: item }, items.length, persona)
      : actionFromRecord(asRecord(item), items.length, persona, titleKey);
    if (action.title) items.push(action);
  };

  asArray(record.decisionOptions).forEach(item => add(item));
  asArray(record.preventionRecommendations).forEach(item => add(item));
  asArray(record.remediationCandidates).forEach(item => add(item));
  asArray(record.debuggingPath).forEach(item => add(item, 'step'));
  asArray(record.automationOpportunities).forEach(item => add(item));

  const legacyAction = asRecord(record.action);
  if (legacyAction.title || legacyAction.reason) add(legacyAction);

  return items;
}

function collectRemediationSteps(outputs: ActionPlanOutputs): RemediationStepExport[] {
  const source = [
    ...asArray(asRecord(outputs.remediation).remediationPath),
    ...asArray(asRecord(outputs.remediation).remediationSteps),
    ...asArray(asRecord(outputs.remediation).debuggingPath),
    ...asArray(asRecord(outputs.remediation).remediationCandidates),
  ];
  return source.map((item, index) => {
    const record = typeof item === 'string' ? { title: item } : asRecord(item);
    return {
      step: index + 1,
      title: cleanString(firstNonNull(record.title, record.step)),
      purpose: cleanString(firstNonNull(record.purpose, record.reason, record.rationale)),
      supportingEvidence: [
        ...cleanStringArray(record.evidenceUsed),
        ...cleanStringArray(record.evidence),
        ...cleanStringArray(record.supportingEvidence),
      ],
      capability: cleanString(firstNonNull(record.dynatraceCapability, record.capability)),
      validationCheckpoint: cleanString(firstNonNull(record.validationCheckpoint, record.validationRequired)),
      expectedOutput: cleanString(record.expectedOutput),
      escalationCondition: cleanString(firstNonNull(record.escalationCondition, record.stopCondition)),
    };
  }).filter(step => step.title || step.purpose || step.supportingEvidence.length);
}

function collectDataGaps(outputs: ActionPlanOutputs): DataGapExport[] {
  const gaps = new Map<string, DataGapExport>();
  Object.values(outputs).forEach(output => {
    const raw = asRecord(output).dataGaps;
    asArray(raw).forEach(item => {
      const record = asRecord(item);
      const missingEvidence = cleanString(typeof item === 'string' ? item : firstNonNull(record.missingEvidence, record.evidence, record.signal));
      if (!missingEvidence) return;
      gaps.set(missingEvidence, {
        missingEvidence,
        whyItMatters: cleanString(record.whyItMatters) ?? 'This is a data gap, not evidence that a problem exists.',
        requiredValidation: cleanString(firstNonNull(record.requiredValidation, record.validation, record.collect)) ?? 'Collect or confirm this evidence before treating dependent recommendations as confirmed.',
        relatedActionIds: cleanStringArray(record.relatedActionIds),
      });
    });
  });
  return [...gaps.values()].sort((a, b) => displayValue(a.missingEvidence).localeCompare(displayValue(b.missingEvidence)));
}

function collectSummary(outputs: ActionPlanOutputs, input: ActionPlanExportInput): string | null {
  const candidates = [
    asRecord(outputs.analysis).investigationSummary,
    asRecord(outputs.analysis).executiveSummary,
    asRecord(outputs.analysis).objectiveAssessment,
    asRecord(outputs.analysis).assessment,
    asRecord(outputs.recommendations).executiveSummary,
    asRecord(outputs.recommendations).objectiveAssessment,
    asRecord(outputs.recommendations).assessment,
    asRecord(outputs.remediation).investigationSummary,
    asRecord(outputs.remediation).objectiveAssessment,
    asRecord(outputs.remediation).assessment,
  ].map(cleanString).filter((value): value is string => Boolean(value));

  if (candidates.length) return candidates.join('\n\n');

  const patternTitle = input.pattern.title || 'the selected recurring pattern';
  const occurrenceCount = evidence(input, 'occurrence_count') ?? input.patternDetail?.recurrence.occurrences ?? null;
  const trend = evidence(input, 'trend') ?? input.patternDetail?.recurrence.trend ?? null;
  const cost = evidence(input, 'operational_cost') ?? input.patternDetail?.businessImpact.exposure ?? null;
  const gaps = collectDataGaps(input.outputs).map(gap => gap.missingEvidence).filter(Boolean);
  return `${patternTitle} was surfaced for ${input.objective}. Observed recurrence is ${displayValue(occurrenceCount)} with trend ${displayValue(trend)} and operational cost ${displayValue(cost)}. Primary limitation: ${gaps[0] ?? 'No Assist-identified limitation was available.'}`;
}

function collectDrivers(outputs: ActionPlanOutputs): CalibrateActionPlanExport['analysis']['drivers'] {
  const driverArrays = [
    asArray(asRecord(outputs.analysis).drivers),
    asArray(asRecord(outputs.recommendations).drivers),
    asArray(asRecord(outputs.remediation).drivers),
    asArray(asRecord(outputs.analysis).businessSignals),
    asArray(asRecord(outputs.analysis).reliabilitySignals),
  ].flat();
  return driverArrays.map(item => {
    const record = asRecord(item);
    return {
      signal: cleanString(record.signal),
      value: cleanString(record.value),
      whyItMatters: cleanString(firstNonNull(record.whyItMatters, record.recommendationStrength, record.evidence)),
    };
  }).filter(driver => driver.signal || driver.value || driver.whyItMatters);
}

function observedSignals(input: ActionPlanExportInput): ObservedSignalExport[] {
  const keys = Object.keys(input.observedSignals ?? {}).sort();
  return keys.flatMap(key => {
    const value = evidence(input, key);
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    if (value === null || isEmptyArray) return [];
    return [{
      signal: key,
      observedValue: value,
      interpretationBoundary: SIGNAL_BOUNDARIES[key] ?? 'Observed signal supplied to Calibrate; no additional inference was made during export',
    }];
  });
}

function mcpContext(model: CalibrateActionPlanExport) {
  return {
    schemaVersion: model.schemaVersion,
    sourceApplication: model.sourceApplication,
    exportType: model.exportType,
    persona: model.reportContext.persona,
    objective: model.reportContext.objective,
    pattern: model.pattern,
    observedSignals: model.observedSignals,
    analysisSummary: model.analysis.summary,
    recommendedActions: model.recommendedActions,
    remediationPath: model.remediationPath,
    dataGaps: model.dataGaps,
    evidenceBoundaries: model.evidenceBoundaries,
    generatedAt: model.generatedAt,
  };
}

function jiraLabels(model: CalibrateActionPlanExport): string[] {
  return [
    'calibrate',
    model.reportContext.persona,
    model.reportContext.objective,
    model.pattern.severity,
  ].map(value => sanitizeFilenamePart(value)).filter(Boolean);
}

function buildJiraHandoff(model: Omit<CalibrateActionPlanExport, 'jiraHandoff'>): CalibrateActionPlanExport['jiraHandoff'] {
  const firstAction = model.recommendedActions[0] ?? null;
  const evidenceLines = model.observedSignals.slice(0, 8).map(signal => `${signal.signal}: ${displayValue(signal.observedValue)}`);
  return {
    suggestedTitle: `[Calibrate][${model.reportContext.persona}][${model.reportContext.objective}] ${model.pattern.title ?? 'Selected pattern'}`,
    problemStatement: model.analysis.summary,
    observedEvidence: evidenceLines,
    recommendedNextAction: firstAction?.title ?? model.pattern.recommendationType,
    acceptanceCriteria: [
      'The recommendation has been validated against the listed evidence.',
      'Required data gaps have been addressed or documented.',
      'The implemented change has been tested.',
      'The result has been reviewed against subsequent pattern data.',
    ],
    dataGaps: model.dataGaps.map(gap => displayValue(gap.missingEvidence)),
    suggestedLabels: jiraLabels(model as CalibrateActionPlanExport),
  };
}

export function buildActionPlanExportModel(input: ActionPlanExportInput): CalibrateActionPlanExport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const detail = input.patternDetail;
  const services = cleanStringArray(firstNonNull(evidence(input, 'observed_service_names'), evidence(input, 'affected_services')));
  const entities = cleanStringArray(evidence(input, 'observed_entity_names'));
  const occurrenceCount = cleanNumber(firstNonNull(evidence(input, 'occurrence_count'), detail?.recurrence.occurrences));
  const actions = [
    ...collectActions(input.outputs.analysis, input.persona),
    ...collectActions(input.outputs.recommendations, input.persona),
    ...collectActions(input.outputs.remediation, input.persona),
  ];
  const modelWithoutJira: Omit<CalibrateActionPlanExport, 'jiraHandoff'> = {
    schemaVersion: '1.0',
    sourceApplication: 'Calibrate',
    exportType: 'detailed_action_plan',
    generatedAt,
    reportContext: {
      persona: input.persona,
      objective: input.objective,
      timeWindow: cleanString(input.timeWindow),
      applicationVersion: cleanString(input.applicationVersion),
      tenant: cleanString(input.tenant),
    },
    pattern: {
      id: cleanString(input.pattern.id),
      title: cleanString(input.pattern.title),
      category: cleanString(evidence(input, 'event_category')),
      severity: cleanString(evidence(input, 'severity')),
      status: cleanString(evidence(input, 'status')),
      occurrenceCount,
      firstObserved: cleanString(firstNonNull(evidence(input, 'first_observed'), detail?.recurrence.timeline?.[0]?.label)),
      lastObserved: cleanString(firstNonNull(evidence(input, 'last_observed'), detail?.recurrence.timeline?.[detail.recurrence.timeline.length - 1]?.label)),
      averageDuration: cleanString(firstNonNull(evidence(input, 'avg_duration'), evidence(input, 'average_duration'))),
      medianDuration: cleanString(evidence(input, 'median_duration')),
      maximumDuration: cleanString(evidence(input, 'max_duration')),
      trend: cleanString(firstNonNull(evidence(input, 'trend'), detail?.recurrence.trend)),
      recurrenceTier: cleanString(evidence(input, 'recurrence_tier')),
      costTier: cleanString(evidence(input, 'cost_tier')),
      impactTier: cleanString(evidence(input, 'impact_tier')),
      noiseLikelihood: cleanString(evidence(input, 'noise_likelihood')),
      recommendationType: cleanString(evidence(input, 'recommendation_type')),
    },
    impact: {
      affectedUsers: cleanNumber(firstNonNull(evidence(input, 'affected_users'), detail?.businessImpact.affectedUsers)),
      affectedEntityCount: cleanNumber(evidence(input, 'affected_entity_count')),
      affectedServiceCount: services.length || cleanNumber(evidence(input, 'affected_service_count')),
      observedServices: services,
      observedEntities: entities,
      scopeTier: cleanString(evidence(input, 'scope_tier')),
      operationalCost: cleanStringOrNumber(firstNonNull(evidence(input, 'operational_cost'), detail?.businessImpact.exposure)),
      potentialSavings: cleanStringOrNumber(firstNonNull(evidence(input, 'potential_savings'), detail?.businessImpact.recoverableValue)),
    },
    rootCauseContext: {
      rcaAvailability: cleanString(evidence(input, 'rca_availability')),
      rootCauseEntity: cleanString(evidence(input, 'root_cause_entity')),
      rcaValidated: false,
      validationStatement: RCA_VALIDATION_STATEMENT,
    },
    trendEnrichment: detail?.trendEnrichment,
    observedSignals: observedSignals(input),
    analysis: {
      summary: collectSummary(input.outputs, input),
      objectiveAssessment: cleanString(firstNonNull(
        asRecord(input.outputs.analysis).objectiveAssessment,
        asRecord(input.outputs.recommendations).objectiveAssessment,
        asRecord(input.outputs.remediation).objectiveAssessment,
      )),
      drivers: collectDrivers(input.outputs),
      technicalInterpretation: cleanString(firstNonNull(
        asRecord(input.outputs.analysis).technicalInterpretation,
        asRecord(input.outputs.remediation).technicalInterpretation,
      )),
      operationalInterpretation: cleanString(firstNonNull(
        asRecord(input.outputs.analysis).operationalInterpretation,
        asRecord(input.outputs.recommendations).operationalInterpretation,
      )),
    },
    recommendedActions: actions,
    remediationPath: collectRemediationSteps(input.outputs),
    dataGaps: collectDataGaps(input.outputs),
    evidenceBoundaries: {
      rcaCorrectnessValidated: false,
      hiddenDependenciesInferred: false,
      ownershipIssuesInferred: false,
      deploymentCausationInferred: false,
      futureOutcomesPredicted: false,
      unobservedSavingsCalculated: false,
      blastRadiusCompletenessValidated: false,
      remediationSuccessGuaranteed: false,
    },
    limitations: [
      'Analysis is based on the selected time window.',
      'Only signals available to Calibrate were considered.',
      'Missing evidence was not interpreted as evidence of a problem.',
      'Recommendations should be validated in the receiving team environment.',
      'This report is not proof that a remediation will succeed.',
      'This report is not an independent RCA validation.',
    ],
    disclaimer: DISCLAIMER,
  };
  return {
    ...modelWithoutJira,
    jiraHandoff: buildJiraHandoff(modelWithoutJira),
  };
}

function markdownList(items: string[], fallback = '- Not available'): string {
  return items.length ? items.map(item => `- ${item}`).join('\n') : fallback;
}

function contextValue(value: unknown, unavailable = 'Not available'): string {
  return displayValue(value, unavailable);
}

function actionMarkdown(action: RecommendedActionExport): string {
  return [
    `### Action: ${contextValue(action.title)}`,
    '',
    `- Recommendation strength: ${contextValue(action.strength)}`,
    `- Priority: ${contextValue(action.priority)}`,
    `- Persona: ${action.persona}`,
    `- Dynatrace capability: ${contextValue(action.capability)}`,
    `- Effort: ${contextValue(action.effort)}`,
    `- Why this action is recommended: ${contextValue(action.rationale)}`,
    `- Supporting evidence: ${action.supportingEvidence.length ? action.supportingEvidence.join('; ') : 'Not available'}`,
    `- Expected operational purpose: ${contextValue(action.expectedOperationalPurpose)}`,
    `- Validation required: ${action.validationRequired.length ? action.validationRequired.join('; ') : 'Validate against the observed evidence listed in this report.'}`,
    `- Suggested owner: ${contextValue(action.suggestedOwner)}`,
    `- Dependencies: ${action.dependencies.length ? action.dependencies.join('; ') : 'Not available'}`,
    `- Completion evidence: ${action.completionEvidence.length ? action.completionEvidence.join('; ') : 'Recommendation validated, tested, and reviewed against subsequent pattern data.'}`,
    '- Status: Proposed',
  ].join('\n');
}

function remediationMarkdown(step: RemediationStepExport): string {
  return [
    `### Step ${step.step} - ${contextValue(step.title)}`,
    '',
    `- Purpose: ${contextValue(step.purpose)}`,
    `- Supporting evidence: ${step.supportingEvidence.length ? step.supportingEvidence.join('; ') : 'Not available'}`,
    `- Dynatrace capability: ${contextValue(step.capability)}`,
    `- Validation checkpoint: ${contextValue(step.validationCheckpoint, 'Validate this step against the observed evidence before implementation.')}`,
    `- Expected output: ${contextValue(step.expectedOutput)}`,
    `- Stop or escalation condition: ${contextValue(step.escalationCondition)}`,
  ].join('\n');
}

function trendEvidenceMarkdown(model: CalibrateActionPlanExport): string {
  const trend = model.trendEnrichment;
  if (!trend) return '- Not available';
  const lines: string[] = [];
  if (trend.creationRate && trend.creationRate.direction !== 'insufficient_data') {
    lines.push(`- Creation rate: ${trend.creationRate.direction}${trend.creationRate.deltaPercent !== undefined ? ` (${trend.creationRate.deltaPercent}% change)` : ''}`);
  }
  if (trend.lifecycle && trend.lifecycle.currentlyActive > 0) {
    lines.push(`- Lifecycle: ${trend.lifecycle.currentlyActive} currently active; peak concurrent active ${contextValue(trend.lifecycle.peakConcurrentActive)}`);
  }
  if (trend.schedulePattern?.label) {
    lines.push(`- Timing evidence: ${trend.schedulePattern.label}`);
  }
  if (trend.mttrTrend && trend.mttrTrend.direction !== 'insufficient_data') {
    lines.push(`- Median MTTR trend: ${trend.mttrTrend.direction}${trend.mttrTrend.deltaPercent !== undefined ? ` (${trend.mttrTrend.deltaPercent}% median change)` : ''}; current median ${contextValue(trend.mttrTrend.medianCurrent)}m; current p85 ${contextValue(trend.mttrTrend.p85Current)}m`);
  }
  if (trend.userImpactTrend?.source === 'affected_users' && trend.userImpactTrend.direction !== 'insufficient_data') {
    lines.push(`- Affected-user trend: ${trend.userImpactTrend.direction}${trend.userImpactTrend.deltaPercent !== undefined ? ` (${trend.userImpactTrend.deltaPercent}% change)` : ''}`);
  }
  trend.dataQuality.limitations.slice(0, 3).forEach(limitation => lines.push(`- Limitation: ${limitation}`));
  return lines.length ? lines.join('\n') : '- No supported trend observations were available.';
}

export function buildMcpContext(model: CalibrateActionPlanExport) {
  return mcpContext(model);
}

export function buildDetailedActionPlanMarkdown(model: CalibrateActionPlanExport): string {
  const mcp = JSON.stringify(buildMcpContext(model), null, 2);
  const observedEvidence = model.observedSignals.map(signal =>
    `| ${markdownEscape(signal.signal)} | ${markdownEscape(signal.observedValue)} | ${markdownEscape(signal.interpretationBoundary)} |`
  );
  const surfacedSignals = [
    model.pattern.recurrenceTier ? `recurrence tier ${model.pattern.recurrenceTier}` : '',
    model.pattern.costTier ? `cost tier ${model.pattern.costTier}` : '',
    model.pattern.impactTier ? `impact tier ${model.pattern.impactTier}` : '',
    model.pattern.noiseLikelihood ? `noise likelihood ${model.pattern.noiseLikelihood}` : '',
    model.pattern.trend ? `trend ${model.pattern.trend}` : '',
    model.pattern.recommendationType ? `recommendation type ${model.pattern.recommendationType}` : '',
  ].filter(Boolean);
  const timeline = model.pattern.occurrenceCount
    ? `- Occurrences in selected window: ${model.pattern.occurrenceCount}`
    : '- Occurrences in selected window: Not calculated';
  const dataGaps = model.dataGaps.length
    ? model.dataGaps.map(gap => [
      `### ${contextValue(gap.missingEvidence)}`,
      `- Why it matters: ${contextValue(gap.whyItMatters)}`,
      `- What should be collected or confirmed: ${contextValue(gap.requiredValidation)}`,
      `- Related actions: ${gap.relatedActionIds.length ? gap.relatedActionIds.join(', ') : 'Not available'}`,
      '- Boundary: This is a data gap, not evidence that a problem exists.',
    ].join('\n')).join('\n\n')
    : '- No Assist-identified data gaps were available.';

  return `# Calibrate Operational Action Plan

## 1. Report Context

- Report title: Calibrate Operational Action Plan
- Application: ${model.sourceApplication}
- Export type: Detailed Action Plan
- Persona: ${model.reportContext.persona}
- Active objective: ${model.reportContext.objective}
- Generated date and time: ${model.generatedAt}
- Selected analysis window: ${contextValue(model.reportContext.timeWindow)}
- Calibrate application version: ${contextValue(model.reportContext.applicationVersion)}
- Environment or tenant identifier: ${contextValue(model.reportContext.tenant)}
- Pattern title: ${contextValue(model.pattern.title)}
- Pattern identifier: ${contextValue(model.pattern.id)}
- Current pattern status: ${contextValue(model.pattern.status)}
- Report schema version: ${model.schemaVersion}

${STATIC_RECORD_STATEMENT}

## 2. Executive Summary

${contextValue(model.analysis.summary)}

## 3. Pattern Overview

- Pattern title: ${contextValue(model.pattern.title)}
- Pattern ID: ${contextValue(model.pattern.id)}
- Pattern category: ${contextValue(model.pattern.category)}
- Severity: ${contextValue(model.pattern.severity)}
- Number of occurrences: ${contextValue(model.pattern.occurrenceCount, 'Not calculated')}
- First observed: ${contextValue(model.pattern.firstObserved)}
- Last observed: ${contextValue(model.pattern.lastObserved)}
- Current or resolved status: ${contextValue(model.pattern.status)}
- Average duration: ${contextValue(model.pattern.averageDuration)}
- Median duration: ${contextValue(model.pattern.medianDuration, 'Not calculated')}
- Maximum duration: ${contextValue(model.pattern.maximumDuration, 'Not calculated')}
- Recurrence classification: ${contextValue(model.pattern.recurrenceTier)}
- Trend: ${contextValue(model.pattern.trend)}
- Recommendation type: ${contextValue(model.pattern.recommendationType)}
- Root-cause entity: ${contextValue(model.rootCauseContext.rootCauseEntity, 'Not observed')}
- RCA availability: ${contextValue(model.rootCauseContext.rcaAvailability)}
- Affected users: ${contextValue(model.impact.affectedUsers, 'Not observed')}
- Affected entity count: ${contextValue(model.impact.affectedEntityCount, 'Not observed')}
- Affected service count: ${contextValue(model.impact.affectedServiceCount, 'Not observed')}
- Observed service names: ${model.impact.observedServices.length ? model.impact.observedServices.join(', ') : 'Not observed'}
- Observed entity names: ${model.impact.observedEntities.length ? model.impact.observedEntities.join(', ') : 'Not observed'}
- Scope tier: ${contextValue(model.impact.scopeTier)}
- Operational cost: ${contextValue(model.impact.operationalCost, 'Not calculated')}
- Potential savings: ${contextValue(model.impact.potentialSavings, 'Not calculated')}

## 4. Why Calibrate Surfaced This Pattern

- Active objective: ${model.reportContext.objective}
- Ranking context: ${surfacedSignals.length ? surfacedSignals.join('; ') : 'No exported ranking tier was available.'}
- Explanation: This pattern was surfaced from existing Calibrate classifications and observed signals. No new weighted score was calculated during export.

## 5. Observed Evidence

| Signal | Observed value | Interpretation boundary |
| --- | --- | --- |
${observedEvidence.length ? observedEvidence.join('\n') : '| Not available | Not available | No meaningful exported signal was available |'}

## 6. Timeline and Recurrence Context

${timeline}
- First occurrence: ${contextValue(model.pattern.firstObserved)}
- Latest occurrence: ${contextValue(model.pattern.lastObserved)}
- Trend classification: ${contextValue(model.pattern.trend)}
- Duration range: ${contextValue(model.pattern.averageDuration)}

### Trend Evidence

${trendEvidenceMarkdown(model)}

## 7. Analysis

Calibrate Assist interpretation based on the observed evidence listed above.

- Summary: ${contextValue(model.analysis.summary)}
- Objective assessment: ${contextValue(model.analysis.objectiveAssessment)}
- Technical interpretation: ${contextValue(model.analysis.technicalInterpretation)}
- Operational interpretation: ${contextValue(model.analysis.operationalInterpretation)}

### Key Drivers

${model.analysis.drivers.length
  ? model.analysis.drivers.map(driver => `- ${contextValue(driver.signal)}: ${contextValue(driver.value)} - ${contextValue(driver.whyItMatters)}`).join('\n')
  : '- Not available'}

## 8. Recommended Actions

${model.recommendedActions.length ? model.recommendedActions.map(actionMarkdown).join('\n\n') : '- Not available'}

## 9. Remediation Path

${model.remediationPath.length ? model.remediationPath.map(remediationMarkdown).join('\n\n') : '- Not available'}

## 10. Data Gaps and Validation Required

${dataGaps}

## 11. What Calibrate Did Not Infer

- RCA correctness
- Blast-radius completeness
- Hidden service dependencies
- Ownership failures
- Governance failures
- Release or deployment causation
- Future incidents
- Guaranteed outcomes
- MTTR reduction
- Cost savings not present in the evidence
- Remediation success

## 12. Suggested Jira Handoff

- Suggested issue title: ${contextValue(model.jiraHandoff.suggestedTitle)}
- Problem statement: ${contextValue(model.jiraHandoff.problemStatement)}
- Recommended next action: ${contextValue(model.jiraHandoff.recommendedNextAction)}
- Labels: ${model.jiraHandoff.suggestedLabels.length ? model.jiraHandoff.suggestedLabels.join(', ') : 'Not available'}

### Observed Evidence

${markdownList(model.jiraHandoff.observedEvidence)}

### Acceptance Criteria

${markdownList(model.jiraHandoff.acceptanceCriteria)}

### Data Gaps

${markdownList(model.jiraHandoff.dataGaps, '- None reported')}

## 13. MCP Handoff Context

\`\`\`json
${mcp}
\`\`\`

## 14. Report Limitations

${markdownList(model.limitations)}

## 15. Evidence Disclaimer

${model.disclaimer}
`;
}

export function buildActionPlanMarkdown(input: ActionPlanExportInput): string {
  return buildDetailedActionPlanMarkdown(buildActionPlanExportModel(input));
}

export function sanitizeFilenamePart(value: string | null | undefined): string {
  return (value || 'pattern')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'pattern';
}

export function actionPlanFilename(input: ActionPlanExportInput): string {
  const date = (input.generatedAt ?? new Date().toISOString()).slice(0, 10);
  const patternPart = sanitizeFilenamePart(input.pattern.id || input.pattern.title);
  return `calibrate-action-plan-${sanitizeFilenamePart(input.persona)}-${sanitizeFilenamePart(input.objective)}-${patternPart}-${date}.md`;
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
