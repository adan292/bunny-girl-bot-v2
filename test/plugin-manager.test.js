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
