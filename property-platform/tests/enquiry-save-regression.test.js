import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const js = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
test('enquiry save reads fields from clicked card rather than generated IDs', () => {
  assert.match(js, /button\.closest\('\.enquiry-card'\)/);
  assert.match(js, /card\?\.querySelector\('\.admin-form select'\)/);
  assert.match(js, /button\.dataset\.enquiry\?\.trim\(\)/);
});
test('saved enquiry refreshes inbox after API success', () => {
  assert.match(js, /await api\('\/admin\/enquiries\/'/);
  assert.match(js, /await admin\(\);\s*notice\('Enquiry saved/);
});
