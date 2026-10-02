// Вызовы серверных функций Supabase. Адрес берётся из EXPO_PUBLIC_CHAT_URL (…/functions/v1/chat),
// остальные функции лежат рядом: …/functions/v1/call, …/functions/v1/speak.

const CHAT_URL = process.env.EXPO_PUBLIC_CHAT_URL;
// Публичный anon-ключ Supabase: без него функции отвечают 401. Это не секрет, ключ Gemini лежит на сервере.
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const FUNCTIONS_URL = CHAT_URL?.replace(/\/chat\/?$/, '');

export const serverConfigured = Boolean(CHAT_URL);

export async function callFunction<T>(name: 'chat' | 'call' | 'speak', body: unknown): Promise<T> {
  if (!FUNCTIONS_URL) throw new Error('EXPO_PUBLIC_CHAT_URL не задан');
  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

export type Correction = { wrong: string; right: string; note: string };
export type Pronunciation = { word: string; issue: string; tip: string };
export type ZbyszekReply = {
  reply: string;
  translation: string;
  emotion: string;
  corrections: Correction[];
};
export type CallReply = ZbyszekReply & { heard: string; pronunciation: Pronunciation[] };

export const FACES: Record<string, string> = {
  neutral: '🚕',
  grumpy: '😒',
  laughing: '🤣',
  angry: '🤬',
  impressed: '😮',
  facepalm: '🤦',
};
