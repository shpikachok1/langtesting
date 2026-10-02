import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { allLessonIds } from '../content';
import type { Progress } from '../progress';
import { colors } from '../theme';
import type { Course, Lesson } from '../types';

type Props = {
  course: Course;
  progress: Progress;
  onOpenLesson: (lesson: Lesson) => void;
  onOpenChat: () => void;
  onOpenReview: () => void;
  onOpenCall: () => void;
  dueCount: number;
};

const KIND_ICON = { vocab: '★', grammar: '📐', reading: '📖' };

export function HomeScreen({ course, progress, onOpenLesson, onOpenChat, onOpenReview, onOpenCall, dueCount }: Props) {
  const order = allLessonIds(course);
  // Открыт урок, если пройден предыдущий. Следующий непройденный — «текущий».
  const isUnlocked = (id: string) => {
    const i = order.indexOf(id);
    return i === 0 || progress.completed.includes(order[i - 1]);
  };
  const currentId = order.find((id) => !progress.completed.includes(id));

  let nodeIndex = 0;
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.flag}>{course.flag}</Text>
        <Text style={styles.stat}>🔥 {progress.streak}</Text>
        <Text style={styles.stat}>⭐ {progress.xp} XP</Text>
      </View>

      <ScrollView contentContainerStyle={styles.path}>
        {course.units.map((unit) => (
          <View key={unit.id} style={styles.unit}>
            <View style={styles.unitBanner}>
              <Text style={styles.unitTitle}>
                {unit.emoji} {unit.title}
              </Text>
            </View>
            {unit.lessons.map((lesson) => {
              const offset = [0, 60, 0, -60][nodeIndex++ % 4];
              const done = progress.completed.includes(lesson.id);
              const open = isUnlocked(lesson.id);
              const current = lesson.id === currentId;
              return (
                <View key={lesson.id} style={[styles.nodeWrap, { marginLeft: offset }]}>
                  <Pressable
                    disabled={!open}
                    onPress={() => onOpenLesson(lesson)}
                    style={[
                      styles.node,
                      done && { backgroundColor: colors.good },
                      !open && { backgroundColor: colors.locked },
                      current && styles.nodeCurrent,
                    ]}
                  >
                    <Text style={styles.nodeIcon}>{done ? '✓' : open ? KIND_ICON[lesson.kind ?? 'vocab'] : '🔒'}</Text>
                  </Pressable>
                  <Text style={styles.nodeLabel}>{lesson.title}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.chatFab, styles.reviewFab, { backgroundColor: dueCount ? colors.primary : colors.locked }]}
        onPress={onOpenReview}
      >
        <Text style={styles.chatFabText}>🧠 {dueCount}</Text>
      </Pressable>
      <Pressable style={[styles.chatFab, styles.callFab]} onPress={onOpenCall}>
        <Text style={styles.chatFabText}>📞 Позвонить</Text>
      </Pressable>
      <Pressable style={styles.chatFab} onPress={onOpenChat}>
        <Text style={styles.chatFabText}>💬 Поболтать</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  flag: { fontSize: 28 },
  stat: { fontSize: 18, fontWeight: '800', color: colors.text },
  path: { paddingVertical: 24, paddingBottom: 120, alignItems: 'center' },
  unit: { alignItems: 'center', marginBottom: 24, width: '100%' },
  unitBanner: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    width: '88%',
  },
  unitTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  nodeWrap: { alignItems: 'center', marginVertical: 10 },
  node: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  nodeCurrent: { transform: [{ scale: 1.12 }] },
  nodeIcon: { fontSize: 28, color: '#fff', fontWeight: '900' },
  nodeLabel: { marginTop: 6, color: colors.muted, fontWeight: '700' },
  chatFab: {
    position: 'absolute',
    right: 20,
    bottom: 36,
    backgroundColor: colors.text,
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 22,
  },
  callFab: { bottom: 100, backgroundColor: colors.good },
  reviewFab: { right: undefined, left: 20 },
  chatFabText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
