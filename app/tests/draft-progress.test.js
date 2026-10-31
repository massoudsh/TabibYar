import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../public/js/draft-progress.js', import.meta.url), 'utf8');

async function setup(result, httpStatus = 200) {
  const status = {};
  const retry = { addEventListener() {}, hidden: true };
  const timers = [];
  let reloads = 0;
  const context = {
    document: {
      hidden: false, addEventListener() {},
      getElementById: id => id === 'draft-progress' ? { dataset: { visitId: 'synthetic' }, querySelector: () => status } : retry,
      querySelector: () => ({ content: 'synthetic' }),
    },
    window: { addEventListener() {}, location: { reload: () => { reloads++; } } },
    fetch: async () => ({ ok: httpStatus === 200, status: httpStatus, json: async () => result }),
    setTimeout: (fn, delay) => { timers.push({ fn, delay }); }, clearTimeout() {},
  };
  vm.runInNewContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return { timers, reloads, status, retry };
}

test('ready reloads once without further polling', async () => {
  const app = await setup({ status: 'ready' });
  assert.equal(app.reloads, 1);
  assert.equal(app.timers.length, 0);
});
test('failed job exposes retry and stops polling', async () => {
  const app = await setup({ status: 'failed' });
  assert.equal(app.retry.hidden, false);
  assert.equal(app.timers.length, 0);
});
test('processing schedules bounded polling; lost authorization stops it', async () => {
  const app = await setup({ status: 'processing' });
  assert.equal(app.timers[0].delay, 2000);
  assert.equal((await setup({}, 401)).timers.length, 0);
});
