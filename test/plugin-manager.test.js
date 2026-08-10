import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PluginManager } from '../src/plugins/plugin-manager.js';

function logger() {
  return {
    info() {},
    error() {},
    warn() {},
  };
}

test('loads and dispatches an ESM plugin', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bunny-plugins-'));
  await writeFile(join(directory, 'echo.plugin.js'), `export default { name: 'test/echo', priority: 1, match: '.echo', async execute({ reply }) { await reply({ text: 'ok' }); } };`);
  const manager = new PluginManager({ directory, logger: logger(), watchEnabled: false });
  await manager.loadAll();
  const sent = [];
  const result = await manager.dispatch({
    message: { id: '1', remoteJid: 'x@s.whatsapp.net', text: '.echo' },
    reply: async (payload) => sent.push(payload),
  }, { pluginFailure() {} });
  assert.equal(result.handled, true);
  assert.deepEqual(sent, [{ text: 'ok' }]);
  await manager.close();
});

test('keeps startup alive when one plugin has an invalid contract', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bunny-plugins-invalid-'));
  await writeFile(join(directory, 'invalid.plugin.js'), 'export default { name: "invalid" };');
  const manager = new PluginManager({ directory, logger: logger(), watchEnabled: false });
  await manager.loadAll();
  assert.deepEqual(manager.list(), []);
  await manager.close();
});

test('matches declared commands and denies missing permissions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'bunny-plugins-permissions-'));
  await writeFile(join(directory, 'admin.plugin.js'), `export default { name: 'test/admin', command: 'ban', permissions: ['admin'], async execute() { throw new Error('must not execute'); } };`);
  const manager = new PluginManager({ directory, logger: logger(), watchEnabled: false });
  await manager.loadAll();
  const sent = [];
  const result = await manager.dispatch({
    message: { id: '2', remoteJid: 'x@g.us', text: '.ban', command: 'ban' },
    permissions: { user: true, admin: false, botAdmin: false, owner: false },
    reply: async (payload) => sent.push(payload),
  }, { pluginFailure() {} });
  assert.equal(result.denied, true);
  assert.match(sent[0].text, /administrador/iu);
  await manager.close();
});
