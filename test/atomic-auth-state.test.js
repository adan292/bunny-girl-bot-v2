import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAtomicFileAuthState } from '../src/auth/atomic-file-auth-state.js';

const logger = { trace() {}, warn() {}, error() {} };

test('persists creds and signal keys through atomic files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bunny-auth-'));
  const auth = await createAtomicFileAuthState({ directory: root, logger });
  auth.state.creds.registered = true;
  await auth.saveCreds();
  await auth.state.keys.set({ session: { first: Buffer.from('secret') } });
  const result = await auth.state.keys.get('session', ['first']);
  assert.equal(Buffer.from(result.first).toString(), 'secret');
  const credsOnDisk = JSON.parse(await readFile(join(root, 'creds.json'), 'utf8'));
  assert.equal(credsOnDisk.registered, true);
  await auth.close();
});
