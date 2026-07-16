import { normalizeEntityName, entityTypeFromId } from './entity-normalization';
import { detectPatterns } from '../analytics';
import { DynatraceProblem } from '../models';

type TestResult = { name: string; detail?: string };

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}. Expected ${String(expected)}, got ${String(actual)}`);
}

const BASE = Date.UTC(2026, 5, 16, 20, 0, 0);
const DAY  = 86_400_000;

function problem(
  id: string,
  day: number,
  title: string,
  rcaEntity: { entityId: string; name: string } | null,
  impactedId: string,
): DynatraceProblem {
  const startTime = BASE + day * DAY;
  const type = entityTypeFromId(impactedId);
  return {
    problemId:       id,
    title,
    status:          'RESOLVED',
    severity:        'ERROR',
    startTime,
    endTime:         startTime + 30 * 60_000,
    duration:        30,
    impactedEntities: [{ entityId: impactedId, name: normalizeEntityName(impactedId, type), type }],
    rootCauseEntity: rcaEntity
      ? { entityId: rcaEntity.entityId, name: rcaEntity.name, type: 'SERVICE' }
      : undefined,
    hasRootCause:    rcaEntity !== null,
    affectedUsers:   0,
    managementZones: [],
    tags:            [],
  };
}

function run(name: string, fn: () => string | void): TestResult {
  const detail = fn() || undefined;
  return { name, detail };
}

export function runEntityGroupingTests(): TestResult[] {
  const results: TestResult[] = [];

  // ── DEF-01: normalizeEntityName regex covers digit-containing prefixes ──────

  results.push(run('normalizeEntityName strips standard SERVICE-* ID', () => {
    const result = normalizeEntityName('SERVICE-92A570370BFDA0FF', 'SERVICE');
    assertEqual(result, 'Unknown Service', 'SERVICE ID must be stripped to friendly fallback');
  }));

  results.push(run('normalizeEntityName strips K8S_DEPLOYMENT-* ID (digit in prefix)', () => {
    const result = normalizeEntityName('K8S_DEPLOYMENT-A940B8DEC94D8836', 'SERVICE');
    assert(result !== 'K8S_DEPLOYMENT-A940B8DEC94D8836', 'raw K8S entity ID must not pass through');
    assertEqual(result, 'Unknown Service', 'K8S_DEPLOYMENT ID must be stripped to friendly fallback');
  }));

  results.push(run('normalizeEntityName preserves real resolved entity names', () => {
    assertEqual(normalizeEntityName('TradeManagement', 'SERVICE'), 'TradeManagement', 'resolved name must be preserved');
    assertEqual(normalizeEntityName('BrokerService.broker-service.easytrade', 'SERVICE'), 'BrokerService.broker-service.easytrade', 'dotted resolved name must be preserved');
    assertEqual(normalizeEntityName('checkout-service', 'SERVICE'), 'checkout-service', 'hyphenated resolved name must be preserved');
  }));

  results.push(run('normalizeEntityName strips APPLICATION-* ID', () => {
    assertEqual(normalizeEntityName('APPLICATION-3599B023A7791056', 'APPLICATION'), 'Unknown Application', 'APPLICATION ID must be stripped');
  }));

  results.push(run('normalizeEntityName strips HOST-* ID', () => {
    assertEqual(normalizeEntityName('HOST-92031FE6D760F4D0', 'HOST'), 'Unknown Host', 'HOST ID must be stripped');
  }));

  results.push(run('normalizeEntityName strips SYNTHETIC_TEST-* ID', () => {
    assertEqual(normalizeEntityName('SYNTHETIC_TEST-587B308B85D7EE5F', 'SYNTHETIC_TEST'), 'Unknown Synthetic Monitor', 'SYNTHETIC_TEST ID must be stripped');
  }));

  // ── DEF-02: patternEntityKey uses entity ID for null-RCA fallback ────────────

  results.push(run('different SERVICE IDs produce different grouping keys', () => {
    const p1 = problem('P-A1', 0, 'Failure rate increase', null, 'SERVICE-92A570370BFDA0FF');
    const p2 = problem('P-A2', 1, 'Failure rate increase', null, 'SERVICE-B6E589E7DD95F9C9');
    const { patterns, oneOffs } = detectPatterns([p1, p2]);
    assertEqual(patterns.length, 0, 'two problems with different SERVICE IDs must not form a pattern');
    assertEqual(oneOffs.length, 2, 'both must be one-offs');
  }));

  results.push(run('same SERVICE ID groups into a recurring pattern', () => {
    const probs = [0, 1].map(d => problem(`P-B${d}`, d, 'Failure rate increase', null, 'SERVICE-92A570370BFDA0FF'));
    const { patterns, oneOffs } = detectPatterns(probs);
    assertEqual(patterns.length, 1, 'two problems with the same SERVICE ID must form one pattern');
    assertEqual(oneOffs.length, 0, 'no one-offs expected');
    assertEqual(patterns[0].occurrences, 2, 'pattern must have 2 occurrences');
  }));

  results.push(run('affectedServices uses entity ID so different deployments are never collapsed', () => {
    // Two different K8S deployments in two patterns must appear as distinct entries in the
    // affectedServices union so Services Impacted counts them separately.
    const probsA = [0, 1].map(d => problem(
      `P-KA${d}`, d, 'User action duration degradation',
      { entityId: 'SERVICE-RCA', name: 'BrokerService' },
      'K8S_DEPLOYMENT-AAAAAAAAAAAAAAAA',
    ));
    const probsB = [0, 1].map(d => problem(
      `P-KB${d}`, d, 'User action duration degradation',
      { entityId: 'SERVICE-RCA2', name: 'BrokerService' },
      'K8S_DEPLOYMENT-BBBBBBBBBBBBBBBB',
    ));
    const { patterns } = detectPatterns([...probsA, ...probsB]);
    const allServices = new Set(patterns.flatMap(p => p.affectedServices));
    assert(allServices.has('K8S_DEPLOYMENT-AAAAAAAAAAAAAAAA'), 'deployment A entity ID must appear in affectedServices');
    assert(allServices.has('K8S_DEPLOYMENT-BBBBBBBBBBBBBBBB'), 'deployment B entity ID must appear in affectedServices');
    assertEqual(allServices.size, 2, 'two different deployments must count as two distinct services');
  }));

  results.push(run('affectedServices uses entity ID for all impacted entities', () => {
    // Verify entity IDs (not friendly names) are used, so "Unknown Service" never masks distinct entities.
    const probs = [0, 1].map(d => problem(
      `P-SVC${d}`, d, 'Failure rate increase',
      { entityId: 'SERVICE-RCA', name: 'TradeManagement' },
      'SERVICE-92A570370BFDA0FF',
    ));
    const { patterns } = detectPatterns(probs);
    assertEqual(patterns.length, 1, 'pattern forms');
    assert(patterns[0].affectedServices.includes('SERVICE-92A570370BFDA0FF'), 'entity ID must appear in affectedServices, not friendly fallback');
    assert(!patterns[0].affectedServices.includes('Unknown Service'), '"Unknown Service" must not appear in affectedServices when entity ID is available');
  }));

  results.push(run('RCA-keyed patterns are unaffected by entity ID fix', () => {
    const probs = [0, 1, 2].map(d => problem(
      `P-RCA${d}`, d, 'Failure rate increase',
      { entityId: 'SERVICE-TM', name: 'TradeManagement' },
      'SERVICE-7B69F9302E2FC854',
    ));
    const { patterns, oneOffs } = detectPatterns(probs);
    assertEqual(patterns.length, 1, 'RCA-keyed pattern must still group');
    assertEqual(oneOffs.length, 0, 'no one-offs expected');
    assert(patterns[0].signature.includes('rca:trademanagement'), 'signature must use rca: prefix for resolved RCA name');
  }));

  results.push(run('problem with no entity becomes a one-off, not grouped with other no-entity problems', () => {
    const make = (id: string, day: number): DynatraceProblem => ({
      problemId:       id,
      title:           'Failure rate increase',
      status:          'RESOLVED',
      severity:        'ERROR',
      startTime:       BASE + day * DAY,
      endTime:         BASE + day * DAY + 30 * 60_000,
      duration:        30,
      impactedEntities: [],
      hasRootCause:    false,
      affectedUsers:   0,
      managementZones: [],
      tags:            [],
    });
    const { patterns, oneOffs } = detectPatterns([make('P-NE1', 0), make('P-NE2', 1)]);
    assertEqual(patterns.length, 0, 'two no-entity problems with the same title must not form a false pattern');
    assertEqual(oneOffs.length, 2, 'each must remain a one-off');
  }));

  // ── hht14598 dataset: accounting and KPI impact ──────────────────────────────

  results.push(run('hht14598 representative subset: pattern PF splits into two one-offs after fix', () => {
    // P-260730 (SERVICE-92A570370BFDA0FF) and P-260648 (SERVICE-B6E589E7DD95F9C9)
    // were the two members of the false Pattern PF. After DEF-02 they must be one-offs.
    const p260730 = problem('P-260730', 14, 'Failure rate increase', null, 'SERVICE-92A570370BFDA0FF');
    const p260648 = problem('P-260648', 0,  'Failure rate increase', null, 'SERVICE-B6E589E7DD95F9C9');
    const { patterns, oneOffs } = detectPatterns([p260730, p260648]);
    assertEqual(patterns.length, 0, 'P-260730 and P-260648 must not form a pattern after fix');
    assertEqual(oneOffs.length, 2, 'both must be one-offs');
  }));

  results.push(run('hht14598 representative subset: PA/PB/PC pattern grouping unchanged', () => {
    // PA: 2 failure-rate TradeManagement problems → still group (RCA-keyed, unaffected)
    const pa = [0, 1].map(d => problem(`PA${d}`, d, 'Failure rate increase',
      { entityId: 'SERVICE-TM', name: 'TradeManagement' }, 'SERVICE-7B69F9302E2FC854'));

    // PB: 2 user-action problems with null RCA, APPLICATION entity → now group on entity ID
    const pb = [0, 1].map(d => problem(`PB${d}`, d, 'User action duration degradation',
      null, 'APPLICATION-3599B023A7791056'));

    // PC: 2 BrokerService RCA problems → still group (RCA-keyed)
    const pc = [0, 1].map(d => problem(`PC${d}`, d, 'User action duration degradation',
      { entityId: 'SERVICE-BS', name: 'BrokerService.broker-service.easytrade' }, 'K8S_DEPLOYMENT-A940B8DEC94D8836'));

    const { patterns, oneOffs } = detectPatterns([...pa, ...pb, ...pc]);
    assertEqual(patterns.length, 3, 'PA, PB, and PC must each form a distinct pattern');
    assertEqual(oneOffs.length, 0, 'no one-offs expected');

    const paPattern = patterns.find(p => p.signature.includes('rca:trademanagement'));
    const pbPattern = patterns.find(p => p.signature.includes('entity:application-'));
    const pcPattern = patterns.find(p => p.signature.includes('rca:brokerservice'));
    assert(paPattern, 'PA (rca:trademanagement) must be detected');
    assert(pbPattern, 'PB (entity:application-*) must be detected by entity ID');
    assert(pcPattern, 'PC (rca:brokerservice) must be detected');
  }));

  results.push(run('total problem accounting: patterns + one-offs exhausts input', () => {
    const allProblems: DynatraceProblem[] = [
      // PA: 3 failure-rate TradeManagement
      ...[0,1,2].map(d => problem(`PA${d}`, d, 'Failure rate increase',
        { entityId: 'SERVICE-TM', name: 'TradeManagement' }, 'SERVICE-7B69F9302E2FC854')),
      // PB: 3 user-action null-RCA APPLICATION
      ...[0,1,2].map(d => problem(`PB${d}`, d, 'User action duration degradation',
        null, 'APPLICATION-3599B023A7791056')),
      // Two problems with different SERVICE IDs → 2 one-offs (was false pattern PF)
      problem('PF1', 0, 'Failure rate increase', null, 'SERVICE-92A570370BFDA0FF'),
      problem('PF2', 1, 'Failure rate increase', null, 'SERVICE-B6E589E7DD95F9C9'),
      // One singleton
      problem('ONE', 5, 'CPU saturation', null, 'HOST-92031FE6D760F4D0'),
    ];
    const { patterns, oneOffs } = detectPatterns(allProblems);
    const patternMembers = patterns.reduce((s, p) => s + p.occurrences, 0);
    assertEqual(
      patternMembers + oneOffs.length,
      allProblems.length,
      'pattern members + one-offs must equal total input',
    );
    assertEqual(patterns.length, 2, 'PA and PB form patterns; PF problems are now 2 one-offs');
    assertEqual(oneOffs.length, 3, 'PF1, PF2, and ONE must be one-offs');
  }));

  return results;
}
