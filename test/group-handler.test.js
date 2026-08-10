import test from 'node:test';
import assert from 'node:assert/strict';
import { GroupHandler } from '../src/messaging/group-handler.js';

function logger() {
  return { warn() {}, error() {} };
}

test('group handler deletes links and optionally removes the offender', async () => {
  const deleted = [];
  const removed = [];
  const handler = new GroupHandler({
    database: {
      async getGroupSettings() {
        return {
          welcomeEnabled: false,
          goodbyeEnabled: false,
          antilinkEnabled: true,
          welcomeText: null,
          goodbyeText: null,
        };
      },
    },
    outboundQueue: {
      enqueue({ task }) {
        return task();
      },
    },
    logger: logger(),
    config: { antilinkRemoveUser: true },
  });
  const socket = {
    user: { id: '5216666666666@s.whatsapp.net' },
    async groupMetadata() {
      return {
        participants: [
          { id: '5215555555555@s.whatsapp.net' },
          { id: '5216666666666@s.whatsapp.net', admin: 'admin' },
        ],
      };
    },
    async sendMessage(jid, payload) {
      deleted.push({ jid, payload });
    },
    async groupParticipantsUpdate(jid, participants, action) {
      removed.push({ jid, participants, action });
    },
  };

  await handler.handleAntiLink(socket, {
    messages: [{
      key: {
        id: 'link-1',
        remoteJid: '12025550123@g.us',
        participant: '5215555555555@s.whatsapp.net',
        fromMe: false,
      },
      message: { conversation: 'Mira https://example.com' },
    }],
  });

  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].payload.delete.id, 'link-1');
  assert.deepEqual(removed[0].participants, ['5215555555555@s.whatsapp.net']);
  assert.equal(removed[0].action, 'remove');
  handler.close();
});

test('group handler sends welcome events with mentions', async () => {
  const sent = [];
  const handler = new GroupHandler({
    database: {
      async getGroupSettings() {
        return {
          welcomeEnabled: true,
          goodbyeEnabled: false,
          welcomeText: 'Bienvenido {{user}} a {{group}}',
          goodbyeText: null,
          antilinkEnabled: false,
        };
      },
    },
    outboundQueue: {
      enqueue({ task }) {
        return task();
      },
    },
    logger: logger(),
  });
  const socket = {
    async groupMetadata() {
      return { subject: 'Grupo de prueba', participants: [] };
    },
    async sendMessage(jid, payload) {
      sent.push({ jid, payload });
    },
  };

  await handler.handleParticipantsUpdate(socket, {
    id: '12025550123@g.us',
    action: 'add',
    participants: ['527711234567@s.whatsapp.net'],
  });

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].payload.mentions, ['527711234567@s.whatsapp.net']);
  assert.match(sent[0].payload.text, /Bienvenido/iu);
  handler.close();
});
