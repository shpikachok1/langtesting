# Как оживить Збышека: Supabase + Gemini

Всё делается на твоём компьютере в папке проекта `langtesting`. Ключ Gemini попадает только
в секреты Supabase, в код и в git он не попадает.

## 1. Проект в Supabase

1. Зайди на https://supabase.com/dashboard → **New project**. Регион ближе к тебе (например Frankfurt).
2. Когда проект создастся, открой **Project Settings → General** и скопируй **Project ID**
   (строка вида `abcdefghijklmnop`). Дальше это `<ref>`.
3. Там же **Project Settings → API**: скопируй **anon public** ключ.

## 2. Задеплоить функцию Збышека

```bash
git pull
npx supabase login                         # откроется браузер, подтверди вход
npx supabase init                          # один раз; на вопросы про VS Code / Deno жми Enter
npx supabase link --project-ref <ref>
npx supabase secrets set GEMINI_API_KEY=<твой ключ Gemini>
npx supabase functions deploy chat
```

## 3. Настроить приложение

Создай в корне проекта файл `.env` (по образцу `.env.example`):

```
EXPO_PUBLIC_CHAT_URL=https://<ref>.supabase.co/functions/v1/chat
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon public ключ>
```

Перезапусти `npx expo start` (переменные из `.env` читаются только при старте) и открой чат.

## Если не работает

| Что видишь | Что делать |
|---|---|
| «Kurczę, связь пропала» | Проверь адрес в `.env` и что функция задеплоилась: Supabase → Edge Functions → chat |
| В логах функции `Gemini error 400/403` | Ключ неверный или отозван: `npx supabase secrets set GEMINI_API_KEY=...` и снова `functions deploy chat` |
| `401` | Не указан или неверный `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| Збышек всё ещё говорит, что сервер не подключён | Нет файла `.env` или expo не перезапущен |

Логи функции: Supabase → Edge Functions → chat → Logs.
