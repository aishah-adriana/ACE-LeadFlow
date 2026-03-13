import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, position, company, interests } = req.body;

  const prompt = `
    You are a professional executive education advisor. 
    Write a short, high-impact email (max 3 sentences) to ${name}, who is a ${position} at ${company}.
    They have shown interest in the following courses: ${interests}.
    Tone: Professional, persuasive, and helpful. 
    Mention how these specific courses align with their background as a ${position}.
    Do not include placeholders like [Your Name]. Just the body text.
  `;

  try {
    // Note: You will need to add your API_KEY to Vercel Environment Variables
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await res.json();
    const draft = data.candidates[0].content.parts[0].text;
    
    return res.status(200).json({ draft });
  } catch (err) {
    return res.status(500).json({ error: "AI Generation failed" });
  }
}