import test from 'node:test';
import assert from 'node:assert/strict';
import { OutboundQueue } from '../src/messaging/outbound-queue.js';

function logger() {
  return {
    warn() {},
    error() {},
  };
}

test('outbound queue executes operations sequentially', async () => {
  const queue = new OutboundQueue({
    logger: logger(),
    globalPerSecond: 1000,
    perChatPerSecond: 1000,
    maxQueue: 10,
  });
  const order = [];

  const first = queue.enqueue({
    jid: '1@s.whatsapp.net',
    task: async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('first');
      return 1;
    },
  });
  const second = queue.enqueue({
    jid: '1@s.whatsapp.net',
    task: async () => {
      order.push('second');
      return 2;
    },
  });

  assert.deepEqual(await Promise.all([first, second]), [1, 2]);
  assert.deepEqual(order, ['first', 'second']);
  await queue.onIdle();
  queue.close();
});

test('outbound queue rejects saturation and aborts waiting work on close', async () => {
  const queue = new OutboundQueue({
    logger: logger(),
    globalPerSecond: 0.1,
    perChatPerSecond: 0.1,
    maxQueue: 1,
  });

  const first = queue.enqueue({
    jid: '2@s.whatsapp.net',
    task: async () => 'first',
  });

  await assert.rejects(
    queue.enqueue({
      jid: '2@s.whatsapp.net',
      task: async () => 'overflow',
    }),
    /Outbound queue limit exceeded/,
  );

  await first;
  queue.close();
  assert.equal(queue.size, 0);
});
