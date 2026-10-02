// Supabase Edge Function: мозг Збышека на Gemini API.
// Ключ живёт только здесь (секрет GEMINI_API_KEY), в приложение он не попадает.
// Деплой: supabase secrets set GEMINI_API_KEY=... && supabase functions deploy chat
import { systemPrompt, type ChatRequest, type ZbyszekReply } from './prompt.ts';

const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash';
const API_KEY = Deno.env.get('GEMINI_API_KEY');
const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// Схема ответа: Gemini обязан вернуть ровно такой JSON.
const responseSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Реплика Збышека, смесь русского и польского по заданной доле' },
    translation: { type: 'string', description: 'Полный перевод реплики на русский' },
    emotion: { type: 'string', enum: ['neutral', 'grumpy', 'laughing', 'angry', 'impressed', 'facepalm'] },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          wrong: { type: 'string' },
          right: { type: 'string' },
          note: { type: 'string', description: 'Короткое объяснение по-русски' },
        },
        required: ['wrong', 'right', 'note'],
      },
    },
  },
  required: ['reply', 'translation', 'emotion', 'corrections'],
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const body = (await req.json()) as ChatRequest;

  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY ?? '' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(body) }] },
      contents: body.messages.slice(-20).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 1 },
      // Збышек матерится по задумке, поэтому фильтр грубости ослаблен до «только жёсткое».
      safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }],
    }),
  });

  if (!res.ok) {
    console.error('Gemini error', res.status, await res.text());
    return Response.json({ error: 'llm_failed' }, { status: 502 });
  }

  const data = await res.json();
  const text: string | undefined = data.candidates?.[0]?.content?.parts?.[0]?.text;
  try {
    return Response.json(JSON.parse(text ?? '') as ZbyszekReply);
  } catch {
    const fallback: ZbyszekReply = {
      reply: 'Kurwa, задумался. Повтори-ка.',
      translation: 'Блин, задумался. Повтори-ка.',
      emotion: 'facepalm',
      corrections: [],
    };
    return Response.json(fallback);
  }
});
