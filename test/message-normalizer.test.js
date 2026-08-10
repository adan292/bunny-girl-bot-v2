import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIncomingMessage } from '../src/messaging/message-normalizer.js';

test('normalizes text and removes zero-width/control payloads', () => {
  const result = normalizeIncomingMessage({
    key: { id: 'abc', remoteJid: '527711234567@s.whatsapp.net', fromMe: false },
    message: { conversation: '  .ping\u200B\u0000  ' },
  });
  assert.equal(result.accepted, true);
  assert.equal(result.message.text, '.ping');
});

test('unwraps common WhatsApp message wrappers', () => {
  const result = normalizeIncomingMessage({
    key: { id: 'wrapped', remoteJid: '12025550123@g.us' },
    message: { ephemeralMessage: { message: { extendedTextMessage: { text: '.menu' } } } },
  });
  assert.equal(result.message.text, '.menu');
});

test('rejects invalid jid and text bombs', () => {
  const invalidJid = normalizeIncomingMessage({ key: { id: 'bad', remoteJid: 'not-a-jid' }, message: { conversation: '.ping' } });
  assert.equal(invalidJid.accepted, false);
  assert.equal(invalidJid.reason, 'invalid-remote-jid');

  const textBomb = normalizeIncomingMessage({
    key: { id: 'bomb', remoteJid: '527711234567@s.whatsapp.net' },
    message: { conversation: 'x'.repeat(5000) },
  }, { maxTextLength: 1000 });
  assert.equal(textBomb.accepted, false);
  assert.equal(textBomb.reason, 'raw-text-too-large');
});

test('extracts command, quoted arguments, mentions and quote metadata', () => {
  const result = normalizeIncomingMessage({
    key: {
      id: 'command-1',
      remoteJid: '12025550123@g.us',
      participant: '527711234567@s.whatsapp.net',
    },
    message: {
      extendedTextMessage: {
        text: '.download "https://example.com/file.jpg" @user',
        contextInfo: {
          mentionedJid: ['5511999999999@s.whatsapp.net'],
          stanzaId: 'quoted-1',
          participant: '5215555555555@s.whatsapp.net',
          quotedMessage: {
            conversation: 'mensaje citado',
          },
        },
      },
    },
  });

  assert.equal(result.accepted, true);
  assert.equal(result.message.command, 'download');
  assert.deepEqual(result.message.args, ['https://example.com/file.jpg', '@user']);
  assert.deepEqual(result.message.mentions, ['5511999999999@s.whatsapp.net']);
  assert.equal(result.message.quoted.id, 'quoted-1');
  assert.equal(result.message.quoted.text, 'mensaje citado');
  assert.equal(result.message.isGroup, true);
});

test('normalizes decrypted poll results as command input', () => {
  const result = normalizeIncomingMessage({
    key: { id: 'poll-1', remoteJid: '527711234567@s.whatsapp.net' },
    message: {
      pollResultSnapshotMessage: {
        name: 'Economía',
        pollVotes: [{ optionName: '.bal', optionVoteCount: 1 }],
      },
    },
  });

  assert.equal(result.message.poll.type, 'result');
  assert.deepEqual(result.message.poll.selectedOptions, ['.bal']);
  assert.equal(result.message.command, 'bal');
});

test('normalizes button and list responses as command input', () => {
  const button = normalizeIncomingMessage({
    key: { id: 'button-1', remoteJid: '527711234567@s.whatsapp.net' },
    message: {
      buttonsResponseMessage: {
        selectedButtonId: '.bal',
        selectedDisplayText: 'Consultar saldo',
      },
    },
  });
  const list = normalizeIncomingMessage({
    key: { id: 'list-1', remoteJid: '527711234567@s.whatsapp.net' },
    message: {
      listResponseMessage: {
        title: 'Economía',
        singleSelectReply: { selectedRowId: '.daily' },
      },
    },
  });

  assert.equal(button.message.interactive.type, 'button');
  assert.equal(button.message.command, 'bal');
  assert.equal(list.message.interactive.type, 'list');
  assert.equal(list.message.command, 'daily');
});
