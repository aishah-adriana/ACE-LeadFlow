import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || process.env.REDIS_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN || '',
});

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const keys = await kv.keys('lead:*');
      if (!keys || keys.length === 0) return res.status(200).json([]);
      const pipeline = kv.pipeline();
      keys.forEach(key => pipeline.get(key));
      const leads = await pipeline.exec();
      return res.status(200).json(leads);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const leads = Array.isArray(req.body) ? req.body : [req.body];
      const pipeline = kv.pipeline();
      leads.forEach((lead: any) => {
        if (lead && lead.email) {
          pipeline.set(`lead:${lead.email.toLowerCase()}`, lead);
        }
      });
      await pipeline.exec();

      // Save import timestamp
      const now = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Kuala_Lumpur',
      });
      await kv.set('meta:last_imported', now);

      return res.status(200).json({ success: true, count: leads.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { emails } = req.body;
      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'No emails provided' });
      }
      const pipeline = kv.pipeline();
      emails.forEach((email: string) => pipeline.del(`lead:${email.toLowerCase()}`));
      await pipeline.exec();
      return res.status(200).json({ success: true, deleted: emails.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
