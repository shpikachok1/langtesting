import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { say } from '../speech';
import { colors } from '../theme';
import type { Exercise, Lesson } from '../types';

type Props = {
  lesson: Lesson;
  ttsLocale: string;
  onFinish: (xpEarned: number) => void;
  onExit: () => void;
};

const MAX_HEARTS = 3;
const XP_PER_LESSON = 10;

export function LessonScreen({ lesson, ttsLocale, onFinish, onExit }: Props) {
  const [phase, setPhase] = useState<'intro' | 'quiz' | 'win' | 'lose'>('intro');
  // Ошибочные задания возвращаются в конец очереди, как в Duolingo.
  const [queue, setQueue] = useState<Exercise[]>(lesson.exercises);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [verdict, setVerdict] = useState<null | boolean>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [built, setBuilt] = useState<number[]>([]);

  const total = lesson.exercises.length;
  const doneCount = total - queue.length;
  const ex = queue[0];

  const check = () => {
    let ok = false;
    if (ex.type === 'build') {
      ok = built.map((i) => ex.bank[i]).join(' ').toLowerCase() === ex.answer.join(' ').toLowerCase();
    } else {
      ok = selected === ex.answer;
    }
    setVerdict(ok);
    if (ex.speak) say(ex.speak, ttsLocale);
    if (!ok) setHearts((h) => h - 1);
  };

  const next = () => {
    const rest = verdict ? queue.slice(1) : [...queue.slice(1), queue[0]];
    setVerdict(null);
    setSelected(null);
    setBuilt([]);
    if (hearts <= 0) return setPhase('lose');
    if (rest.length === 0) return setPhase('win');
    setQueue(rest);
  };

  if (phase === 'intro') {
    return (
      <View style={styles.root}>
        <TopBar progress={0} hearts={hearts} onExit={onExit} />
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.title}>Новые слова</Text>
          {lesson.words.map((w) => (
            <Pressable key={w.pl} style={styles.wordCard} onPress={() => say(w.pl, ttsLocale)}>
              <Text style={styles.wordPl}>🔊 {w.pl}</Text>
              <Text style={styles.wordRu}>
                {w.ru}
                {w.hint ? `  ·  [${w.hint}]` : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Button title="ПОЕХАЛИ" onPress={() => setPhase('quiz')} />
        </View>
      </View>
    );
  }

  if (phase === 'win' || phase === 'lose') {
    const win = phase === 'win';
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.bigEmoji}>{win ? '🎉' : '💔'}</Text>
        <Text style={styles.title}>{win ? 'Brawo! Урок пройден' : 'Сердечки кончились'}</Text>
        <Text style={styles.subtitle}>{win ? `+${XP_PER_LESSON} XP` : 'Ничего, попробуй ещё раз'}</Text>
        <View style={{ width: '80%', marginTop: 32 }}>
          <Button title={win ? 'ДАЛЬШЕ' : 'НАЗАД'} onPress={() => (win ? onFinish(XP_PER_LESSON) : onExit())} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <TopBar progress={doneCount / total} hearts={hearts} onExit={onExit} />
      <ScrollView contentContainerStyle={styles.body}>
        <ExerciseView
          ex={ex}
          ttsLocale={ttsLocale}
          selected={selected}
          onSelect={verdict === null ? setSelected : () => {}}
          built={built}
          onBuild={verdict === null ? setBuilt : () => {}}
        />
      </ScrollView>
      <View style={[styles.footer, verdict !== null && { backgroundColor: verdict ? '#E3F7EA' : '#FDE7E8' }]}>
        {verdict !== null && (
          <Text style={[styles.verdict, { color: verdict ? colors.good : colors.bad }]}>
            {verdict ? 'Dobrze! 👏' : `Правильно: ${answerText(ex)}`}
          </Text>
        )}
        {verdict === null ? (
          <Button
            title="ПРОВЕРИТЬ"
            disabled={ex.type === 'build' ? built.length === 0 : selected === null}
            onPress={check}
          />
        ) : (
          <Button title="ДАЛЕЕ" color={verdict ? colors.good : colors.bad} onPress={next} />
        )}
      </View>
    </View>
  );
}

function answerText(ex: Exercise): string {
  return ex.type === 'build' ? ex.answer.join(' ') : ex.options[ex.answer];
}

function TopBar({ progress, hearts, onExit }: { progress: number; hearts: number; onExit: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onExit} hitSlop={12}>
        <Text style={styles.close}>✕</Text>
      </Pressable>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(4, progress * 100)}%` }]} />
      </View>
      <Text style={styles.hearts}>❤️ {Math.max(0, hearts)}</Text>
    </View>
  );
}

type ExerciseViewProps = {
  ex: Exercise;
  ttsLocale: string;
  selected: number | null;
  onSelect: (i: number) => void;
  built: number[];
  onBuild: (b: number[]) => void;
};

function ExerciseView({ ex, ttsLocale, selected, onSelect, built, onBuild }: ExerciseViewProps) {
  // Перемешиваем банк слов один раз на задание.
  const bankOrder = useMemo(
    () => (ex.type === 'build' ? shuffle(ex.bank.map((_, i) => i)) : []),
    [ex],
  );

  if (ex.type === 'build') {
    return (
      <View>
        <Text style={styles.instruction}>Переведи на польский</Text>
        <Text style={styles.prompt}>{ex.prompt}</Text>
        <View style={styles.answerLine}>
          {built.map((i, pos) => (
            <Chip key={`${i}-${pos}`} label={ex.bank[i]} onPress={() => onBuild(built.filter((_, p) => p !== pos))} />
          ))}
        </View>
        <View style={styles.bank}>
          {bankOrder.map((i) => (
            <Chip key={i} label={ex.bank[i]} used={built.includes(i)} onPress={() => onBuild([...built, i])} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View>
      {ex.type === 'listen' ? (
        <>
          <Text style={styles.instruction}>Что ты слышишь?</Text>
          <Pressable style={styles.speaker} onPress={() => say(ex.speak, ttsLocale)}>
            <Text style={{ fontSize: 48 }}>🔊</Text>
          </Pressable>
        </>
      ) : (
        <Text style={styles.prompt}>{ex.prompt}</Text>
      )}
      {ex.options.map((opt, i) => (
        <Pressable
          key={opt}
          onPress={() => onSelect(i)}
          style={[styles.option, selected === i && styles.optionSelected]}
        >
          <Text style={styles.optionText}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Chip({ label, onPress, used }: { label: string; onPress: () => void; used?: boolean }) {
  return (
    <Pressable disabled={used} onPress={onPress} style={[styles.chip, used && styles.chipUsed]}>
      <Text style={[styles.chipText, used && { color: 'transparent' }]}>{label}</Text>
    </Pressable>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, gap: 14 },
  close: { fontSize: 22, color: colors.muted, fontWeight: '700' },
  progressTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.good, borderRadius: 7 },
  hearts: { fontSize: 16, fontWeight: '800', color: colors.bad },
  title: { fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 16 },
  subtitle: { fontSize: 18, color: colors.muted, fontWeight: '700' },
  bigEmoji: { fontSize: 88, marginBottom: 12 },
  wordCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  wordPl: { fontSize: 22, fontWeight: '800', color: colors.primary },
  wordRu: { fontSize: 16, color: colors.muted, marginTop: 4 },
  instruction: { fontSize: 15, fontWeight: '700', color: colors.muted, marginBottom: 8 },
  prompt: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 24 },
  speaker: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 24,
    marginVertical: 24,
  },
  option: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: '#FFEFF2' },
  optionText: { fontSize: 18, fontWeight: '700', color: colors.text },
  answerLine: {
    minHeight: 60,
    borderBottomWidth: 2,
    borderColor: colors.border,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
    marginBottom: 24,
  },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  chipUsed: { backgroundColor: colors.border },
  chipText: { fontSize: 17, fontWeight: '700', color: colors.text },
  footer: { padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: colors.border },
  verdict: { fontSize: 18, fontWeight: '800', marginBottom: 12 },
});
