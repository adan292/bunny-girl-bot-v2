import express from 'express';
import cors from 'cors';

const app = express();

// En producción, restringe origin a tu frontend en vez de '*'
app.use(cors({ origin: '*' }));

app.get('/api/yta', async (req, res) => {
  try {
    const apiKey = process.env.LEMPI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing API key on server. Set LEMPI_API_KEY.' });
    }

    const resp = await fetch(`https://api.lempi.lat/dl/yta?apikey=${encodeURIComponent(apiKey)}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => resp.statusText);
      return res.status(resp.status).send(txt);
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Proxy request failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
