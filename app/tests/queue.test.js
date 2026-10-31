import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db/pool.js';
import { markJobFailed } from '../src/services/queue.js';

process.env.NODE_ENV = 'test';
const { runWorker } = await import('../src/services/queueWorker.js');

test('queue retries only structuring with bounded backoff and no provider text', async () => {
  const query = pool.query;
  let saved;
  pool.query = async (...args) => { saved = args; };
  try {
    await markJobFailed('synthetic', 'sensitive provider response');
    assert.match(saved[0], /type = 'structure_visit' AND attempts < 3/);
    assert.match(saved[0], /available_at = now\(\)/);
    assert.deepEqual(saved[1], ['synthetic']);
    assert.doesNotMatch(saved[0], /sensitive/);
  } finally { pool.query = query; }
});

test('worker drains active job before stopping and claims no additional job', async () => {
  const controller = new AbortController();
  let jobs = 0;
  let finished = false;
  await runWorker({ signal: controller.signal, processNext: async () => {
    jobs++;
    controller.abort();
    await Promise.resolve();
    finished = true;
    return true;
  } });
  assert.equal(jobs, 1);
  assert.equal(finished, true);
});

test('worker recovers from queue failures rather than terminating', async () => {
  const controller = new AbortController();
  let calls = 0;
  await runWorker({ signal: controller.signal, pollInterval: 1, processNext: async () => {
    calls++;
    if (calls === 1) throw new Error('synthetic');
    controller.abort();
    return false;
  } });
  assert.equal(calls, 2);
});
