import assert from 'node:assert/strict';
import { computeAHR } from './ahr.mjs';

async function run() {
  // Fabricated import (no package.json context) should return value=1.0
  const res1 = await computeAHR({ newImports: ['@nonexistent/package-xyz'] });
  assert.equal(res1.value, 1.0, 'fabricated import should give max AHR');
  assert.ok(res1.hallucinated.length > 0);

  // Empty
  const res0 = await computeAHR({ newImports: [] });
  assert.equal(res0.value, 0.0);

  // Internal import should not count
  const resInt = await computeAHR({ newImports: ['./foo', '../bar'] });
  assert.equal(resInt.value, 0.0);
  assert.equal(resInt.internal, 2);

  console.log('AHR production tests passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
