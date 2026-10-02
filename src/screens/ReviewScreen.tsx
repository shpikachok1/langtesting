import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import type { Card } from '../review';
import { say } from '../speech';
import { colors } from '../theme';

type Props = {
  cards: Card[];
  ttsLocale: string;
  onGrade: (pl: string, remembered: boolean) => void;
  onExit: () => void;
};

export function ReviewScreen({ cards, ttsLocale, onGrade, onExit }: Props) {
  // Очередь фиксируется при открытии; забытые слова повторяются в конце этой же сессии.
  const [queue, setQueue] = useState(cards);
  const [revealed, setRevealed] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const card = queue[0];

  const answer = (remembered: boolean) => {
    onGrade(card.pl, remembered);
    setRevealed(false);
    if (remembered) setDoneCount((n) => n + 1);
    setQueue((q) => (remembered ? q.slice(1) : [...q.slice(1), q[0]]));
  };

  if (!card) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={{ fontSize: 80 }}>🧠</Text>
        <Text style={styles.title}>{doneCount ? `Повторено слов: ${doneCount}` : 'Пока нечего повторять'}</Text>
        <Text style={styles.subtitle}>Слова из пройденных уроков возвращаются сюда со временем</Text>
        <View style={{ width: '80%', marginTop: 32 }}>
          <Button title="НАЗАД" onPress={onExit} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.counter}>осталось {queue.length}</Text>
      </View>

      <Pressable
        style={styles.card}
        onPress={() => {
          setRevealed(true);
          say(card.pl, ttsLocale);
        }}
      >
        <Text style={styles.pl}>{card.pl}</Text>
        {revealed ? (
          <>
            <Text style={styles.ru}>{card.ru}</Text>
            {card.hint && <Text style={styles.hint}>[{card.hint}]</Text>}
          </>
        ) : (
          <Text style={styles.tap}>Вспомни перевод и нажми на карточку</Text>
        )}
      </Pressable>

      <View style={styles.buttons}>
        {revealed && (
          <>
            <View style={{ flex: 1 }}>
              <Button title="НЕ ПОМНЮ" color={colors.bad} onPress={() => answer(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="ПОМНЮ" color={colors.good} onPress={() => answer(true)} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 20 },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 36 },
  close: { fontSize: 22, color: colors.muted, fontWeight: '700' },
  counter: { fontSize: 16, color: colors.muted, fontWeight: '700' },
  card: {
    flex: 1,
    marginVertical: 32,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pl: { fontSize: 36, fontWeight: '900', color: colors.primary, textAlign: 'center' },
  ru: { fontSize: 22, color: colors.text, marginTop: 16, textAlign: 'center' },
  hint: { fontSize: 16, color: colors.muted, marginTop: 8 },
  tap: { fontSize: 15, color: colors.muted, marginTop: 16 },
  buttons: { flexDirection: 'row', gap: 12, minHeight: 60, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '900', color: colors.text, marginTop: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 8, textAlign: 'center' },
});
