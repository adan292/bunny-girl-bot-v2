  getGroup: db_instance.prepare("SELECT data FROM groups WHERE jid = ?"),
  insertGroup: db_instance.prepare("INSERT INTO groups (jid, data) VALUES (?, ?)"),
  updateGroup: db_instance.prepare("UPDATE groups SET data = ? WHERE jid = ?"),
