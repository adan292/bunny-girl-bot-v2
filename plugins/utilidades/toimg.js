import fs from "fs"
import path from "path"
import crypto from "crypto"
import { fileURLToPath } from "url"
import { promisify } from "util"
import { exec } from "child_process"
import { downloadMediaMessage } from "@whiskeysockets/baileys"

const execAsync = promisify(exec)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const tmp = path.join(__dirname, "../../tmp")

if (!fs.existsSync(tmp))
  fs.mkdirSync(tmp, { recursive: true })

export default {
  name: ["toimg"],
  description: "Convierte un sticker a imagen",
  category: "utils",

  async run({ sock, from, msg, react, reply }) {
    try {
      await react("🖼️")

      const contextInfo =
        msg.message?.extendedTextMessage?.contextInfo

      const quoted = contextInfo?.quotedMessage
      const quotedType = quoted
        ? Object.keys(quoted)[0]
        : null

      if (quotedType !== "stickerMessage") {
        return reply({
          text: "❌ Responde a un sticker con *.toimg*"
        })
      }

      const quotedMsg = {
        key: {
          remoteJid: from,
          id: contextInfo?.stanzaId,
          participant: contextInfo?.participant
        },
        message: quoted
      }

      const buffer = await downloadMediaMessage(
        quotedMsg,
        "buffer",
        {},
        { sock }
      )

      const id = crypto.randomBytes(8).toString("hex")

      const input = path.join(tmp, `toimg_${id}.webp`)
      const output = path.join(tmp, `toimg_${id}.png`)

      fs.writeFileSync(input, buffer)

      await execAsync(
        `ffmpeg -i "${input}" "${output}" -y`
      )

      const imageBuffer = fs.readFileSync(output)

      await sock.sendMessage(
        from,
        {
          image: imageBuffer,
          caption: "✅ Sticker convertido a imagen"
        },
        { quoted: msg }
      )

      try { fs.unlinkSync(input) } catch {}
      try { fs.unlinkSync(output) } catch {}

      await react("✅")

    } catch (e) {
      console.error("TOIMG:", e)

      await react("❌")

      await reply({
        text: `❌ ${e.message}`
      })
    }
  }
}