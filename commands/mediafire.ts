import { WASocket, proto } from '@whiskeysockets/baileys';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function mediafireCommand(sock: WASocket, msg: proto.IWebMessageInfo, args: string[]) {
  const chatId = msg.key.remoteJid!;
  const link = args[0];

  if (!link ||!link.includes('mediafire.com')) {
    return sock.sendMessage(chatId, { text: '*Mai*: Hmph... pásame un link de Mediafire válido. Ejemplo:\n.mediafire https://www.mediafire.com/file/...' }, { quoted: msg });
  }

  await sock.sendMessage(chatId, { text: '*Mai*: Buscando el archivo... no me apures. Sakura~' }, { quoted: msg });

  try {
    const { data } = await axios.get(link);
    const $ = cheerio.load(data);

    const nombre = $('div.filename').text().trim() || 'archivo';
    const tamaño = $('div.dl-info div:nth-child(2) span').text().trim() || 'Desconocido';
    const downloadLink = $('a#downloadButton').attr('href');

    if (!downloadLink) throw new Error('No se encontró el link');

    await sock.sendMessage(chatId, { text: `*Mai*: Lo encontré:\n\n*Nombre*: ${nombre}\n*Tamaño*: ${tamaño}\n\nDescargando... t-toma.` }, { quoted: msg });

    const response = await axios.get(downloadLink, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    let mimetype = 'application/octet-stream';
    if (nombre.endsWith('.mp4')) mimetype = 'video/mp4';
    if (nombre.endsWith('.mp3')) mimetype = 'audio/mpeg';
    if (nombre.endsWith('.jpg') || nombre.endsWith('.jpeg')) mimetype = 'image/jpeg';
    if (nombre.endsWith('.png')) mimetype = 'image/png';
    if (nombre.endsWith('.pdf')) mimetype = 'application/pdf';
    if (nombre.endsWith('.zip')) mimetype = 'application/zip';
    if (nombre.endsWith('.apk')) mimetype = 'application/vnd.android.package-archive';

    await sock.sendMessage(chatId, {
      document: buffer,
      fileName: nombre,
      mimetype: mimetype,
      caption: `*🐰 Archivo de Mediafire*\n\n*Nombre*: ${nombre}\n*Tamaño*: ${tamaño}\n\nHmph... aquí tienes.`
    }, { quoted: msg });

  } catch (error) {
    console.error(error);
    await sock.sendMessage(chatId, { text: '*Mai*: Baka... no pude descargar eso. El link puede estar caído, es privado o pesa más de 100MB.' }, { quoted: msg });
  }
}
