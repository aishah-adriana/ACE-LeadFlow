import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const { rows } = await sql`SELECT * FROM leads ORDER BY pasted_at DESC`;
      return res.status(200).json(rows);
    } catch (err) { return res.status(500).json({ error: "Fetch failed" }); }
  }

  if (req.method === 'POST') {
    try {
      const leads = req.body;
      const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Singapore' });

      // PARALLEL BATCH PROCESSING: This fires all requests at once
      await Promise.all(leads.map(async (lead: any) => {
        const existing = await sql`SELECT program FROM leads WHERE email = ${lead.email}`;
        const incomingStatus = lead.status || 'New';

        if (existing.rowCount > 0) {
          const oldPrograms = existing.rows[0].program.split(', ');
          const updatedPrograms = oldPrograms.includes(lead.program) 
            ? oldPrograms 
            : [...oldPrograms, lead.program];

          return sql`
            UPDATE leads 
            SET program = ${updatedPrograms.join(', ')}, 
                status = ${incomingStatus}, 
                pasted_at = ${timestamp}
            WHERE email = ${lead.email}
          `;
        } else {
          return sql`
            INSERT INTO leads (email, name, company, job_title, program, status, pasted_at)
            VALUES (${lead.email}, ${lead.name}, ${lead.company}, ${lead.job_title}, ${lead.program}, ${incomingStatus}, ${timestamp})
          `;
        }
      }));

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Import failed" });
    }
  }

  if (req.method === 'DELETE') {
    const { emails } = req.body;
    await sql`DELETE FROM leads WHERE email = ANY(${emails})`;
    return res.status(200).json({ success: true });
  }
}