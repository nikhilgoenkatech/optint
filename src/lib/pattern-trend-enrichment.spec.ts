import { DynatraceProblem, ProblemPattern } from '../models';
import { buildPrompt } from '../persona/PersonaPromptBuilder';
import { buildTrendEnrichment, enrichPattern, splitTimeframe } from './pattern-trend-enrichment';

const DAY = 86400000;
const BASE = Date.UTC(2026, 6, 1, 0, 0, 0);
const BOUNDS = { from: BASE, to: BASE + (14 * DAY), evaluationNow: BASE + (14 * DAY) };

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function problem(id: string, day: number, overrides: Partial<DynatraceProblem> = {}): DynatraceProblem {
  const startTime = BASE + (day * DAY);
  return {
    problemId: id,
    title: 'Failure rate increase',
    status: 'RESOLVED',
    severity: 'ERROR',
    startTime,
    endTime: startTime + (30 * 60000),
    duration: 30,
    impactedEntities: [{ entityId: 'SERVICE-1', name: 'checkout-service', type: 'SERVICE' }],
    rootCauseEntity: { entityId: 'SERVICE-1', name: 'checkout-service', type: 'SERVICE' },
    affectedUsers: 10,
    managementZones: [],
    tags: [],
    hasRootCause: true,
    ...overrides,
  };
}

function pattern(problems: DynatraceProblem[]): ProblemPattern {
  return {
    patternId: 'pat-test',
    signature: 'failure rate increase|rca:checkout-service',
    causalEntity: 'rca:checkout-service',
    dimensions: {
      rootCauseEntities: ['checkout-service'],
      causalEntities: ['rca:checkout-service'],
      impactedServices: ['checkout-service'],
      managementZones: [],
      regions: [],
      clouds: [],
      severities: ['ERROR'],
      primaryRootCause: 'checkout-service',
      primaryService: 'checkout-service',
      primaryZone: null,
      primaryRegion: null,
      primaryCloud: null,
      dimensionPurity: 1,
    },
    title: 'Failure rate increase',
    occurrences: problems.length,
    firstSeen: Math.min(...problems.map(p => p.startTime)),
    lastSeen: Math.max(...problems.map(p => p.startTime)),
    avgMTTR: 30,
    maxMTTR: 30,
    totalCost: 100,
    totalUsers: problems.reduce((sum, p) => sum + (p.affectedUsers ?? 0), 0),
    affectedServices: ['checkout-service'],
    severity: 'ERROR',
    problems,
    trend: 'STABLE',
    concentration: 'HIGH',
    evidenceQuality: 'HIGH',
    investigationReadiness: 'HIGH',
    fixability: 'HIGH',
    confidence: 'HIGH',
    recurrenceScore: 80,
    hasTimeCluster: false,
    dominantHour: 2,
    hasRCA: true,
    autoResolveRate: 0,
    sparkData: [],
    recommendation: { type: 'FIX_ROOT_CAUSE', confidence: 80, text: 'Review recurring pattern.', config: '' },
  };
}

export function runPatternTrendEnrichmentTests(): void {
  const split = splitTimeframe(BOUNDS);
  assert(split?.previousStart === BOUNDS.from, 'equal timeframe split starts at selected range');
  assert(split?.currentEnd === BOUNDS.to, 'equal timeframe split ends at selected range');

  const problems = [
    problem('P1', 1, { duration: 20, affectedUsers: 5 }),
    problem('P2', 2, { duration: 22, affectedUsers: 5 }),
    problem('P3', 10, { duration: 40, affectedUsers: 20 }),
    problem('P4', 11, { duration: 50, affectedUsers: 20 }),
    problem('P5', 12, { duration: 60, affectedUsers: 20 }),
    problem('P6', 12, { status: 'OPEN', endTime: undefined, duration: undefined, affectedUsers: 20 }),
  ];
  const enrichment = buildTrendEnrichment(problems, BOUNDS);
  assert(enrichment.creationRate?.currentPeriodCount === 4, 'creation buckets sum current period occurrences');
  assert(enrichment.creationRate?.previousPeriodCount === 2, 'creation buckets sum previous period occurrences');
  assert(enrichment.creationRate?.direction === 'increasing', 'creation direction increasing');
  assert(enrichment.lifecycle?.currentlyActive === 1, 'active problem with null end uses evaluation now');
  assert((enrichment.lifecycle?.peakConcurrentActive ?? 0) >= 1, 'lifecycle active-over-time counts active spans');
  assert(enrichment.categoryTrend?.category === 'ERROR', 'category trend preserves source category');
  assert(enrichment.serviceTrend?.serviceName === 'checkout-service', 'service trend uses selected-pattern service');
  assert(enrichment.schedulePattern?.peakHour !== undefined, 'peak UTC hour calculated');
  assert(enrichment.schedulePattern?.peakDay !== undefined, 'peak UTC day calculated');
  assert(enrichment.schedulePattern?.confidence !== undefined, 'schedule confidence calculated');
  assert(enrichment.mttrTrend?.medianCurrent === 50, 'median MTTR current calculated from resolved only');
  assert(enrichment.mttrTrend?.p85Current === 60, 'p85 MTTR current calculated');
  assert(enrichment.mttrTrend?.resolvedCurrentCount === 3, 'unresolved problems excluded from MTTR current count');
  assert(enrichment.userImpactTrend?.source === 'affected_users', 'native affected-user trend marked available');

  const missingUsers = buildTrendEnrichment(problems.map(p => ({ ...p, affectedUsers: undefined })), BOUNDS);
  assert(missingUsers.userImpactTrend?.source === 'unavailable', 'missing affected-user evidence marked unavailable');

  const lowData = buildTrendEnrichment([problem('P1', 1)], BOUNDS);
  assert(lowData.creationRate?.direction === 'insufficient_data', 'insufficient creation data handled');

  const enrichedCost = enrichPattern(pattern(problems), BOUNDS);
  const enrichedAlert = enrichPattern(pattern(problems), BOUNDS);
  assert(enrichedCost.patternId === enrichedAlert.patternId, 'changing objective does not alter pattern IDs');
  assert(enrichedCost.problems.map(p => p.problemId).join(',') === enrichedAlert.problems.map(p => p.problemId).join(','), 'changing objective does not alter pattern membership');
  assert(enrichedCost.occurrences === enrichedAlert.occurrences, 'changing objective does not alter occurrence counts');

  const prompt = buildPrompt({ problems, persona: 'sre', costEstimates: [], totalCost: 100, objective: 'cost_impact', pattern: enrichedCost });
  assert(prompt.length < 10000, 'Assist trend payload remains below 10000 characters');
}

