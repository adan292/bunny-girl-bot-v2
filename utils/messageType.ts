import type { proto } from '@whiskeysockets/baileys';

export function getMessageType(message: proto.IMessage | null | undefined): string {
  if (!message) return 'unknown';

  const m = message.ephemeralMessage?.message ?? message.viewOnceMessage?.message ?? message;

  if (m.conversation || m.extendedTextMessage) return 'text';
  if (m.imageMessage) return 'image';
  if (m.videoMessage) return m.videoMessage.gifPlayback ? 'gif' : 'video';
  if (m.stickerMessage) return 'sticker';
  if (m.audioMessage) return m.audioMessage.ptt ? 'voice' : 'audio';
  if (m.documentMessage || m.documentWithCaptionMessage) return 'document';
  if (m.contactMessage || m.contactsArrayMessage) return 'contact';
  if (m.locationMessage || m.liveLocationMessage) return 'location';
  if (m.reactionMessage) return 'reaction';
  if (m.pollCreationMessage || (m as any).pollCreationMessageV3) return 'poll';
  if (m.buttonsResponseMessage || m.listResponseMessage || m.templateButtonReplyMessage) {
    return 'button_reply';
  }
  if (m.protocolMessage) return 'protocol';

  return 'other';
}

export function getTextContent(message: proto.IMessage | null | undefined): string {
  if (!message) return '';
  const m = message.ephemeralMessage?.message ?? message.viewOnceMessage?.message ?? message;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  ).trim();
}
