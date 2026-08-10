import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EconomyStore } from '../src/plugins/economy.plugin.js';
import { validateRemoteUrl } from '../src/plugins/download.plugin.js';

test('economy store persists mutations atomically', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bunny-economy-'));
  const jid = '527711234567@s.whatsapp.net';
  const store = new EconomyStore(directory);
  await store.initialize();

  await store.mutate(jid, async (user) => {
    user.balance += 250;
    return { changed: true };
  });

  const reloaded = new EconomyStore(directory);
  await reloaded.initialize();
  assert.equal(reloaded.getUser(jid).balance, 250);
});

test('download plugin rejects private and unsupported URL targets', async () => {
  await assert.rejects(
    validateRemoteUrl('file:///etc/passwd'),
    (error) => error.code === 'DOWNLOAD_UNSUPPORTED_PROTOCOL',
  );
  await assert.rejects(
    validateRemoteUrl('http://127.0.0.1:8080/private'),
    (error) => error.code === 'DOWNLOAD_PRIVATE_ADDRESS',
  );
});
