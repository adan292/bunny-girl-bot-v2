/**
 * Llamada simple a Google Gemini (sin memoria, para narraciones/roles).
 * - Prioriza global.geminiRolKey (key dedicada al RPG/rol, si la configuras en config.private.js
 *   o en .env como GEMINI_ROL_KEY).
 * - Si no existe, cae a global.geminiKey (la misma que usa .ai).
 * - NUNCA tira excepción: si falla devuelve null para que el llamador use texto fallback.
 */

const GEMINI_ROLE_MAX_TOKENS = 220;

function getKeys() {
  const key =
    global.geminiRolKey ||
    process.env.GEMINI_ROL_KEY ||
    global.geminiKey ||
    '';
  const model =
    global.geminiRolModel ||
    process.env.GEMINI_ROL_MODEL ||
    global.geminiModel ||
    'gemini-flash-latest';
  return { key, model };
}

async function geminiGenerate(prompt, opts = {}) {
  const { key, model } = getKeys();
  if (!key) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: opts.temperature ?? 0.9,
        maxOutputTokens: opts.maxTokens ?? 400,
        candidateCount: 1,
        thinkingConfig: { thinkingBudget: 0, includeThoughts: false },
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(to);
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text.trim().slice(0, 600) || null;
  } catch {
    return null;
  }
}

export { geminiGenerate };
