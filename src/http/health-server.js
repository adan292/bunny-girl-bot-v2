import { createServer } from 'node:http';

function json(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

export function createHealthServer({ host, port, logger, getStatus }) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const status = getStatus();

    if (req.method !== 'GET') {
      res.setHeader('allow', 'GET');
      json(res, 405, { error: 'method-not-allowed' });
      return;
    }

    if (url.pathname === '/healthz') {
      json(res, 200, { ok: true, service: 'bunny-girl-bot-v2', uptimeSeconds: Math.floor(process.uptime()) });
      return;
    }

    if (url.pathname === '/readyz') {
      const ready = status.connection === 'open';
      json(res, ready ? 200 : 503, { ready, ...status });
      return;
    }

    if (url.pathname === '/') {
      json(res, 200, { service: 'bunny-girl-bot-v2', ...status });
      return;
    }

    json(res, 404, { error: 'not-found' });
  });

  return {
    server,
    async start() {
      await new Promise((resolvePromise, reject) => {
        const onError = (error) => {
          server.off('listening', onListening);
          reject(error);
        };
        const onListening = () => {
          server.off('error', onError);
          resolvePromise();
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, host);
      });
      logger.info({ host, port }, 'Health server listening');
    },
    async close() {
      if (!server.listening) {
        return;
      }
      await new Promise((resolvePromise) => server.close(() => resolvePromise()));
    },
  };
}
