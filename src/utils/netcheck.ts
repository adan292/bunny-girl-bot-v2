import { logStatus, color } from './logger';

/**
 * Antes de intentar conectar con WhatsApp, probamos si el contenedor tiene
 * salida a internet en general, hacia dominios de WhatsApp con HTTPS
 * normal, Y con una conexión WebSocket real (que es lo que Baileys
 * necesita de verdad — HTTPS normal puede pasar aunque el "upgrade" a
 * WebSocket esté bloqueado por un proxy/firewall más restrictivo). Esto da
 * un diagnóstico concreto directo en la consola del panel, sin necesitar
 * acceso a una terminal real.
 */

async function checkHttps(label: string, url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(6000),
    });
    logStatus('Red', '', `${label}: ${color.green}OK${color.reset} (status ${res.status})`, 'ok');
    return true;
  } catch (err: any) {
    const reason = err?.name === 'TimeoutError' ? 'tiempo agotado (6s)' : err?.message ?? String(err);
    logStatus('Red', '', `${label}: ${color.red}FALLÓ${color.reset} — ${reason}`, 'error');
    return false;
  }
}

async function tryWebSocket(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };

    const timeout = setTimeout(() => {
      try {
        ws.close();
      } catch {}
      finish(false);
    }, 6000);

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      clearTimeout(timeout);
      finish(false);
      return;
    }

    ws.addEventListener('open', () => {
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {}
      finish(true);
    });
    ws.addEventListener('error', () => {
      clearTimeout(timeout);
      finish(false);
    });
  });
}

async function checkWebSocket(): Promise<boolean> {
  // Dos servidores públicos de eco distintos: si uno está caído/migrado
  // (le ha pasado a echo.websocket.org en el pasado) no queremos concluir
  // "está bloqueado" por un solo servicio de prueba fallando por su cuenta.
  const candidates = ['wss://echo.websocket.org', 'wss://ws.postman-echo.com/raw'];
  for (const url of candidates) {
    if (await tryWebSocket(url)) return true;
  }
  return false;
}

export async function checkNetwork(): Promise<void> {
  logStatus('Red', '', 'Probando conectividad de salida...', 'info');

  const internetOk = await checkHttps('Internet general (google.com)', 'https://www.google.com');
  const whatsappHttpsOk = await checkHttps('HTTPS a WhatsApp (web.whatsapp.com)', 'https://web.whatsapp.com');

  logStatus('Red', '', 'Probando WebSocket real (esto es lo que Baileys necesita, no HTTPS normal)...', 'info');
  const wsOk = await checkWebSocket();
  logStatus(
    'Red',
    '',
    `WebSocket saliente: ${wsOk ? `${color.green}OK${color.reset}` : `${color.red}FALLÓ${color.reset}`}`,
    wsOk ? 'ok' : 'error',
  );

  if (!internetOk) {
    logStatus(
      'Red',
      '',
      'No hay salida a internet en absoluto desde este contenedor. Esto es un problema del hosting/panel, no del código — habla con el proveedor.',
      'error',
    );
  } else if (!whatsappHttpsOk) {
    logStatus(
      'Red',
      '',
      'Hay internet general, pero los dominios de WhatsApp están bloqueados o filtrados. Pregúntale al proveedor si permiten conexiones salientes hacia *.whatsapp.com / *.whatsapp.net.',
      'error',
    );
  } else if (!wsOk) {
    logStatus(
      'Red',
      '',
      'HTTPS normal funciona, pero las conexiones WebSocket salientes NO. Esto es justo lo que necesita Baileys para hablar con WhatsApp — es casi seguro la causa del "401 Connection Failure". Pregúntale al proveedor específicamente si permiten conexiones WebSocket (no solo HTTP) salientes desde el contenedor.',
      'error',
    );
  } else {
    logStatus('Red', '', 'Conectividad completa (HTTPS + WebSocket): OK. Si igual falla la conexión, ya no es un tema de red.', 'ok');
  }
}
