import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { hasResidualPhi, redactPhi } from '../src/privacy/phiRedact.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(path.join(__dirname, '../evals/phi/fixtures.json'), 'utf8'),
);

describe('PHI eval fixtures', () => {
  for (const c of fixtures.cases) {
    it(c.id, () => {
      const { redacted, findings } = redactPhi(c.input);
      for (const forbidden of c.must_not_contain) {
        assert.equal(
          redacted.includes(forbidden),
          false,
          `${c.id}: still contains ${forbidden}`,
        );
      }
      for (const required of c.must_contain) {
        assert.equal(redacted.includes(required), true, `${c.id}: missing ${required}`);
      }
      if (c.id.startsWith('phi-clean')) {
        assert.equal(findings.length, 0);
      } else if (!c.id.includes('clean')) {
        assert.equal(hasResidualPhi(redacted), false);
      }
    });
  }
});
