import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { name, position, company, interests } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `Write a professional 3-sentence email to ${name}, a ${position} at ${company}, interested in ${interests}. Focus on ROI.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data: any = await response.json();
    const draft = data.candidates[0].content.parts[0].text;
    return res.status(200).json({ draft });
  } catch (err) {
    return res.status(500).json({ error: "AI failed" });
  }
}