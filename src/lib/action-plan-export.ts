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
  pattern: {
    id?: string | null;
    title?: string | null;
    problemIds?: string[];
  };
  observedSignals?: Record<string, string | number | string[] | null | undefined>;
  outputs: ActionPlanOutputs;
};

export type ActionPlanAction = {
  title: string;
  priority: string | null;
  dynatraceCapability: string | null;
  effort: string | null;
  recommendationStrength: string | null;
  evidenceUsed: string[];
};

export type ActionPlanJson = {
  app: 'Calibrate';
  exportType: 'action_plan';
  persona: string;
  objective: string;
  timeWindow: string;
  generatedAt: string;
  pattern: {
    id: string | null;
    title: string;
    problemIds: string[];
  };
  observedSignals: Record<string, string | number | string[] | null>;
  analysisSummary: string;
  recommendedActions: ActionPlanAction[];
  remediationPath: ActionPlanAction[];
  dataGaps: string[];
  disclaimer: string;
};

const DISCLAIMER = 'Evidence-only action plan. Content is based only on supplied Calibrate pattern signals and generated Assist output. Missing fields are represented as unavailable and should not be inferred.';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback = 'Not available'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.map(item => asString(item)).join(', ') : fallback;
  return String(value);
}

function asStringArray(value: unknown): string[] {
  return asArray(value).map(item => asString(item)).filter(Boolean);
}

function stableSignals(signals: ActionPlanExportInput['observedSignals']): Record<string, string | number | string[] | null> {
  const source = signals ?? {};
  return Object.keys(source).sort().reduce<Record<string, string | number | string[] | null>>((acc, key) => {
    const value = source[key];
    acc[key] = value === undefined ? null : value;
    return acc;
  }, {});
}

function actionFromRecord(record: Record<string, unknown>, titleKey: 'title' | 'step' = 'title'): ActionPlanAction {
  return {
    title: asString(record[titleKey]),
    priority: record.priority == null ? null : asString(record.priority),
    dynatraceCapability: record.dynatraceCapability == null
      ? record.capability == null ? null : asString(record.capability)
      : asString(record.dynatraceCapability),
    effort: record.effort == null ? null : asString(record.effort),
    recommendationStrength: record.recommendationStrength == null
      ? record.strength == null ? null : asString(record.strength)
      : asString(record.recommendationStrength),
    evidenceUsed: [
      ...asStringArray(record.evidenceUsed),
      ...asStringArray(record.evidence),
      record.businessRationale ? asString(record.businessRationale) : '',
      record.reason ? asString(record.reason) : '',
    ].filter(Boolean),
  };
}

function collectActions(output: unknown): ActionPlanAction[] {
  const record = asRecord(output);
  const actions: ActionPlanAction[] = [];

  asArray(record.decisionOptions).forEach(item => actions.push(actionFromRecord(asRecord(item))));
  asArray(record.preventionRecommendations).forEach(item => actions.push(actionFromRecord(asRecord(item))));
  asArray(record.remediationCandidates).forEach(item => actions.push(actionFromRecord(asRecord(item))));
  asArray(record.debuggingPath).forEach(item => actions.push(actionFromRecord(asRecord(item), 'step')));
  asArray(record.automationOpportunities).forEach(item => {
    if (typeof item === 'string') {
      actions.push({ title: item, priority: null, dynatraceCapability: null, effort: null, recommendationStrength: null, evidenceUsed: [] });
    } else {
      actions.push(actionFromRecord(asRecord(item)));
    }
  });

  const legacyAction = asRecord(record.action);
  if (legacyAction.title || legacyAction.reason) actions.push(actionFromRecord(legacyAction));

  return actions.filter(action => action.title !== 'Not available');
}

function collectDataGaps(outputs: ActionPlanOutputs): string[] {
  const gaps = new Set<string>();
  Object.values(outputs).forEach(output => {
    asStringArray(asRecord(output).dataGaps).forEach(gap => gaps.add(gap));
  });
  return [...gaps].sort();
}

function collectSummary(outputs: ActionPlanOutputs): string {
  const candidates = [
    asRecord(outputs.analysis).investigationSummary,
    asRecord(outputs.analysis).executiveSummary,
    asRecord(outputs.analysis).assessment,
    asRecord(outputs.recommendations).executiveSummary,
    asRecord(outputs.recommendations).assessment,
    asRecord(outputs.remediation).investigationSummary,
    asRecord(outputs.remediation).assessment,
  ].map(value => asString(value, '')).filter(Boolean);

  if (candidates.length) return candidates.join('\n\n');

  const sre = asRecord(outputs.analysis);
  const reliabilitySignals = asArray(sre.reliabilitySignals)
    .map(signal => {
      const row = asRecord(signal);
      return [row.signal, ...asStringArray(row.evidence)].map(value => asString(value, '')).filter(Boolean).join(': ');
    })
    .filter(Boolean);
  const recurrenceDrivers = asStringArray(sre.recurrenceDrivers);
  return [...reliabilitySignals, ...recurrenceDrivers].join('\n') || 'Not available';
}

function collectRemediationPath(outputs: ActionPlanOutputs): ActionPlanAction[] {
  return [
    ...collectActions(outputs.remediation),
    ...collectActions(outputs.recommendations),
  ];
}

function collectRecommendedActions(outputs: ActionPlanOutputs): ActionPlanAction[] {
  return [
    ...collectActions(outputs.analysis),
    ...collectActions(outputs.recommendations),
    ...collectActions(outputs.remediation),
  ];
}

export function buildActionPlanJson(input: ActionPlanExportInput): ActionPlanJson {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const outputs = input.outputs;
  return {
    app: 'Calibrate',
    exportType: 'action_plan',
    persona: input.persona,
    objective: input.objective,
    timeWindow: input.timeWindow || 'Not available',
    generatedAt,
    pattern: {
      id: input.pattern.id || null,
      title: input.pattern.title || 'Not available',
      problemIds: [...(input.pattern.problemIds ?? [])].sort(),
    },
    observedSignals: stableSignals(input.observedSignals),
    analysisSummary: collectSummary(outputs),
    recommendedActions: collectRecommendedActions(outputs),
    remediationPath: collectRemediationPath(outputs),
    dataGaps: collectDataGaps(outputs),
    disclaimer: DISCLAIMER,
  };
}

function actionMarkdown(action: ActionPlanAction): string {
  const lines = [
    `- **${action.title}**`,
    action.priority ? `  - Priority: ${action.priority}` : '',
    action.dynatraceCapability ? `  - Dynatrace capability: ${action.dynatraceCapability}` : '',
    action.effort ? `  - Effort: ${action.effort}` : '',
    action.recommendationStrength ? `  - Strength: ${action.recommendationStrength}` : '',
    action.evidenceUsed.length ? `  - Evidence: ${action.evidenceUsed.join('; ')}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

export function buildActionPlanMarkdown(input: ActionPlanExportInput): string {
  const plan = buildActionPlanJson(input);
  const signalLines = Object.entries(plan.observedSignals).map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') : value ?? 'Not available'}`);
  const actions = plan.recommendedActions.length ? plan.recommendedActions.map(actionMarkdown).join('\n') : '- Not available';
  const remediation = plan.remediationPath.length ? plan.remediationPath.map(actionMarkdown).join('\n') : '- Not available';
  const gaps = plan.dataGaps.length ? plan.dataGaps.map(gap => `- ${gap}`).join('\n') : '- None reported';

  return `# Calibrate Action Plan

## Context
- Persona: ${plan.persona}
- Objective: ${plan.objective}
- Time window: ${plan.timeWindow}
- Pattern: ${plan.pattern.title}
- Pattern ID: ${plan.pattern.id ?? 'Not available'}
- Generated: ${plan.generatedAt}

## Analysis Summary
${plan.analysisSummary}

## Remediation Path / Recommended Actions
${remediation}

## Recommended Actions
${actions}

## Evidence / Observed Signals
${signalLines.length ? signalLines.join('\n') : '- Not available'}

## Data Gaps
${gaps}

## Disclaimer
${plan.disclaimer}
`;
}

export function buildActionPlanExport(input: ActionPlanExportInput) {
  return {
    json: buildActionPlanJson(input),
    markdown: buildActionPlanMarkdown(input),
  };
}

export function sanitizeFilenamePart(value: string | null | undefined): string {
  return (value || 'pattern')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'pattern';
}

export function actionPlanFilename(input: ActionPlanExportInput, extension: 'md' | 'json'): string {
  const date = (input.generatedAt ?? new Date().toISOString()).slice(0, 10);
  const patternPart = sanitizeFilenamePart(input.pattern.id || input.pattern.title);
  return `calibrate-action-plan-${sanitizeFilenamePart(input.persona)}-${patternPart}-${date}.${extension}`;
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

export async function copyToClipboard(content: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = content;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  textarea.remove();
  if (!ok) throw new Error('Clipboard copy failed.');
}
