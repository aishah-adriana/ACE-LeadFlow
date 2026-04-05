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
          pipeline.set(`lead:${lead.email}`, lead);
        }
      });
      
      await pipeline.exec();
      return res.status(200).json({ success: true, count: leads.length });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}