import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';

const app = express();
const db = new Database('leadflow.db');

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '50mb' }));

// Initialize Database with Company column
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    email TEXT PRIMARY KEY,
    name TEXT,
    company TEXT,
    program TEXT,
    status TEXT DEFAULT 'New',
    source TEXT,
    pasted_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.post('/api/leads/bulk', (req, res) => {
  const leads = req.body;
  const now = new Date().toISOString();
  if (!Array.isArray(leads)) return res.status(400).json({ error: "Invalid data" });

  try {
    const insert = db.prepare(`
      INSERT INTO leads (email, name, company, program, status, source, pasted_at)
      VALUES (@email, @name, @company, @program, @status, @source, ?)
      ON CONFLICT(email) DO UPDATE SET
      company = excluded.company,
      program = CASE 
        WHEN leads.program NOT LIKE '%' || excluded.program || '%' 
        THEN leads.program || ' & ' || excluded.program 
        ELSE leads.program END,
      pasted_at = ?
    `);

    const transaction = db.transaction((data) => {
      for (const lead of data) insert.run(now, now, lead);
    });
    transaction(leads);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save" });
  }
});

app.get('/api/leads', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM leads ORDER BY pasted_at DESC').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json([]);
  }
});

app.post('/api/leads/delete-multiple', (req, res) => {
  const { emails } = req.body;
  try {
    const deleteStmt = db.prepare('DELETE FROM leads WHERE email = ?');
    const deleteMany = db.transaction((ids) => {
      for (const id of ids) deleteStmt.run(id);
    });
    deleteMany(emails);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Delete failed" });
  }
});

app.patch('/api/leads/:email/status', (req, res) => {
  const { email } = req.params;
  const { status } = req.body;
  db.prepare('UPDATE leads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?').run(status, email);
  res.json({ success: true });
});

app.listen(3001, () => console.log('🚀 ENGINE READY ON PORT 3001'));