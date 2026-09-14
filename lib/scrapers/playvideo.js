import fetch from "node-fetch";

export const playvid = {
  static: Object.freeze({
    baseUrl: "https://cnv.cx",
    headers: {
      "accept-encoding": "gzip, deflate, br, zstd",
      origin: "https://frame.y2meta-uk.com",
      "user-agent": "Mozilla/5.0"
    }
  }),

  resolvePayload(link, f = "360p") {
    const formatos = ["144p", "240p", "360p", "720p", "1080p"];
    if (!formatos.includes(f)) throw Error("⚠️ Formato inválido");
    return {
      link,
      format: "mp4",
      videoQuality: f.replace("p", ""),
      filenameStyle: "pretty",
      vCodec: "h264"
    };
  },

  sanitizeFileName(n) {
    const match = n.match(/\.[^.]+$/);
    const ext = match ? match[0] : ".mp4";
    const base = n.replace(ext, "")
      .replace(/[^A-Za-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .toLowerCase();
    return base + ext;
  },

  async getBuffer(u) {
    if (!/^https?:\/\//.test(u)) {
      throw Error(`⚠️ URL inválida: ${u}`);
    }
    const r = await fetch(u);
    if (!r.ok) throw Error("❌ No se pudo descargar el archivo");
    return Buffer.from(await r.arrayBuffer());
  },

  async getKey() {
    const r = await fetch(this.static.baseUrl + "/v2/sanity/key", { headers: this.static.headers });
    return r.json();
  },

  async convert(u, f) {
    const { key } = await this.getKey();
    const payload = this.resolvePayload(u, f);
    const r = await fetch(this.static.baseUrl + "/v2/converter", {
      method: "post",
      headers: { ...this.static.headers, key },
      body: new URLSearchParams(payload)
    });
    return r.json();
  },

  async download(u, f = "360p") {
    const { url, filename } = await this.convert(u, f);
    if (!url || !/^https?:\/\//.test(url)) {
      throw Error(`❌ URL inválida devuelta por convert: ${url}`);
    }
    const buffer = await this.getBuffer(url);
    return { buffer, fileName: this.sanitizeFileName(filename) };
  }
};