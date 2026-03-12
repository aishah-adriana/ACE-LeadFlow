import { sql } from '@vercel/postgres';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'PATCH') {
    const { email, status } = req.body;
    try {
      // Updates the status in your Neon cloud database
      await sql`UPDATE leads SET status = ${status} WHERE email = ${email}`;
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to update status" });
    }
  }
  return res.status(405).json({ message: 'Method not allowed' });
}