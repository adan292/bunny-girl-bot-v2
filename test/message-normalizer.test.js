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
