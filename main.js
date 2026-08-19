import ws from 'ws';
import moment from 'moment';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import {
  getCachedMeta,
  setCachedMeta,
  BoundedMap
} from '#serialize';

import db from '#db';

const prefixCache = new BoundedMap(300, 0);

/* =========================================================
   UTILIDADES
========================================================= */

function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSafeText(msg) {
  return typeof msg?.text === 'string' ? msg.text.trim() : '';
}

function getBotJid(sock) {
  const id = sock?.user?.id;

  if (!id) return '';

  return `${id.split(':')[0]}@s.whatsapp.net`;
}

/* =========================================================
   PREFIJOS
========================================================= */

function getBotPrefixRegex(botJid, settings = {}) {
  const sig = `${settings.namebot || ''}|${settings.type || ''}|${JSON.stringify(settings.prefix ?? '')}`;

  const cached = prefixCache.get(botJid);

  if (cached && cached.sig === sig) {
    return cached;
  }

  const rawBotname = settings.namebot || 'Bot';
  const tipo = settings.type || 'Sub';

  const cleanBotname =
    String(rawBotname).replace(/[^a-zA-Z0-9\s]/g, '').trim();

  const namebot = cleanBotname || 'Bunny Girl';

  const firstWord = namebot.split(/\s+/)[0] || namebot;

  const shortForms = [
    namebot,
    namebot.charAt(0),
    firstWord,
    tipo.split(/\s+/)[0],
    firstWord.slice(0, 2),
    firstWord.slice(0, 3)
  ]
    .filter(Boolean)
    .map(escapeRegex);

  const prefixes = [...new Set(shortForms)];

  let prefix;

  if (Array.isArray(settings.prefix)) {

    const prefixArray = settings.prefix
      .filter(p => typeof p === 'string' && p.length > 0)
      .map(escapeRegex);

    if (prefixArray.length) {
      prefix = new RegExp(
        `^(?:${prefixes.join('|')})?(?:${prefixArray.join('|')})`,
        'i'
      );
    } else {
      prefix = new RegExp(
        `^(?:${prefixes.join('|')})?`,
        'i'
      );
    }

  } else if (typeof settings.prefix === 'string') {

    prefix = new RegExp(
      `^(?:${prefixes.join('|')})?${escapeRegex(settings.prefix)}`,
      'i'
    );

  } else if (settings.prefix === 1) {

    prefix = /^/i;

  } else {

    prefix = new RegExp(
      `^(?:${prefixes.join('|')})?`,
      'i'
    );
  }

  const entry = {
    sig,
    regex: prefix,
    namebot
  };

  prefixCache.set(botJid, entry);

  return entry;
}

/* =========================================================
   CUSTOM PREFIX
========================================================= */

let customPrefixCache = {
  size: -1,
  list: []
};

function getCustomPrefixCmds() {

  if (!global.comandos || !(global.comandos instanceof Map)) {
    return [];
  }

  if (customPrefixCache.size !== global.comandos.size) {

    customPrefixCache = {
      size: global.comandos.size,
      list: [...global.comandos].filter(
        ([, data]) => data?.customPrefix
      )
    };
  }

  return customPrefixCache.list;
}

/* =========================================================
   SESIONES
========================================================= */

function getAllSessionBots() {

  const bots = [];

  if (Array.isArray(global.conns)) {

    for (const c of global.conns) {

      if (c?.userId) {

        const jid = c.userId.includes('@')
          ? c.userId
          : `${c.userId}@s.whatsapp.net`;

        bots.push(jid);
      }
    }
  }

  const ownerId = global.sock?.user?.id?.split(':')[0];

  if (ownerId) {
    bots.push(`${ownerId}@s.whatsapp.net`);
  }

  return [...new Set(bots)];
}

/* =========================================================
   EJECUTAR PLUGINS
========================================================= */

async function executePlugins(list, data, label) {

  if (!Array.isArray(list) || !list.length) {
    return;
  }

  await Promise.allSettled(
    list.map(async p => {

      try {

        if (typeof p?.fn !== 'function') {
          return;
        }

        await p.fn(data);

      } catch (error) {

        console.error(
          chalk.gray(
            `[ ✿ ] Error ${label}-plugin ${p?.key || 'unknown'}: ${error?.message || error}`
          )
        );
      }
    })
  );
}

/* =========================================================
   HANDLER PRINCIPAL
========================================================= */

export default async (sock, msg) => {

  try {

    /* -----------------------------------------------------
       DATOS BÁSICOS
    ----------------------------------------------------- */

    const sender = msg?.sender;
    const from = msg?.key?.remoteJid;

    if (!sender || !from) {
      return;
    }

    const botJid = getBotJid(sock);

    if (!botJid) {
      console.error(
        chalk.red('[ BOT ] No se pudo obtener el JID del bot.')
      );

      return;
    }

    const textMessage = getSafeText(msg);

    const chatId = msg.chat || from;

    const chat = db.getChat(chatId);
    const settings = db.getSettings(botJid);

    const user = db.getUser(sender);
    const users = db.getChatUser(chatId, sender);

    const pushname =
      msg.pushName ||
      user?.name ||
      'Sin nombre';

    /* -----------------------------------------------------
       OWNER
    ----------------------------------------------------- */

    const owners = Array.isArray(global.owner)
      ? global.owner.map(num =>
          String(num).replace(/\D/g, '') + '@s.whatsapp.net'
        )
      : [];

    const isOwner = owners.includes(sender);

    const botOwners = [
      botJid,
      ...(settings?.owner
        ? [settings.owner]
        : []),
      ...owners
    ];

    const isROwner = botOwners.includes(sender);

    /* -----------------------------------------------------
       METADATA DEL GRUPO
    ----------------------------------------------------- */

    let groupMetadata = null;
    let groupName = '';

    if (msg.isGroup) {

      groupMetadata = getCachedMeta(chatId);

      if (!groupMetadata) {

        groupMetadata = await sock
          .groupMetadata(chatId)
          .catch(() => null);

        if (groupMetadata) {
          setCachedMeta(chatId, groupMetadata);
        }
      }

      groupName =
        groupMetadata?.subject ||
        '';
    }

    const participants =
      groupMetadata?.participants || [];

    /* -----------------------------------------------------
       ADMINISTRADORES
    ----------------------------------------------------- */

    const adminSet = new Set();

    for (const p of participants) {

      if (
        p?.admin === 'admin' ||
        p?.admin === 'superadmin'
      ) {

        const ids = [
          p?.id,
          p?.lid,
          p?.phoneNumber
        ];

        for (const id of ids) {

          if (!id) continue;

          adminSet.add(
            String(id).split('@')[0]
          );
        }
      }
    }

    const senderBase =
      String(sender).split('@')[0];

    const botBase =
      String(botJid).split('@')[0];

    const isBotAdmins =
      msg.isGroup
        ? adminSet.has(botBase)
        : false;

    const isAdmins =
      msg.isGroup
        ? adminSet.has(senderBase)
        : false;

    /* -----------------------------------------------------
       PLUGINS ALL
    ----------------------------------------------------- */

    await executePlugins(
      (global.cmdsExecute ?? [])
        .filter(p => p?.type === 'all'),
      {
        msg,
        sock,
        groupMetadata,
        participants,
        isAdmins,
        isBotAdmins,
        isOwner,
        __dirname: null
      },
      'all'
    );

    /* -----------------------------------------------------
       ESTADÍSTICAS
    ----------------------------------------------------- */

    const today = new Date()
      .toLocaleDateString(
        'es-CO',
        {
          timeZone: 'America/Bogota',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }
      )
      .split('/')
      .reverse()
      .join('-');

    if (!users.stats) {
      users.stats = {};
    }

    if (!users.stats[today]) {

      users.stats[today] = {
        msgs: 0,
        cmds: 0
      };
    }

    users.stats[today].msgs++;

    db.setChatUser(
      chatId,
      sender,
      'stats',
      users.stats
    );

    /* -----------------------------------------------------
       PREFIJO
    ----------------------------------------------------- */

    const {
      regex: prefix,
      namebot
    } = getBotPrefixRegex(
      botJid,
      settings || {}
    );

    let customCmd = null;
    let pluginPrefix = prefix;

    /* -----------------------------------------------------
       CUSTOM COMMAND PREFIX
    ----------------------------------------------------- */

    for (const [cmdName, data] of getCustomPrefixCmds()) {

      const cp = data?.customPrefix;

      if (!cp) continue;

      const tests = [];

      if (cp instanceof RegExp) {

        const flags =
          cp.flags.replace('g', '');

        const regex =
          new RegExp(cp.source, flags);

        tests.push([regex.exec(textMessage), regex]);

      } else if (Array.isArray(cp)) {

        for (const p of cp) {

          let regex;

          if (p instanceof RegExp) {

            regex = new RegExp(
              p.source,
              p.flags.replace('g', '')
            );

          } else if (typeof p === 'string') {

            regex = new RegExp(
              escapeRegex(p)
            );

          } else {

            continue;
          }

          tests.push([
            regex.exec(textMessage),
            regex
          ]);
        }

      } else if (typeof cp === 'string') {

        const regex =
          new RegExp(
            escapeRegex(cp)
          );

        tests.push([
          regex.exec(textMessage),
          regex
        ]);
      }

      const found =
        tests.find(x => x[0]);

      if (found) {

        customCmd = cmdName;
        pluginPrefix = found[1];

        break;
      }
    }

    /* -----------------------------------------------------
       MATCH PREFIJO
    ----------------------------------------------------- */

    let match = null;

    if (pluginPrefix instanceof RegExp) {

      const regex = new RegExp(
        pluginPrefix.source,
        pluginPrefix.flags.replace('g', '')
      );

      const result =
        regex.exec(textMessage);

      if (result) {
        match = [result, regex];
      }

    } else if (Array.isArray(pluginPrefix)) {

      const results =
        pluginPrefix
          .map(p => {

            const regex =
              p instanceof RegExp
                ? new RegExp(
                    p.source,
                    p.flags.replace('g', '')
                  )
                : new RegExp(
                    escapeRegex(p)
                  );

            return [
              regex.exec(textMessage),
              regex
            ];
          })
          .filter(x => x[0]);

      match =
        results[0] || null;

    } else if (
      typeof pluginPrefix === 'string'
    ) {

      const regex =
        new RegExp(
          escapeRegex(pluginPrefix)
        );

      const result =
        regex.exec(textMessage);

      if (result) {
        match = [result, regex];
      }
    }

    /* -----------------------------------------------------
       BEFORE PLUGINS
    ----------------------------------------------------- */

    const botprimaryId =
      chat?.primaryBot;

    if (
      !botprimaryId ||
      botprimaryId === botJid
    ) {

      await executePlugins(
        (global.cmdsExecute ?? [])
          .filter(p => p?.type === 'before'),
        {
          msg,
          sock,
          match,
          groupMetadata,
          participants,
          isAdmins,
          isBotAdmins,
          isOwner,
          __dirname: null
        },
        'before'
      );
    }

    /* -----------------------------------------------------
       SI NO HAY PREFIJO
    ----------------------------------------------------- */

    if (!match) {
      return;
    }

    /*
     * IMPORTANTE:
     * No usamos:
     *
     * if (msg.isCommands) return;
     *
     * porque puede bloquear los comandos.
     */

    /* -----------------------------------------------------
       OBTENER COMANDO
    ----------------------------------------------------- */

    const usedPrefix =
      match?.[0]?.[0] || '';

    const commandText =
      textMessage
        .slice(usedPrefix.length)
        .trim();

    if (!commandText) {
      return;
    }

    const parts =
      commandText
        .split(/\s+/)
        .filter(Boolean);

    let command =
      customCmd ??
      (parts.shift() || '');

    command =
      command
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const args = parts;

    const text =
      args.join(' ');

    if (!command) {
      return;
    }

    /* -----------------------------------------------------
       LOG
    ----------------------------------------------------- */

    if (
      !botprimaryId ||
      botprimaryId === botJid
    ) {

      console.log(
        chalk.bold.blue(
`╭────────────────────────────···
│ ${chalk.cyan('Bot')}: ${chalk.greenBright(botJid)}
│ ${chalk.bold.yellow('Fecha')}: ${chalk.yellowBright(moment().format('DD/MM/YY HH:mm:ss'))}
│ ${chalk.bold.blueBright('Usuario')}: ${chalk.blueBright(pushname)}
│ ${chalk.bold.magentaBright('Remitente')}: ${chalk.magentaBright(sender)}
${msg.isGroup
  ? '│' + chalk.bold.green(' Grupo') + ': ' + chalk.greenBright(groupName)
  : '│' + chalk.bold.green(' Privado') + ': ' + chalk.magentaBright('Chat Privado')}
${'│' + chalk.bold.magenta(' ID') + ': ' + chalk.blueBright(msg.isGroup ? from : 'Chat Privado')}
│ ${chalk.bold.cyanBright('Comando usado')}: ${chalk.gray(command)}
╰────────────────────────────···`
        )
      );
    }

    /* -----------------------------------------------------
       PREFIX REAL
    ----------------------------------------------------- */

    let hasPrefix = false;

    if (settings?.prefix === 1) {

      hasPrefix = true;

    } else if (Array.isArray(settings?.prefix)) {

      hasPrefix =
        settings.prefix.some(p =>
          typeof p === 'string' &&
          textMessage.startsWith(p)
        );

    } else if (
      typeof settings?.prefix === 'string'
    ) {

      hasPrefix =
        textMessage.startsWith(
          settings.prefix
        );
    }

    /* -----------------------------------------------------
       BOT PRIMARIO
    ----------------------------------------------------- */

    if (
      botprimaryId &&
      botprimaryId !== botJid
    ) {

      if (hasPrefix) {

        const groupJids =
          participants
            .flatMap(p => [
              p?.id,
              p?.lid,
              p?.phoneNumber
            ])
            .filter(Boolean);

        const sessionBots =
          getAllSessionBots();

        const primaryInGroup =
          groupJids.includes(botprimaryId);

        const isPrimarySelf =
          botprimaryId === botJid;

        const primaryInSessions =
          sessionBots.includes(botprimaryId);

        if (
          !primaryInSessions ||
          !primaryInGroup
        ) {
          return;
        }

        if (
          primaryInSessions &&
          primaryInGroup
        ) {
          return;
        }

        if (isPrimarySelf) {
          return;
        }
      }
    }

    /* -----------------------------------------------------
       MODO SELF
    ----------------------------------------------------- */

    if (
      !isROwner &&
      settings?.self
    ) {
      return;
    }

    /* -----------------------------------------------------
       COMANDOS PERMITIDOS EN PRIVADO
    ----------------------------------------------------- */

    if (
      chatId &&
      !chatId.endsWith('@g.us')
    ) {

      const cmds = [
        'allmenu',
        'help',
        'menu',
        'infobot',
        'botinfo',
        'invite',
        'invitar',
        'ping',
        'speed',
        'p',
        'status',
        'estado',
        'report',
        'reporte',
        'sug',
        'suggest',
        'token',
        'join',
        'unir',
        'logout',
        'reload',
        'self',
        'setbanner',
        'setbotbanner',
        'setchannel',
        'setbotchannel',
        'setbotcurrency',
        'setcurrency',
        'seticon',
        'setboticon',
        'setlink',
        'setbotlink',
        'setbotname',
        'setname',
        'setbotowner',
        'setowner',
        'setimage',
        'setpfp',
        'setprefix',
        'setbotprefix',
        'setstatus',
        'setusername',
        'code',
        'qr',
        'codepremium',
        'qrpremium',
        'codemod',
        'qrmod'
      ];

      if (
        !isOwner &&
        !cmds.includes(command)
      ) {
        return;
      }
    }

    /* -----------------------------------------------------
       BOT DESACTIVADO
    ----------------------------------------------------- */

    if (
      chat?.isBanned &&
      !(
        command === 'bot' &&
        text === 'on'
      ) &&
      !isOwner
    ) {

      await msg.reply(
`ꕥ El bot *${settings?.namebot || settings?.botname || 'Bunny Girl'}* está desactivado en este grupo.

> ✎ Un *administrador* puede activarlo con el comando:
> » *${usedPrefix}bot on*`
      );

      return;
    }

    /* -----------------------------------------------------
       SOLO ADMIN
    ----------------------------------------------------- */

    if (
      chat?.adminonly &&
      !isAdmins
    ) {
      return;
    }

    /* -----------------------------------------------------
       BUSCAR COMANDO
    ----------------------------------------------------- */

    if (
      !global.comandos ||
      !(global.comandos instanceof Map)
    ) {

      console.error(
        chalk.red(
          '[ BOT ] global.comandos no está inicializado.'
        )
      );

      return;
    }

    const cmdData =
      global.comandos.get(command);

    /* -----------------------------------------------------
       COMANDO INEXISTENTE
    ----------------------------------------------------- */

    if (!cmdData) {

      if (settings?.prefix === 1) {
        return;
      }

      await sock
        .readMessages([msg.key])
        .catch(() => {});

      return msg.reply(
`ꕤ El comando *${command}* no existe.
✎ Usa *${usedPrefix}help* para ver la lista de comandos disponibles.`
      );
    }

    /* -----------------------------------------------------
       OWNER
    ----------------------------------------------------- */

    if (
      cmdData.isOwner &&
      !isOwner
    ) {

      if (settings?.prefix === 1) {
        return;
      }

      return msg.reply(
`ꕤ El comando *${command}* no existe.
✎ Usa *${usedPrefix}help* para ver la lista de comandos disponibles.`
      );
    }

    /* -----------------------------------------------------
       ADMIN
    ----------------------------------------------------- */

    if (
      cmdData.isAdmin &&
      !isAdmins
    ) {

      return sock.reply(
        msg.chat,
        '《✧》 Este comando solo puede ser ejecutado por los Administradores del Grupo.',
        msg
      );
    }

    /* -----------------------------------------------------
       BOT ADMIN
    ----------------------------------------------------- */

    if (
      cmdData.botAdmin &&
      !isBotAdmins
    ) {

      return sock.reply(
        msg.chat,
        '《✧》 Este comando solo puede ser ejecutado si el Socket es Administrador del Grupo.',
        msg
      );
    }

    /* -----------------------------------------------------
       EJECUTAR C
