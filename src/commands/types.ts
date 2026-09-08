import type { proto } from '@whiskeysockets/baileys';
import type { WASocket } from '../types/wa';
import type { WhatsBot } from '../core/WhatsBot';

export interface CommandContext {
  bot: WhatsBot;
  sock: WASocket;
  msg: proto.IWebMessageInfo;
  chatJid: string;
  senderJid: string;
  args: string[];
  isOwner: boolean;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>;
