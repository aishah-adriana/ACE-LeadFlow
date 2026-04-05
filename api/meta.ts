import { createClient } from '@vercel/kv';
import { VercelRequest, VercelResponse } from '@vercel/node';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const last_imported = await kv.get<string>('meta:last_imported');
      return res.status(200).json({ last_imported: last_imported || null });
    } catch {
      return res.status(200).json({ last_imported: null });
    }
  }

  if (req.method === 'POST') {
    try {
      const { last_imported } = req.body;
      await kv.set('meta:last_imported', last_imported);
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).end();
}
