import fetch from "node-fetch";

export const playaudio = {
  static: Object.freeze({
    baseUrl: "https://cnv.cx",
    headers: {
      "accept-encoding": "gzip, deflate, br, zstd",
      origin: "https://frame.y2meta-uk.com",
      "user-agent": "Mozilla/5.0"
    }
  }),

  resolvePayload(link, f = "128k") {
    if (!["128k", "320k"].includes(f)) throw Error("⚠️ Formato inválido");
    return {
      link,
      format: "mp3",
      audioBitrate: f.replace("k", ""),
      filenameStyle: "pretty"
    };
  },

  sanitizeFileName(n) {
    const ext = n.match(/\.[^.]+$/)[0];
    const base = n.replace(ext, "")
      .replace(/[^A-Za-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .toLowerCase();
    return base + ext;
  },

  async getBuffer(u) {
    // Validar que la URL sea absoluta
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

  async download(u, f = "128k") {
    const { url, filename } = await this.convert(u, f);

    // Validar que la URL devuelta por el convert sea absoluta
    if (!url || !/^https?:\/\//.test(url)) {
      throw Error(`❌ URL inválida devuelta por convert: ${url}`);
    }

    const buffer = await this.getBuffer(url);
    return { buffer, fileName: this.sanitizeFileName(filename) };
  }
};