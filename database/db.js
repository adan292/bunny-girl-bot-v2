  // 💰 ECONOMÍA — Fragmentos
  getEco(jid) {
    const user = getUser(jid);
    return {
      bolsillo: user.bolsillo ?? 0,
      banco: user.banco ?? 0,
      inventario: user.inventario ?? [],
      lastWork: user.lastWork ?? 0
    };
  },
