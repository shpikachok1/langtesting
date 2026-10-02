import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { getCourse } from './src/content';
import { polishRatio, useProgress } from './src/progress';
import { useReview } from './src/review';
import { CallScreen } from './src/screens/CallScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LessonScreen } from './src/screens/LessonScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { colors } from './src/theme';
import type { Lesson } from './src/types';

type Screen = { name: 'home' } | { name: 'lesson'; lesson: Lesson } | { name: 'chat' } | { name: 'review' } | { name: 'call' };

const course = getCourse('pl');

export default function App() {
  const { progress, loaded, completeLesson } = useProgress();
  const review = useReview();
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const home = () => setScreen({ name: 'home' });

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const knownWords = course.units
    .flatMap((u) => u.lessons)
    .filter((l) => progress.completed.includes(l.id))
    .flatMap((l) => l.words.map((w) => w.pl));

  return (
    <>
      <StatusBar style="dark" />
      {screen.name === 'home' && (
        <HomeScreen
          course={course}
          progress={progress}
          onOpenLesson={(lesson) => setScreen({ name: 'lesson', lesson })}
          onOpenChat={() => setScreen({ name: 'chat' })}
          onOpenReview={() => setScreen({ name: 'review' })}
          onOpenCall={() => setScreen({ name: 'call' })}
          dueCount={review.due.length}
        />
      )}
      {screen.name === 'lesson' && (
        <LessonScreen
          key={screen.lesson.id}
          lesson={screen.lesson}
          ttsLocale={course.ttsLocale}
          onExit={home}
          onFinish={(xp) => {
            completeLesson(screen.lesson.id, xp);
            review.addWords(screen.lesson.words);
            home();
          }}
        />
      )}
      {screen.name === 'review' && (
        <ReviewScreen cards={review.due} ttsLocale={course.ttsLocale} onGrade={review.grade} onExit={home} />
      )}
      {screen.name === 'chat' && (
        <ChatScreen
          polishRatio={polishRatio(progress)}
          knownWords={knownWords}
          ttsLocale={course.ttsLocale}
          onExit={home}
          onCall={() => setScreen({ name: 'call' })}
        />
      )}
      {screen.name === 'call' && (
        <CallScreen polishRatio={polishRatio(progress)} knownWords={knownWords} onExit={home} />
      )}
    </>
  );
}
