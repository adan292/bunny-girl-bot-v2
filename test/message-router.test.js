import test from 'node:test';
import assert from 'node:assert/strict';
import { MessageRouter } from '../src/messaging/message-router.js';

function logger() {
  return {
    warn() {},
    error() {},
  };
}

test('router builds permission context from group metadata', async () => {
  let receivedContext;
  const router = new MessageRouter({
    config: {
      maxTextLength: 4096,
      maxInboundBatch: 10,
      maxPluginConcurrency: 1,
      maxPluginQueue: 10,
      permissionTimeoutMs: 1000,
      groupMetadataTtlMs: 1000,
    },
    ownerJids: ['5215555555555@s.whatsapp.net'],
    pluginManager: {
      async dispatch(context) {
        receivedContext = context;
      },
    },
    outboundQueue: {
      enqueue({ task }) {
        return task();
      },
    },
    diagnostics: {
      malformedMessage() {},
    },
    logger: logger(),
  });

  const socket = {
    user: { id: '5215555555555@s.whatsapp.net' },
    async groupMetadata() {
      return {
        participants: [
          { id: '5215555555555@s.whatsapp.net', admin: 'admin' },
          { id: '5216666666666@s.whatsapp.net', admin: 'superadmin' },
        ],
      };
    },
    async sendMessage() {},
  };

  await router.handleEvent({
    socket,
    event: {
      messages: [{
        key: {
          id: 'router-1',
          remoteJid: '12025550123@g.us',
          participant: '5215555555555@s.whatsapp.net',
        },
        message: { conversation: '.ban @user' },
      }],
    },
  });

  assert.equal(receivedContext.message.command, 'ban');
  assert.equal(receivedContext.permissions.owner, true);
  assert.equal(receivedContext.permissions.admin, true);
  assert.equal(receivedContext.permissions.botAdmin, true);
  router.close();
});
