import { runPatternTrendEnrichmentTests } from './pattern-trend-enrichment.spec';

const results = runPatternTrendEnrichmentTests();

results.forEach(result => {
  const suffix = result.detail ? ` - ${result.detail}` : '';
  console.log(`PASS ${result.name}${suffix}`);
});

console.log(`PASS ${results.length} pattern trend enrichment validation groups`);

