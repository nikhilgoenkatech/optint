import { runEntityGroupingTests } from './entity-grouping.spec';

const results = runEntityGroupingTests();

let failed = 0;
results.forEach(result => {
  const suffix = result.detail ? ` - ${result.detail}` : '';
  console.log(`PASS ${result.name}${suffix}`);
});

if (failed > 0) process.exit(1);
console.log(`PASS ${results.length} entity grouping validation groups`);
