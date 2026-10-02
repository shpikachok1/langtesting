// Тонкая обёртка над Gemini REST API. Вся работа с провайдером LLM живёт здесь.

const API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const TEXT_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3.8-flash';
export const TTS_MODEL = Deno.env.get('GEMINI_TTS_MODEL') ?? 'gemini-3.8-flash-tts';
export const TTS_VOICE = Deno.env.get('GEMINI_TTS_VOICE') ?? 'Charon';

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };
export type Content = { role: 'user' | 'model'; parts: Part[] };

async function generate(model: string, body: unknown) {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${await res.text()}`);
  return await res.json();
}

/** Запрос, на который модель обязана ответить JSON-ом по схеме. */
export async function generateJson<T>(system: string, contents: Content[], schema: unknown): Promise<T> {
  const data = await generate(TEXT_MODEL, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 1 },
    // Збышек матерится по задумке, поэтому фильтр грубости ослаблен до «только жёсткое».
    safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' }],
  });
  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
}

/** Озвучить текст. Возвращает WAV (24 кГц, моно) в base64. */
export async function speak(text: string, style: string): Promise<string> {
  const data = await generate(TTS_MODEL, {
    contents: [{ role: 'user', parts: [{ text: `${style}: ${text}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: TTS_VOICE } } },
    },
  });
  const audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audio) throw new Error('Gemini TTS returned no audio');
  return audio;
}

export function toContents(messages: { role: 'user' | 'assistant'; content: string }[]): Content[] {
  return messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
}
