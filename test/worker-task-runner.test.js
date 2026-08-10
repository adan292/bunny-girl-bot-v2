import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WorkerTaskRunner } from '../src/core/worker-task-runner.js';

test('runs a pure operation outside the main thread boundary', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bunny-worker-'));
  const modulePath = join(directory, 'double.mjs');
  await writeFile(modulePath, 'export default async (value) => value * 2;');
  const runner = new WorkerTaskRunner({ maxConcurrent: 1, maxQueue: 2 });
  assert.equal(await runner.run({ moduleUrl: modulePath, input: 21 }), 42);
  await runner.close();
});
