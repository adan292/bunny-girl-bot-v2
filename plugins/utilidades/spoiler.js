export default {
  name: ["spoiler"],
  description: "Envía un mensaje largo que WhatsApp trunca con 'Leer más' en la misma línea",
  category: "utils",
  ownerOnly: false,

  async run({ reply, text }) {
    if (!text) {
      return await reply({ text: "❌ Escribe el texto que quieres ocultar.\n\n*Ejemplo:* .spoiler la respuesta es 42" })
    }

    const partes = text.split("|").map(p => p.trim())
    const visible = partes[0]
    const oculto = partes[1] || partes[0]

    // Zero-width space: no ocupa espacio visual ni genera salto de línea,
    // así el "Leer más" queda pegado justo después del texto visible.
    const relleno = "\u200b".repeat(3000)

    const mensaje = `${visible}${relleno}${oculto}`

    await reply({ text: mensaje })
  }
}