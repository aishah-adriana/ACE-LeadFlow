import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. GET ALL LEADS
  if (req.method === 'GET') {
    const { rows } = await sql`SELECT * FROM leads ORDER BY pasted_at DESC`;
    return res.status(200).json(rows);
  }

  // 2. BULK IMPORT (Smart Merge)
  if (req.method === 'POST') {
    const leads = req.body;
    const now = new Date().toLocaleString('en-GB', { 
        day: '2-digit', month: 'short', year: 'numeric', 
        hour: '2-digit', minute: '2-digit', hour12: true, 
        timeZone: 'Asia/Kuala_Lumpur' 
    });

    for (const lead of leads) {
      await sql`
        INSERT INTO leads (email, name, company, job_title, program, status, pasted_at)
        VALUES (${lead.email}, ${lead.name}, ${lead.company}, ${lead.job_title}, ${lead.program}, 'New', ${now})
        ON CONFLICT (email) DO UPDATE SET
        program = CASE 
          WHEN leads.program NOT LIKE '%' || EXCLUDED.program || '%' 
          THEN leads.program || ', ' || EXCLUDED.program 
          ELSE leads.program END,
        pasted_at = ${now};
      `;
    }
    return res.status(200).json({ success: true });
  }

  // 3. DELETE MULTIPLE
  if (req.method === 'DELETE') {
    const { emails } = req.body;
    for (const email of emails) {
      await sql`DELETE FROM leads WHERE email = ${email}`;
    }
    return res.status(200).json({ success: true });
  }
}