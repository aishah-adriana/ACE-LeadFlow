import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';

const app = express();
const db = new Database('leadflow.db');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    email TEXT PRIMARY KEY,
    name TEXT,
    company TEXT,
    job_title TEXT,
    program TEXT,
    status TEXT DEFAULT 'New',
    pasted_at DATETIME
  )
`);

app.post('/api/leads/bulk', (req, res) => {
  const leads = req.body;
  
  // Explicitly set to Malaysian Time (GMT+8)
  const now = new Date().toLocaleString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kuala_Lumpur' 
  });

  const insert = db.prepare(`
    INSERT INTO leads (email, name, company, job_title, program, status, pasted_at)
    VALUES (@email, @name, @company, @job_title, @program, @status, ?)
    ON CONFLICT(email) DO UPDATE SET
    program = CASE 
      WHEN leads.program NOT LIKE '%' || excluded.program || '%' 
      THEN leads.program || ', ' || excluded.program 
      ELSE leads.program END,
    pasted_at = ?
  `);

  const transaction = db.transaction((data) => {
    for (const lead of data) insert.run(now, now, lead);
  });
  
  transaction(leads);
  res.json({ success: true });
});

app.get('/api/leads', (req, res) => {
  res.json(db.prepare('SELECT * FROM leads ORDER BY pasted_at DESC').all());
});

app.patch('/api/leads/:email/status', (req, res) => {
  const { email } = req.params;
  const { status } = req.body;
  db.prepare('UPDATE leads SET status = ? WHERE email = ?').run(status, email);
  res.json({ success: true });
});

app.post('/api/leads/delete-multiple', (req, res) => {
  const { emails } = req.body;
  const deleteStmt = db.prepare('DELETE FROM leads WHERE email = ?');
  const transaction = db.transaction((ids) => {
    for (const id of ids) deleteStmt.run(id);
  });
  transaction(emails);
  res.json({ success: true });
});

app.listen(3001, () => console.log('🚀 ACE LeadFlow Server (GMT+8) on 3001'));