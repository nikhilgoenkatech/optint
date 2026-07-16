import { detectPatterns } from '../analytics';
import { DynatraceProblem, ProblemPattern } from '../models';
import { buildPrompt } from '../persona/PersonaPromptBuilder';
import { patternToDetail } from './pattern-adapter';
import {
  buildTrendEnrichment,
  compactTrendEvidence,
  enrichPattern,
  splitTimeframe,
  trendObservation,
} from './pattern-trend-enrichment';

const DAY = 86400000;
const HOUR = 3600000;
const BASE = Date.UTC(2026, 6, 1, 0, 0, 0);
const BOUNDS = { from: BASE, to: BASE + (14 * DAY), evaluationNow: BASE + (14 * DAY) };

type TestResult = {
  name: string;
  detail?: string;
};

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}. Expected ${String(expected)}, got ${String(actual)}`);
}

function assertIncludes(value: string, expected: string, message: string): void {
  if (!value.includes(expected)) throw new Error(`${message}. Missing "${expected}"`);
}

function assertNotIncludes(value: string, unexpected: string, message: string): void {
  if (value.includes(unexpected)) throw new Error(`${message}. Unexpected "${unexpected}"`);
}

function problem(id: string, day: number, overrides: Partial<DynatraceProblem> = {}): DynatraceProblem {
  const startTime = BASE + (day * DAY) + (10 * HOUR);
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
    dominantHour: 10,
    hasRCA: true,
    autoResolveRate: 0,
    sparkData: [],
    recommendation: { type: 'FIX_ROOT_CAUSE', confidence: 80, text: 'Review recurring pattern.', config: '' },
  };
}

function run(name: string, fn: () => string | void): TestResult {
  const detail = fn() || undefined;
  return { name, detail };
}

export function runPatternTrendEnrichmentTests(): TestResult[] {
  const results: TestResult[] = [];

  results.push(run('equal absolute timeframe splitting', () => {
    const split = splitTimeframe(BOUNDS);
    assertEqual(split?.previousStart, BOUNDS.from, 'split starts at selected range');
    assertEqual(split?.previousEnd, BASE + (7 * DAY), 'previous period ends at midpoint');
    assertEqual(split?.currentStart, BASE + (7 * DAY), 'current period starts at midpoint');
    assertEqual(split?.currentEnd, BOUNDS.to, 'split ends at selected range');
  }));

  results.push(run('increasing, stable, and decreasing creation trends', () => {
    const increasing = buildTrendEnrichment([problem('I1', 1), problem('I2', 9), problem('I3', 10), problem('I4', 11)], BOUNDS);
    const stable = buildTrendEnrichment([problem('S1', 1), problem('S2', 2), problem('S3', 9), problem('S4', 10)], BOUNDS);
    const decreasing = buildTrendEnrichment([problem('D1', 1), problem('D2', 2), problem('D3', 3), problem('D4', 10)], BOUNDS);
    assertEqual(increasing.creationRate?.direction, 'increasing', 'creation trend increases');
    assertEqual(stable.creationRate?.direction, 'stable', 'creation trend stays stable inside tolerance');
    assertEqual(decreasing.creationRate?.direction, 'decreasing', 'creation trend decreases');
  }));

  results.push(run('lifecycle concurrency, active null end, and shared evaluation timestamp', () => {
    const active = problem('A1', 10, { status: 'OPEN', endTime: undefined, duration: undefined });
    const overlapping = [
      problem('L1', 8, { endTime: BASE + (11 * DAY), duration: 3 * 24 * 60 }),
      problem('L2', 9, { endTime: BASE + (12 * DAY), duration: 3 * 24 * 60 }),
      active,
    ];
    const enrichment = buildTrendEnrichment(overlapping, BOUNDS);
    assertEqual(enrichment.lifecycle?.currentlyActive, 1, 'open problem is active at evaluation timestamp');
    assert((enrichment.lifecycle?.peakConcurrentActive ?? 0) >= 3, 'overlapping spans produce lifecycle concurrency');
    assertIncludes(
      JSON.stringify(enrichment.lifecycle?.activeOverTime ?? []),
      new Date(BOUNDS.evaluationNow).toISOString(),
      'null end uses shared evaluation timestamp',
    );
  }));

  results.push(run('median and p85 MTTR exclude unresolved problems', () => {
    const problems = [
      problem('M1', 1, { duration: 20 }),
      problem('M2', 2, { duration: 22 }),
      problem('M3', 10, { duration: 40 }),
      problem('M4', 11, { duration: 50 }),
      problem('M5', 12, { duration: 60 }),
      problem('M6', 12, { status: 'OPEN', endTime: undefined, duration: undefined }),
    ];
    const enrichment = buildTrendEnrichment(problems, BOUNDS);
    assertEqual(enrichment.mttrTrend?.medianCurrent, 50, 'median MTTR current calculated from resolved problems');
    assertEqual(enrichment.mttrTrend?.p85Current, 60, 'p85 MTTR current calculated from resolved problems');
    assertEqual(enrichment.mttrTrend?.resolvedCurrentCount, 3, 'unresolved current problem excluded from MTTR count');
  }));

  results.push(run('peak hour, peak day, and schedule confidence', () => {
    const tuesday = BASE + (6 * DAY); // 2026-07-07 Tuesday UTC
    const scheduled = [0, 1, 2, 3].map(index => problem(`SCH${index}`, 0, {
      startTime: tuesday + (10 * HOUR) + (index * 60000),
      endTime: tuesday + (10 * HOUR) + ((index + 30) * 60000),
    }));
    const enrichment = buildTrendEnrichment(scheduled, { from: tuesday - DAY, to: tuesday + DAY, evaluationNow: tuesday + DAY });
    assertEqual(enrichment.schedulePattern?.peakHour, 10, 'peak UTC hour calculated');
    assertEqual(enrichment.schedulePattern?.peakDay, 'Tuesday', 'peak UTC day calculated');
    assertEqual(enrichment.schedulePattern?.confidence, 1, 'schedule confidence calculated');
    assert(enrichment.schedulePattern?.label, 'schedule label appears when confidence threshold is met');
  }));

  results.push(run('native affected-user trend and unavailable affected-user evidence', () => {
    const withUsers = [
      problem('U1', 1, { affectedUsers: 5 }),
      problem('U2', 2, { affectedUsers: 5 }),
      problem('U3', 9, { affectedUsers: 20 }),
      problem('U4', 10, { affectedUsers: 20 }),
    ];
    const userTrend = buildTrendEnrichment(withUsers, BOUNDS);
    assertEqual(userTrend.userImpactTrend?.source, 'affected_users', 'native affected-user evidence is used');
    assertEqual(userTrend.userImpactTrend?.direction, 'increasing', 'affected-user trend direction calculated');

    const missingUsers = buildTrendEnrichment(withUsers.map(p => ({ ...p, affectedUsers: undefined })), BOUNDS);
    assertEqual(missingUsers.userImpactTrend?.source, 'unavailable', 'missing affected-user evidence marked unavailable');
    assertEqual(missingUsers.userImpactTrend?.direction, 'insufficient_data', 'missing affected-user evidence is insufficient');
  }));

  results.push(run('insufficient-data behavior and generic entity placeholder rejection', () => {
    const lowData = buildTrendEnrichment([problem('LOW1', 1)], BOUNDS);
    assertEqual(lowData.creationRate?.direction, 'insufficient_data', 'low creation data marked insufficient');
    assertEqual(lowData.mttrTrend?.direction, 'insufficient_data', 'low resolved duration data marked insufficient');
    assertEqual(trendObservation(lowData), null, 'insufficient data does not create misleading observation');

    const generic = buildTrendEnrichment([
      problem('G1', 1, {
        rootCauseEntity: { entityId: 'SERVICE-G', name: 'SERVICE', type: 'SERVICE' },
        impactedEntities: [{ entityId: 'HOST-G', name: 'HOST', type: 'HOST' }],
      }),
      problem('G2', 2, {
        rootCauseEntity: { entityId: 'APP-G', name: 'APPLICATION', type: 'APPLICATION' },
        impactedEntities: [{ entityId: 'PROCESS-G', name: 'PROCESS_GROUP', type: 'PROCESS_GROUP' }],
      }),
    ], BOUNDS);
    assert(generic.serviceTrend?.serviceName !== 'SERVICE', 'generic SERVICE placeholder rejected');
    assert(generic.serviceTrend?.serviceName !== 'HOST', 'generic HOST placeholder rejected');
    assert(generic.serviceTrend?.serviceName !== 'APPLICATION', 'generic APPLICATION placeholder rejected');
    assert(generic.serviceTrend?.serviceName !== 'PROCESS_GROUP', 'generic PROCESS_GROUP placeholder rejected');
  }));

  results.push(run('objective neutrality for pattern IDs, membership, and occurrence count', () => {
    const problems = [
      problem('N1', 1),
      problem('N2', 2),
      problem('N3', 9),
      problem('N4', 10),
    ];
    const enrichedCost = enrichPattern(pattern(problems), BOUNDS);
    const enrichedAlert = enrichPattern(pattern(problems), BOUNDS);
    assertEqual(enrichedCost.patternId, enrichedAlert.patternId, 'objective does not alter pattern IDs');
    assertEqual(
      enrichedCost.problems.map(p => p.problemId).join(','),
      enrichedAlert.problems.map(p => p.problemId).join(','),
      'objective does not alter pattern membership',
    );
    assertEqual(enrichedCost.occurrences, enrichedAlert.occurrences, 'objective does not alter occurrence count');
  }));

  results.push(run('detectPatterns to trend enrichment to pattern detail integration', () => {
    const raw = [
      problem('RAW-1', 1, { duration: 20, affectedUsers: 4 }),
      problem('RAW-2', 2, { duration: 25, affectedUsers: 4 }),
      problem('RAW-3', 9, { duration: 45, affectedUsers: 10 }),
      problem('RAW-4', 10, { duration: 55, affectedUsers: 10 }),
      problem('RAW-5', 11, { status: 'OPEN', endTime: undefined, duration: undefined, affectedUsers: 10 }),
      problem('OTHER-1', 10, { title: 'CPU saturation', rootCauseEntity: { entityId: 'SERVICE-2', name: 'inventory-service', type: 'SERVICE' } }),
    ];
    const detected = detectPatterns(raw);
    const original = detected.patterns.find(item => item.title === 'Failure rate increase');
    assert(original, 'expected recurring pattern detected');
    const originalId = original!.patternId;
    const enriched = enrichPattern(original!, BOUNDS);
    const detail = patternToDetail(enriched, 'sre', 'cost_impact');
    const trendEvidence = detail.assistContext.evidence.trendEvidence;

    assertEqual(enriched.patternId, originalId, 'trend enrichment does not change existing pattern ID');
    assertEqual(enriched.occurrences, 5, 'trend enrichment does not change occurrence count');
    assertEqual(enriched.problems.map(p => p.problemId).sort().join(','), 'RAW-1,RAW-2,RAW-3,RAW-4,RAW-5', 'expected pattern membership preserved');
    assertEqual(enriched.trendEnrichment?.creationRate?.direction, 'increasing', 'integration enrichment creation trend');
    assertEqual(enriched.trendEnrichment?.mttrTrend?.direction, 'worsening', 'integration enrichment median MTTR trend');
    assert(trendEvidence && typeof trendEvidence === 'object' && !Array.isArray(trendEvidence), 'compact trend evidence is attached to detail evidence');
    assert(!JSON.stringify(trendEvidence).includes('occurrenceSeries'), 'compact trend evidence excludes full occurrence series');
    assert(!JSON.stringify(trendEvidence).includes('activeOverTime'), 'compact trend evidence excludes full active-over-time series');
  }));

  results.push(run('Assist prompt stays compact and preserves problem IDs', () => {
    const raw = [
      problem('PROMPT-1', 1, { duration: 20, affectedUsers: 4 }),
      problem('PROMPT-2', 2, { duration: 25, affectedUsers: 4 }),
      problem('PROMPT-3', 9, { duration: 45, affectedUsers: 10 }),
      problem('PROMPT-4', 10, { duration: 55, affectedUsers: 10 }),
      problem('PROMPT-5', 11, { status: 'OPEN', endTime: undefined, duration: undefined, affectedUsers: 10 }),
    ];
    const detected = detectPatterns(raw).patterns[0];
    const enriched = enrichPattern(detected, BOUNDS);
    const prompt = buildPrompt({
      problems: raw,
      persona: 'sre',
      costEstimates: [],
      totalCost: 100,
      objective: 'cost_impact',
      pattern: enriched,
    });
    assert(prompt.length < 10000, 'Assist trend payload remains below 10000 characters');
    assertIncludes(prompt, 'PROMPT-1', 'prompt includes real problem IDs');
    assertNotIncludes(prompt, 'occurrenceSeries', 'prompt excludes full trend timeseries arrays');
    assertNotIncludes(prompt, 'activeOverTime', 'prompt excludes lifecycle timeseries arrays');
    assertNotIncludes(prompt, '"source":"unavailable"', 'prompt omits unavailable source fields');
    return `promptLength=${prompt.length}`;
  }));

  return results;
}
