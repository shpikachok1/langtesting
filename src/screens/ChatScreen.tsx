import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { say } from '../speech';
import { colors } from '../theme';

type Msg = { role: 'user' | 'assistant'; content: string };

type Props = {
  polishRatio: number;
  knownWords: string[];
  ttsLocale: string;
  onExit: () => void;
};

// Адрес Edge Function из supabase/functions/chat. Задаётся в .env как EXPO_PUBLIC_CHAT_URL.
const CHAT_URL = process.env.EXPO_PUBLIC_CHAT_URL;

export function ChatScreen({ polishRatio, knownWords, ttsLocale, onExit }: Props) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'assistant', content: 'No, cześć. Я Збышек. Чего надо? Давай, скажи что-нибудь, не стесняйся.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<Msg>>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const history: Msg[] = [...messages, { role: 'user', content: text }];
    setMessages(history);
    setInput('');
    setBusy(true);
    try {
      const reply = CHAT_URL
        ? await fetch(CHAT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Первую реплику Збышека не отправляем: история для API должна начинаться с пользователя.
            body: JSON.stringify({ messages: history.slice(1), polishRatio, knownWords }),
          })
            .then((r) => r.json())
            .then((d) => d.reply as string)
        : 'Ну и? Сервер не подключён, так что я пока молчу. (Нужно задать EXPO_PUBLIC_CHAT_URL)';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Kurczę, связь пропала. Попробуй ещё раз.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <Text style={styles.avatar}>🚕</Text>
        <View>
          <Text style={styles.name}>Zbyszek</Text>
          <Text style={styles.meta}>польский в речи: {Math.round(polishRatio * 100)}%</Text>
        </View>
      </View>

      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        onContentSizeChange={() => list.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <Pressable
            onLongPress={() => item.role === 'assistant' && say(item.content, ttsLocale)}
            style={[styles.bubble, item.role === 'user' ? styles.mine : styles.theirs]}
          >
            <Text style={[styles.bubbleText, item.role === 'user' && { color: '#fff' }]}>{item.content}</Text>
          </Pressable>
        )}
      />
      {busy && <Text style={styles.typing}>Zbyszek пишет…</Text>}

      <View style={styles.inputRow}>
        {/* Сюда придёт кнопка микрофона: запись → распознавание → оценка произношения. */}
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Napisz coś…"
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable style={styles.send} onPress={send}>
          <Text style={{ color: '#fff', fontSize: 20 }}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  back: { fontSize: 34, color: colors.muted, marginTop: -4 },
  avatar: { fontSize: 34 },
  name: { fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 12 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 16, color: colors.text },
  typing: { marginLeft: 20, marginBottom: 6, color: colors.muted, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', padding: 12, paddingBottom: 32, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  send: { backgroundColor: colors.primary, borderRadius: 22, width: 44, alignItems: 'center', justifyContent: 'center' },
});
