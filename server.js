import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';

const app = express();
const db = new Database('leadflow.db');

app.use(express.json());
app.use(cors());

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    email TEXT PRIMARY KEY,
    name TEXT,
    program TEXT,
    status TEXT,
    source TEXT
  )
`);

app.get('/api/leads', (req, res) => {
  const rows = db.prepare('SELECT * FROM leads').all();
  res.json(rows);
});

app.post('/api/leads', (req, res) => {
  const { name, email, program, status, source } = req.body;
  try {
    db.prepare('INSERT INTO leads (name, email, program, status, source) VALUES (?, ?, ?, ?, ?)')
      .run(name, email, program, status, source);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Lead already exists" });
  }
});

// The "Delete" tool - removes a lead based on its email
app.delete('/api/leads/:email', (req, res) => {
  const { email } = req.params;
  db.prepare('DELETE FROM leads WHERE email = ?').run(email);
  res.json({ success: true });
});

app.listen(3001, () => console.log('Backend server running on port 3001'));