import { randomInt } from 'node:crypto';
import { join, resolve } from 'node:path';
import { getSharedDatabase } from '../database/db-adapter.js';

const WORK_COOLDOWN_MS = 60 * 60 * 1000;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
async function getDatabase(config = {}) {
  const directory = resolve(
    config.economyDirectory
      ?? config.economyDir
      ?? './data/economy',
  );
  const filename = join(directory, 'bunny-girl-bot.sqlite');

  return getSharedDatabase({
    filename,
    logger: config.logger,
  });
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-MX').format(value);
}

function remainingText(milliseconds) {
  const minutes = Math.max(1, Math.ceil(milliseconds / 60000));
  return minutes >= 60
    ? `${Math.ceil(minutes / 60)} h`
    : `${minutes} min`;
}

async function runBalance({ database, jid, reply }) {
  const user = await database.getUser(jid);
  const balance = user?.balance ?? 0;

  await reply({
    text: `💰 Tu saldo es de *${formatMoney(balance)}* monedas.`,
  });
}

async function runWork({ database, jid, reply }) {
  const reward = randomInt(100, 501);
  const result = await database.claimCooldownAndApply(
    jid,
    'work',
    WORK_COOLDOWN_MS,
    {
      balanceDelta: reward,
      experienceDelta: reward,
    },
  );

  if (!result.allowed) {
    await reply({
      text: `⏳ Ya trabajaste recientemente. Intenta de nuevo en ${remainingText(result.remainingMs)}.`,
    });
    return;
  }

  await reply({
    text: `🛠️ Trabajaste y ganaste *${formatMoney(reward)}* monedas.\nSaldo: *${formatMoney(result.user.balance)}* · Nivel *${result.user.level}*.`,
  });
}

async function runDaily({ database, jid, reply }) {
  const reward = randomInt(1000, 1501);
  const result = await database.claimCooldownAndApply(
    jid,
    'daily',
    DAILY_COOLDOWN_MS,
    {
      balanceDelta: reward,
      experienceDelta: reward,
    },
  );

  if (!result.allowed) {
    await reply({
      text: `🎁 Ya reclamaste tu recompensa diaria. Regresa en ${remainingText(result.remainingMs)}.`,
    });
    return;
  }

  await reply({
    text: `🎁 Recibiste *${formatMoney(reward)}* monedas diarias.\nSaldo: *${formatMoney(result.user.balance)}* · Nivel *${result.user.level}*.`,
  });
}

export default {
  name: 'economy/core',
  commands: ['bal', 'balance', 'work', 'daily'],
  priority: 40,
  permissions: ['user'],
  async execute(context) {
    const jid = context.message.senderJid ?? context.message.remoteJid;

    try {
      const database = await getDatabase(context.config);

      switch (context.message.command) {
        case 'bal':
        case 'balance':
          await runBalance({
            database,
            jid,
            reply: context.reply,
          });
          break;

        case 'work':
          await runWork({
            database,
            jid,
            reply: context.reply,
          });
          break;

        case 'daily':
          await runDaily({
            database,
            jid,
            reply: context.reply,
          });
          break;

        default:
          return { handled: false };
      }
    } catch (error) {
      context.logger?.error?.({
        err: error,
        jid,
      }, 'Economy command failed');

      await context.reply({
        text: 'La economía está temporalmente no disponible. Intenta de nuevo más tarde.',
      });
    }

    return { handled: true };
  },
};

export {
  DAILY_COOLDOWN_MS,
  WORK_COOLDOWN_MS,
  formatMoney,
  getDatabase,
};
