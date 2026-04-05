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

db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`);

// Shared bulk insert logic
function bulkInsertLeads(leads: any[]) {
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

  const transaction = db.transaction((data: any[]) => {
    for (const lead of data) {
      insert.run(now, now, {
        email: lead.email || '',
        name: lead.name || '',
        company: lead.company || '',
        job_title: lead.job_title || '',
        program: lead.program || '',
        status: lead.status || 'New',
      });
    }
  });

  transaction(leads);

  // Update last_imported timestamp
  db.prepare(`
    INSERT INTO meta (key, value) VALUES ('last_imported', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(now);

  return now;
}

// POST /api/leads — called by the frontend import handler
app.post('/api/leads', (req, res) => {
  try {
    const body = req.body;
    const leads = Array.isArray(body) ? body : [body];
    const timestamp = bulkInsertLeads(leads);
    res.json({ success: true, imported_at: timestamp });
  } catch (err: any) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/bulk — legacy alias
app.post('/api/leads/bulk', (req, res) => {
  try {
    const leads = req.body;
    const timestamp = bulkInsertLeads(leads);
    res.json({ success: true, imported_at: timestamp });
  } catch (err: any) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads — fetch all leads
app.get('/api/leads', (_req, res) => {
  // _req intentionally unused
  res.json(db.prepare('SELECT * FROM leads ORDER BY pasted_at DESC').all());
});

// PATCH /api/status — called by the frontend status toggle
app.patch('/api/status', (req, res) => {
  const { email, status } = req.body;
  db.prepare('UPDATE leads SET status = ? WHERE email = ?').run(status, email);
  res.json({ success: true });
});

// PATCH /api/leads/:email/status — legacy alias
app.patch('/api/leads/:email/status', (req, res) => {
  const { email } = req.params;
  const { status } = req.body;
  db.prepare('UPDATE leads SET status = ? WHERE email = ?').run(status, email);
  res.json({ success: true });
});

// GET /api/meta — returns last_imported timestamp
app.get('/api/meta', (_req, res) => {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'last_imported'").get() as { value: string } | undefined;
  res.json({ last_imported: row?.value || null });
});

// POST /api/leads/delete-multiple — bulk delete by emails
app.post('/api/leads/delete-multiple', (req, res) => {
  const { emails } = req.body;
  const deleteStmt = db.prepare('DELETE FROM leads WHERE email = ?');
  const transaction = db.transaction((ids: string[]) => {
    for (const id of ids) deleteStmt.run(id);
  });
  transaction(emails);
  res.json({ success: true });
});

app.listen(3001, () => console.log('🚀 ACE LeadFlow Server (GMT+8) on port 3001'));
