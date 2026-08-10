import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCommandPoll,
  buildInteractiveListContent,
  buildLegacyListPayload,
  buildPollPayload,
} from '../src/messaging/interactive-builder.js';

test('builds native-flow lists and legacy fallback payloads', () => {
  const options = {
    body: 'Menú',
    footer: 'Bot',
    buttonText: 'Abrir',
    sections: [{
      title: 'Core',
      rows: [{ title: 'Ping', description: 'Latency', id: '.ping' }],
    }],
  };
  const content = buildInteractiveListContent(options);
  const button = content.viewOnceMessage.message.interactiveMessage.nativeFlowMessage.buttons[0];
  const params = JSON.parse(button.buttonParamsJson);
  const fallback = buildLegacyListPayload(options);

  assert.equal(button.name, 'single_select');
  assert.equal(params.sections[0].rows[0].id, '.ping');
  assert.equal(fallback.sections[0].rows[0].rowId, '.ping');
});

test('builds bounded poll and command map triggers', () => {
  const poll = buildPollPayload({ name: 'Choose', values: ['.bal', '.daily'] });
  const commandPoll = buildCommandPoll({
    title: 'Economy',
    commands: [
      { label: 'Saldo', command: '.bal' },
      { label: 'Diario', command: '.daily' },
    ],
  });

  assert.deepEqual(poll.poll.values, ['.bal', '.daily']);
  assert.equal(commandPoll.commandMap.get('Diario'), '.daily');
});
