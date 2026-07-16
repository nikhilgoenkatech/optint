import type { PatternDetail } from '../types/views';
import type { ActionPlanOutputs } from './action-plan-export';

export type DqlNotebookContext = {
  queries: Array<{
    name: string;
    persona?: string;
    purpose: string;
    dql: string;
    parameters?: Record<string, string | number | null>;
    lastExecutionTime?: string | null;
    rowCount?: number | null;
  }>;
};

export type EvidenceNotebookInput = {
  persona: string;
  objective: string;
  timeWindow?: string | null;
  generatedAt?: string;
  pattern: PatternDetail;
  dqlContext?: DqlNotebookContext;
  outputs: ActionPlanOutputs;
};

export type EvidenceNotebookSection =
  | { type: 'markdown'; title: string; content: string }
  | { type: 'dql'; title: string; query: string; purpose: string; parameters: Record<string, string | number | null>; rowCount: number | null; lastExecutionTime: string | null }
  | { type: 'table'; title: string; columns: string[]; rows: Array<Array<string | number | null>> }
  | { type: 'json'; title: string; data: Record<string, unknown> };

export type DynatraceEvidenceNotebookJson = {
  schemaVersion: '1.0';
  sourceApplication: 'Calibrate';
  exportType: 'dynatrace_notebook';
  generatedAt: string;
  title: string;
  persona: string;
  objective: string;
  timeWindow: string | null;
  pattern: {
    id: string;
    title: string;
    problemIds: string[];
  };
  sections: EvidenceNotebookSection[];
  evidenceBoundaries: {
    dqlRetrievedProblemRecords: true;
    calibrateGroupedPatternsClientSide: true;
    assistUsedSelectedPatternSignalsOnly: true;
    rcaCorrectnessValidated: false;
    hiddenDependenciesInferred: false;
    remediationSuccessGuaranteed: false;
  };
  disclaimer: string;
};

const NOTEBOOK_DISCLAIMER = 'This notebook distinguishes DQL retrieval, Calibrate client-side pattern grouping, and Dynatrace Assist interpretation. DQL retrieved the Davis problem records. Calibrate grouped and ranked the selected pattern client-side. Dynatrace Assist recommendations are based only on the observed signals supplied from the selected pattern.';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanString(value: unknown, fallback = 'Not available'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'number' && !Number.isFinite(value)) return fallback;
  if (Array.isArray(value)) return value.length ? value.map(item => cleanString(item)).join(', ') : fallback;
  return String(value);
}

function markdownTableEscape(value: unknown): string {
  return cleanString(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function markdownList(items: string[], fallback = '- Not available'): string {
  return items.length ? items.map(item => `- ${item}`).join('\n') : fallback;
}

function outputSummary(output: unknown): string[] {
  const record = asRecord(output);
  return [
    record.executiveSummary,
    record.objectiveAssessment,
    record.assessment,
    record.investigationSummary,
    record.technicalInterpretation,
    record.operationalInterpretation,
  ].map(value => cleanString(value, '')).filter(Boolean);
}

function outputActions(output: unknown): string[] {
  const record = asRecord(output);
  const buckets = [
    ...asArray(record.decisionOptions),
    ...asArray(record.preventionRecommendations),
    ...asArray(record.remediationCandidates),
    ...asArray(record.debuggingPath),
    ...asArray(record.automationOpportunities),
  ];
  const legacy = asRecord(record.action);
  if (legacy.title || legacy.reason) buckets.push(legacy);
  return buckets.map(item => {
    if (typeof item === 'string') return item;
    const row = asRecord(item);
    const title = cleanString(row.title ?? row.step, '');
    const priority = cleanString(row.priority, '');
    const strength = cleanString(row.recommendationStrength ?? row.strength, '');
    const reason = cleanString(row.reason ?? row.businessRationale ?? row.purpose, '');
    return [title, priority ? `priority: ${priority}` : '', strength ? `strength: ${strength}` : '', reason].filter(Boolean).join(' | ');
  }).filter(Boolean);
}

function outputGaps(outputs: ActionPlanOutputs): string[] {
  const gaps = new Set<string>();
  Object.values(outputs).forEach(output => {
    asArray(asRecord(output).dataGaps).forEach(item => {
      if (typeof item === 'string') gaps.add(item);
      else {
        const record = asRecord(item);
        const text = cleanString(record.missingEvidence ?? record.evidence ?? record.signal, '');
        if (text) gaps.add(text);
      }
    });
  });
  return [...gaps].sort();
}

function buildSignalTable(pattern: PatternDetail): string {
  const lineage = pattern.assistContext.lineage ?? {};
  const rows = Object.entries(pattern.assistContext.evidence)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([signal, value]) => {
      const source = lineage[signal];
      return `| ${markdownTableEscape(signal)} | ${markdownTableEscape(value)} | ${markdownTableEscape(source?.sourceField)} | ${markdownTableEscape(source?.transformation)} | ${markdownTableEscape(source?.fallbackUsed ?? source?.missingReason ?? '')} |`;
    });
  return [
    '| Signal | Observed value | Source field | Calibrate transformation | Fallback / missing note |',
    '| --- | --- | --- | --- | --- |',
    rows.length ? rows.join('\n') : '| Not available | Not available | Not available | Not available | Not available |',
  ].join('\n');
}

function signalRows(pattern: PatternDetail): Array<Array<string | number | null>> {
  const lineage = pattern.assistContext.lineage ?? {};
  return Object.entries(pattern.assistContext.evidence)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([signal, value]) => {
      const source = lineage[signal];
      return [
        signal,
        cleanString(value),
        cleanString(source?.sourceField, ''),
        cleanString(source?.transformation, ''),
        cleanString(source?.fallbackUsed ?? source?.missingReason, ''),
      ];
    });
}

function buildDqlSection(context?: DqlNotebookContext): string {
  const queries = context?.queries ?? [];
  if (!queries.length) return 'No DQL context was available in the current UI state.';
  return queries.map(query => {
    const params = Object.entries(query.parameters ?? {})
      .map(([key, value]) => `  - ${key}: ${cleanString(value)}`)
      .join('\n') || '  - Not available';
    return `### ${query.name}

- Persona: ${query.persona ?? 'all'}
- Purpose: ${query.purpose}
- Last execution time: ${cleanString(query.lastExecutionTime)}
- Last row count: ${cleanString(query.rowCount)}
- Query parameters:
${params}

\`\`\`dql
${query.dql}
\`\`\``;
  }).join('\n\n');
}

function buildDqlSections(context?: DqlNotebookContext): EvidenceNotebookSection[] {
  return (context?.queries ?? []).map(query => ({
    type: 'dql',
    title: query.name,
    purpose: query.purpose,
    query: query.dql,
    parameters: query.parameters ?? {},
    rowCount: query.rowCount ?? null,
    lastExecutionTime: query.lastExecutionTime ?? null,
  }));
}

function notebookCoreData(input: EvidenceNotebookInput, generatedAt: string) {
  const pattern = input.pattern;
  return {
    generatedAt,
    context: {
      application: 'Calibrate',
      notebookType: 'Evidence Notebook',
      persona: input.persona,
      objective: input.objective,
      timeWindow: cleanString(input.timeWindow, ''),
      patternTitle: pattern.title,
      patternId: pattern.id,
      problemIds: pattern.assistContext.problemIds,
    },
    patternOverview: {
      title: pattern.title,
      occurrences: pattern.recurrence.occurrences,
      trend: pattern.recurrence.trend,
      exposure: pattern.businessImpact.exposure,
      recoverableValue: pattern.businessImpact.recoverableValue,
      openIncidents: pattern.businessImpact.openIncidents,
      affectedUsers: pattern.businessImpact.affectedUsers,
      evidenceQuality: pattern.technicalActionability.evidenceQuality,
      investigationReadiness: pattern.technicalActionability.investigationReadiness,
      remediationEffort: pattern.technicalActionability.remediationEffort,
      rcaAvailability: cleanString(pattern.assistContext.evidence.rca_availability, ''),
      rootCauseEntity: cleanString(pattern.assistContext.evidence.root_cause_entity, ''),
      trendEnrichment: pattern.trendEnrichment ?? null,
    },
    recurrenceTimeline: pattern.recurrence.timeline.map(bucket => ({
      label: bucket.label,
      count: bucket.count,
      startTime: bucket.startTime ?? null,
      endTime: bucket.endTime ?? null,
      estimated: bucket.estimated ?? false,
    })),
    assistInputBoundary: {
      persona: pattern.assistContext.persona,
      objective: pattern.assistContext.objective,
      statement: 'Assist received selected-pattern evidence only. Missing evidence remains a data gap and is not treated as evidence of a problem.',
    },
    assistInterpretation: [
      ...outputSummary(input.outputs.analysis),
      ...outputSummary(input.outputs.recommendations),
      ...outputSummary(input.outputs.remediation),
    ],
    actions: [
      ...outputActions(input.outputs.analysis),
      ...outputActions(input.outputs.recommendations),
      ...outputActions(input.outputs.remediation),
    ],
    dataGaps: outputGaps(input.outputs),
  };
}

export function buildEvidenceNotebookJson(input: EvidenceNotebookInput): DynatraceEvidenceNotebookJson {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const pattern = input.pattern;
  const core = notebookCoreData(input, generatedAt);
  const sections: EvidenceNotebookSection[] = [
    {
      type: 'markdown',
      title: 'Context',
      content: [
        '# Calibrate Evidence Notebook',
        '',
        `- Persona: ${input.persona}`,
        `- Objective: ${input.objective}`,
        `- Time window: ${cleanString(input.timeWindow)}`,
        `- Generated at: ${generatedAt}`,
        `- Selected pattern: ${pattern.title}`,
        `- Pattern ID: ${pattern.id}`,
        '',
        NOTEBOOK_DISCLAIMER,
      ].join('\n'),
    },
    ...buildDqlSections(input.dqlContext),
    {
      type: 'markdown',
      title: 'Query and Data Lineage Notes',
      content: [
        '- DQL retrieves non-duplicate Davis problem records for the selected time window.',
        '- Pattern grouping is performed by Calibrate client-side after DQL results are normalized.',
        '- Remediation and recommendations are generated by Dynatrace Assist from selected pattern signals, not by a remediation DQL query.',
        '- RCA availability means Davis supplied a root-cause entity; Calibrate does not independently validate RCA correctness.',
      ].join('\n'),
    },
    {
      type: 'table',
      title: 'Observed Signals and Transformations',
      columns: ['Signal', 'Observed value', 'Source field', 'Calibrate transformation', 'Fallback / missing note'],
      rows: signalRows(pattern),
    },
    {
      type: 'table',
      title: 'Recurrence Timeline',
      columns: ['Label', 'Count', 'Start time', 'End time', 'Estimated'],
      rows: pattern.recurrence.timeline.map(bucket => [
        bucket.label,
        bucket.count,
        bucket.startTime ?? null,
        bucket.endTime ?? null,
        bucket.estimated ? 'true' : 'false',
      ]),
    },
    {
      type: 'json',
      title: 'Trend Enrichment',
      data: {
        sourceData: 'Dynatrace Davis problem records retrieved by DQL',
        deterministicCalculation: 'Calibrate client-side trend enrichment from selected pattern membership',
        modeledCostValues: 'Excluded from trend enrichment; cost remains modeled separately',
        assistGeneratedRecommendations: 'Excluded from trend enrichment; Assist output appears in later sections',
        trendEnrichment: pattern.trendEnrichment ?? null,
      },
    },
    {
      type: 'json',
      title: 'Selected Pattern Evidence Context',
      data: core,
    },
    {
      type: 'markdown',
      title: 'What Calibrate Did Not Infer',
      content: [
        '- RCA correctness',
        '- Blast-radius completeness',
        '- Hidden service dependencies',
        '- Ownership failures',
        '- Governance failures',
        '- Release or deployment causation',
        '- Future incidents',
        '- Guaranteed outcomes',
        '- MTTR reduction',
        '- Cost savings not present in the evidence',
        '- Remediation success',
      ].join('\n'),
    },
    {
      type: 'markdown',
      title: 'Evidence Disclaimer',
      content: 'Calibrate recommendations are derived only from the observed signals included in this notebook. Missing evidence is treated as a data gap and not as evidence of a problem. Root-cause availability indicates whether a root-cause entity was supplied; it does not represent independent validation of RCA correctness.',
    },
  ];

  return {
    schemaVersion: '1.0',
    sourceApplication: 'Calibrate',
    exportType: 'dynatrace_notebook',
    generatedAt,
    title: `Calibrate Evidence Notebook - ${pattern.title}`,
    persona: input.persona,
    objective: input.objective,
    timeWindow: cleanString(input.timeWindow, ''),
    pattern: {
      id: pattern.id,
      title: pattern.title,
      problemIds: pattern.assistContext.problemIds,
    },
    sections,
    evidenceBoundaries: {
      dqlRetrievedProblemRecords: true,
      calibrateGroupedPatternsClientSide: true,
      assistUsedSelectedPatternSignalsOnly: true,
      rcaCorrectnessValidated: false,
      hiddenDependenciesInferred: false,
      remediationSuccessGuaranteed: false,
    },
    disclaimer: NOTEBOOK_DISCLAIMER,
  };
}

export function buildEvidenceNotebookMarkdown(input: EvidenceNotebookInput): string {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const pattern = input.pattern;
  const timeline = pattern.recurrence.timeline.map(bucket => `- ${bucket.label}: ${bucket.count}`).join('\n');
  const analysisSummary = [
    ...outputSummary(input.outputs.analysis),
    ...outputSummary(input.outputs.recommendations),
    ...outputSummary(input.outputs.remediation),
  ];
  const actions = [
    ...outputActions(input.outputs.analysis),
    ...outputActions(input.outputs.recommendations),
    ...outputActions(input.outputs.remediation),
  ];
  const gaps = outputGaps(input.outputs);

  return `# Calibrate Evidence Notebook

## 1. Context

- Application: Calibrate
- Notebook type: Evidence Notebook
- Persona: ${input.persona}
- Objective: ${input.objective}
- Time window: ${cleanString(input.timeWindow)}
- Generated at: ${generatedAt}
- Selected pattern: ${pattern.title}
- Pattern ID: ${pattern.id}
- Problem IDs: ${pattern.assistContext.problemIds.length ? pattern.assistContext.problemIds.join(', ') : 'Not available'}

${NOTEBOOK_DISCLAIMER}

## 2. DQL Queries Used

${buildDqlSection(input.dqlContext)}

## 3. Query and Data Lineage Notes

- The DQL above retrieves non-duplicate Davis problem records for the selected time window.
- Pattern grouping is performed by Calibrate client-side after DQL results are normalized.
- Remediation and recommendations are generated by Dynatrace Assist from the selected pattern signals, not by a remediation DQL query.
- RCA availability means Davis supplied a root-cause entity; Calibrate does not independently validate RCA correctness.

## 4. Selected Pattern Overview

- Title: ${pattern.title}
- Occurrences: ${pattern.recurrence.occurrences}
- Trend: ${pattern.recurrence.trend}
- Exposure: ${pattern.businessImpact.exposure}
- Recoverable value: ${pattern.businessImpact.recoverableValue}
- Open incidents: ${pattern.businessImpact.openIncidents}
- Affected users: ${pattern.businessImpact.affectedUsers}
- Evidence quality: ${pattern.technicalActionability.evidenceQuality}
- Investigation readiness: ${pattern.technicalActionability.investigationReadiness}
- Remediation effort: ${pattern.technicalActionability.remediationEffort}
- RCA availability: ${cleanString(pattern.assistContext.evidence.rca_availability)}
- Root cause entity: ${cleanString(pattern.assistContext.evidence.root_cause_entity)}

## 5. Observed Signals and Transformations

${buildSignalTable(pattern)}

## 6. Recurrence Timeline

${timeline || '- Not available'}

## 7. Assist Input Boundary

- Assist persona: ${pattern.assistContext.persona}
- Assist objective: ${pattern.assistContext.objective}
- Assist received selected-pattern evidence only.
- Missing evidence remains a data gap and is not treated as evidence of a problem.

## 8. Assist Interpretation

${markdownList(analysisSummary)}

## 9. Recommended Actions / Remediation Path

${markdownList(actions)}

## 10. Data Gaps

${markdownList(gaps, '- No Assist-identified data gaps were available.')}

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

## 12. Notebook Limitations

- Analysis is based on the selected time window.
- Only signals available to Calibrate were considered.
- DQL retrieved problem records; client-side Calibrate logic grouped and ranked the pattern.
- Recommendations should be validated by the receiving team before implementation.
- This notebook is not proof that a remediation will succeed.

## 13. Evidence Disclaimer

Calibrate recommendations are derived only from the observed signals included in this notebook. Missing evidence is treated as a data gap and not as evidence of a problem. Root-cause availability indicates whether a root-cause entity was supplied; it does not represent independent validation of RCA correctness.
`;
}

export function evidenceNotebookFilename(input: EvidenceNotebookInput, extension: 'md' | 'json' = 'json'): string {
  const date = (input.generatedAt ?? new Date().toISOString()).slice(0, 10);
  const patternPart = (input.pattern.id || input.pattern.title || 'pattern')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'pattern';
  return `calibrate-evidence-notebook-${input.persona}-${input.objective}-${patternPart}-${date}.${extension}`;
}
