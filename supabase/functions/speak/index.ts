// Supabase Edge Function: голос Збышека. Принимает текст, возвращает WAV (24 кГц) в base64.
// Деплой: supabase functions deploy speak
import { speak } from '../_shared/gemini.ts';
import { VOICE_STYLE } from '../_shared/zbyszek.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const { text } = (await req.json()) as { text: string };
  try {
    return Response.json({ audio: await speak(text, VOICE_STYLE) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'tts_failed' }, { status: 502 });
  }
});
