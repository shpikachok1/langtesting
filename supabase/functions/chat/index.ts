// Supabase Edge Function: текстовый чат со Збышеком.
// Ключ живёт только в секретах (GEMINI_API_KEY), в приложение он не попадает.
// Деплой: supabase functions deploy chat
import { generateJson, toContents } from '../_shared/gemini.ts';
import { FALLBACK_REPLY, replySchema, systemPrompt, type ChatRequest, type ZbyszekReply } from '../_shared/zbyszek.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const body = (await req.json()) as ChatRequest;
  try {
    const reply = await generateJson<ZbyszekReply>(systemPrompt(body), toContents(body.messages.slice(-20)), replySchema);
    return Response.json(reply);
  } catch (e) {
    console.error(e);
    return Response.json(FALLBACK_REPLY);
  }
});
