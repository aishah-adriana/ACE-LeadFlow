import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { name, position, company, interests } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `You are Eizaz from Asia School of Business. Write a warm, 3-sentence email to ${name}, who is a ${position} at ${company}. 
  They are interested in: ${interests}. 
  Mention how these courses solve professional challenges for someone in their industry.
  Mention Prof Shardul (MIT PhD) if the course involves Operations or Systems.
  Sign off as Eizaz.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [{ category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" }]
      })
    });
    const data: any = await response.json();
    const draft = data.candidates?.[0]?.content?.parts?.[0]?.text || "Safety filter blocked. Try simplifying lead info.";
    return res.status(200).json({ draft });
  } catch (err) { return res.status(500).json({ draft: "AI Error" }); }
}