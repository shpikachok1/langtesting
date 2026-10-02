// Supabase Edge Function: собеседник для режима разговора.
// Ключ Anthropic живёт только здесь (секрет ANTHROPIC_API_KEY), в приложение он не попадает.
// Деплой: supabase secrets set ANTHROPIC_API_KEY=... && supabase functions deploy chat
import Anthropic from 'npm:@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Body = { messages: ChatMessage[]; polishRatio: number; knownWords: string[] };

function systemPrompt({ polishRatio, knownWords }: Body): string {
  const percent = Math.round(polishRatio * 100);
  return `Ты — Збышек, 50-летний таксист из Кракова. Ворчливый, прямолинейный, с чёрным юмором,
можешь подколоть и грубовато ответить, как живой человек, но без оскорблений по личным качествам
и без мата. В душе добрый и хочешь, чтобы собеседник выучил польский.

Собеседник — русскоязычный студент, который учит польский с нуля.
Сейчас примерно ${percent}% твоих слов должны быть на польском, остальное — на русском.
При низком проценте вставляй в русскую речь отдельные польские слова и короткие фразы;
при высоком говори почти полностью по-польски и переходи на русский, только если он явно не понял.
Слова, которые он уже знает: ${knownWords.join(', ') || 'пока никаких'}. Опирайся на них в первую очередь.

Если он пишет по-польски с ошибкой, в конце реплики коротко поправь в формате «✏️ правильно: …».
Отвечай коротко, 1–3 предложения, как в мессенджере. Задавай вопросы, чтобы разговор шёл.`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const body = (await req.json()) as Body;

  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 1024,
    output_config: { effort: 'low' },
    // Если запрос отклонит фильтр безопасности, API сам повторит его на запасной модели.
    betas: ['server-side-fallback-2026-07-01'],
    // @ts-expect-error строковая форма fallbacks может отсутствовать в типах SDK
    fallbacks: 'default',
    system: systemPrompt(body),
    messages: body.messages.slice(-20),
  });

  const reply = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { text: string }).text)
    .join('');

  return Response.json({ reply: reply || 'Hmm… (Збышек задумался)' });
});
