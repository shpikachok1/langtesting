// Supabase Edge Function: голосовой звонок со Збышеком.
// Приложение присылает запись твоей фразы, Gemini её слушает, отвечает как Збышек
// и разбирает ошибки и произношение. Голос ответа приложение берёт отдельно из функции speak,
// чтобы субтитры появлялись сразу, не дожидаясь озвучки.
// Деплой: supabase functions deploy call
import { generateJson, toContents } from '../_shared/gemini.ts';
import { FALLBACK_REPLY, replySchema, systemPrompt, type ChatRequest, type ZbyszekReply } from '../_shared/zbyszek.ts';

type CallRequest = ChatRequest & { audio: string; mimeType: string };
type CallReply = ZbyszekReply & {
  /** Что Gemini услышал в твоей записи. */
  heard: string;
  pronunciation: { word: string; issue: string; tip: string }[];
};

const callSchema = {
  ...replySchema,
  properties: {
    heard: { type: 'string', description: 'Дословная расшифровка того, что сказал собеседник, как услышал' },
    ...replySchema.properties,
    pronunciation: {
      type: 'array',
      description: 'Слова, которые он произнёс плохо. Пусто, если всё нормально или он говорил по-русски',
      items: {
        type: 'object',
        properties: {
          word: { type: 'string' },
          issue: { type: 'string', description: 'Что не так, по-русски: например «sz произнёс как с»' },
          tip: { type: 'string', description: 'Как исправить, коротко по-русски' },
        },
        required: ['word', 'issue', 'tip'],
      },
    },
  },
  required: ['heard', ...replySchema.required, 'pronunciation'],
};

const VOICE_RULES = `
Это голосовой звонок. Последнее сообщение собеседника — аудиозапись: сначала дословно расшифруй её в heard.
Оцени произношение польских слов как строгий преподаватель: носовые ą/ę, шипящие sz/cz/rz/ż/ś/ć/ź,
ł, ударение на предпоследний слог. Плохо произнесённые слова клади в pronunciation, можешь поржать над ними в reply.
reply будет озвучен голосом: пиши так, как говорят вслух, без эмодзи, скобок и списков.`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 });
  const body = (await req.json()) as CallRequest;

  try {
    const contents = toContents(body.messages.slice(-20));
    contents.push({ role: 'user', parts: [{ inlineData: { mimeType: body.mimeType, data: body.audio } }] });
    return Response.json(await generateJson<CallReply>(systemPrompt(body) + VOICE_RULES, contents, callSchema));
  } catch (e) {
    console.error(e);
    return Response.json({ ...FALLBACK_REPLY, heard: '', pronunciation: [] } satisfies CallReply);
  }
});
