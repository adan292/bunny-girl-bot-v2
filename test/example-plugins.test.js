import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseAdapter } from '../src/database/db-adapter.js';
import { validateRemoteUrl } from '../src/plugins/download.plugin.js';

test('economy store persists mutations atomically', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bunny-economy-'));
  const jid = '527711234567@s.whatsapp.net';
  const filename = join(directory, 'economy.sqlite');
  const database = new DatabaseAdapter({ filename });
  await database.initialize();
  await database.addBalance(jid, 250);

  const reloaded = new DatabaseAdapter({ filename });
  await reloaded.initialize();
  assert.equal((await reloaded.getUser(jid)).balance, 250);
  await database.close();
  await reloaded.close();
});

test('database adapter stores progress, cooldowns and group settings', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bunny-database-'));
  const database = new DatabaseAdapter({ filename: join(directory, 'bot.sqlite') });
  await database.initialize();
  const jid = '527711234567@s.whatsapp.net';
  const group = '12025550123@g.us';

  const user = await database.addExperience(jid, 400);
  assert.equal(user.level, 3);
  const allowed = await database.claimCooldown(jid, 'test', 60000, 1000);
  const blocked = await database.claimCooldown(jid, 'test', 60000, 2000);
  assert.equal(allowed.allowed, true);
  assert.equal(blocked.allowed, false);

  const settings = await database.updateGroupSettings(group, {
    prefix: '#',
    antilinkEnabled: true,
    welcomeEnabled: true,
  });
  assert.equal(settings.prefix, '#');
  assert.equal(settings.antilinkEnabled, true);
  assert.equal(settings.welcomeEnabled, true);
  await database.close();
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
