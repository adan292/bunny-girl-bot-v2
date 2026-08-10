import test from 'node:test';
import assert from 'node:assert/strict';
import { BoundedTaskPool, SerialTaskQueue } from '../src/messaging/serial-queue.js';

test('serial queue preserves task order after asynchronous work', async () => {
  const queue = new SerialTaskQueue();
  const order = [];
  const first = queue.add(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    order.push('first');
  });
  const second = queue.add(() => order.push('second'));
  await Promise.all([first, second]);
  assert.deepEqual(order, ['first', 'second']);
});

test('serial queue continues after a rejected task', async () => {
  const queue = new SerialTaskQueue();
  await assert.rejects(queue.add(() => { throw new Error('expected'); }), /expected/);
  const value = await queue.add(() => 42);
  assert.equal(value, 42);
});

test('bounded pool rejects after its queue limit', async () => {
  const pool = new BoundedTaskPool({ concurrency: 1, maxQueue: 1 });
  let release;
  const blocker = pool.run(() => new Promise((resolve) => { release = resolve; }));
  const queued = pool.run(() => 'queued');
  await assert.rejects(pool.run(() => 'overflow'), /queue limit/);
  release();
  await blocker;
  assert.equal(await queued, 'queued');
  pool.close();
});
