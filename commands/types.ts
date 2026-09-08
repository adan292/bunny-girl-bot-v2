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
  commands: Map<string, CommandDefinition>;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void>;

export interface CommandDefinition {
  name: string;
  aliases?: string[];
  description: string;
  ownerOnly?: boolean;
  handler: CommandHandler;
}
