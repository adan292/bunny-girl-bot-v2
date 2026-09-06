// Cliente: llama a tu propio proxy en el backend, NO expongas la apikey en el frontend.
async function fetchYta() {
  try {
    const res = await fetch('/api/yta', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      throw new Error(`API error ${res.status}: ${txt}`);
    }

    const data = await res.json();
    console.log('Datos recibidos:', data);
    return data;
  } catch (err) {
    console.error('Error al obtener yta:', err);
    throw err;
  }
}

fetchYta();
