import {
  AudioModule,
  createAudioPlayer,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  type AudioPlayer,
} from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { callFunction, FACES, serverConfigured, type CallReply } from '../api';
import { colors } from '../theme';

type Props = {
  polishRatio: number;
  knownWords: string[];
  onExit: () => void;
};

type Phase = 'connecting' | 'idle' | 'recording' | 'thinking' | 'speaking';
type Turn = { role: 'user' | 'assistant'; content: string };

const GREETING = 'No, słucham. Я Збышек, твой таксист. Ну, давай, говори, только не мямли.';
const PHASE_TEXT: Record<Phase, string> = {
  connecting: 'Звоню Збышеку…',
  idle: 'Зажми кнопку и говори',
  recording: 'Говори… отпусти, когда закончишь',
  thinking: 'Збышек думает…',
  speaking: 'Збышек говорит',
};

export function CallScreen({ polishRatio, knownWords, onExit }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<Phase>('connecting');
  const [last, setLast] = useState<CallReply | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useRef<Turn[]>([{ role: 'assistant', content: GREETING }]);
  const player = useRef<AudioPlayer | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  // Пока Збышек говорит, аватар «дышит» в такт. Позже здесь будет анимация губ.
  useEffect(() => {
    if (phase !== 'speaking' && phase !== 'recording') {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);

  useEffect(() => {
    (async () => {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Без доступа к микрофону звонок не работает. Разреши его в настройках телефона.');
        return;
      }
      await speakReply(GREETING);
    })();
    return () => {
      player.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function speakReply(text: string) {
    if (!serverConfigured) {
      setError('Сервер не подключён: нужно задать EXPO_PUBLIC_CHAT_URL в .env');
      setPhase('idle');
      return;
    }
    setPhase('speaking');
    try {
      const { audio } = await callFunction<{ audio: string }>('speak', { text });
      const file = new File(Paths.cache, `zbyszek-${Date.now()}.wav`);
      file.write(audio, { encoding: 'base64' });
      // На iOS при включённой записи звук идёт в разговорный динамик, поэтому на время ответа запись выключаем.
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
      player.current?.remove();
      const p = createAudioPlayer(file.uri);
      player.current = p;
      p.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          setPhase('idle');
          file.delete();
        }
      });
      p.play();
    } catch {
      // Голос не пришёл: Збышек «говорит» субтитрами.
      setPhase('idle');
    }
  }

  async function startRecording() {
    if (phase !== 'idle') return;
    setError(null);
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase('recording');
  }

  async function stopAndSend() {
    if (phase !== 'recording') return;
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) return setPhase('idle');
    setPhase('thinking');
    try {
      const audio = await new File(uri).base64();
      const answer = await callFunction<CallReply>('call', {
        // История для модели должна начинаться с пользователя, поэтому приветствие не отправляем.
        messages: history.current.slice(1),
        polishRatio,
        knownWords,
        audio,
        mimeType: 'audio/m4a',
      });
      history.current.push({ role: 'user', content: answer.heard }, { role: 'assistant', content: answer.reply });
      setLast(answer);
      setShowTranslation(false);
      await speakReply(answer.reply);
    } catch {
      setError('Связь пропала. Попробуй ещё раз.');
      setPhase('idle');
    }
  }

  const face = FACES[last?.emotion ?? 'neutral'] ?? FACES.neutral;
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, phase === 'speaking' ? 1.08 : 1.03] });

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={onExit} hitSlop={12}>
          <Text style={styles.hangupSmall}>‹ назад</Text>
        </Pressable>
        <Text style={styles.meta}>польский в речи: {Math.round(polishRatio * 100)}%</Text>
      </View>

      <View style={styles.avatarWrap}>
        <Animated.View style={[styles.avatar, { transform: [{ scale }] }]}>
          <Text style={styles.avatarFace}>{face}</Text>
        </Animated.View>
        <Text style={styles.name}>Zbyszek</Text>
        <Text style={styles.status}>{PHASE_TEXT[phase]}</Text>
      </View>

      <ScrollView style={styles.subtitles} contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
        {last ? (
          <>
            <Text style={styles.heard}>Ты: «{last.heard}»</Text>
            <Pressable onPress={() => setShowTranslation((v) => !v)} style={styles.replyBubble}>
              <Text style={styles.replyText}>{last.reply}</Text>
              <Text style={styles.translation}>{showTranslation ? last.translation : 'тап — перевод'}</Text>
            </Pressable>
            {last.corrections.map((c, i) => (
              <Text key={`c${i}`} style={styles.card}>
                ✏️ <Text style={styles.wrong}>{c.wrong}</Text> → <Text style={styles.right}>{c.right}</Text>
                {'\n'}
                <Text style={styles.note}>{c.note}</Text>
              </Text>
            ))}
            {last.pronunciation.map((p, i) => (
              <Text key={`p${i}`} style={[styles.card, styles.pronCard]}>
                🗣️ <Text style={styles.right}>{p.word}</Text>: {p.issue}
                {'\n'}
                <Text style={styles.note}>{p.tip}</Text>
              </Text>
            ))}
          </>
        ) : (
          <Text style={styles.replyText}>{GREETING}</Text>
        )}
        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.controls}>
        <Pressable
          onPressIn={startRecording}
          onPressOut={stopAndSend}
          disabled={phase === 'thinking' || phase === 'speaking' || phase === 'connecting'}
          style={[
            styles.mic,
            phase === 'recording' && styles.micActive,
            (phase === 'thinking' || phase === 'speaking' || phase === 'connecting') && styles.micDisabled,
          ]}
        >
          <Text style={styles.micIcon}>{phase === 'recording' ? '🔴' : '🎙️'}</Text>
        </Pressable>
        <Pressable onPress={onExit} style={styles.hangup}>
          <Text style={styles.hangupIcon}>📵</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1F1B16', paddingHorizontal: 20 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56 },
  hangupSmall: { color: '#CFC6BB', fontSize: 17, fontWeight: '700' },
  meta: { color: '#9C9186', fontSize: 13 },
  avatarWrap: { alignItems: 'center', marginTop: 28 },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F5C542',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: colors.primary,
  },
  avatarFace: { fontSize: 80 },
  name: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 14 },
  status: { color: '#CFC6BB', fontSize: 15, marginTop: 4 },
  subtitles: { flex: 1, marginTop: 24 },
  heard: { color: '#9C9186', fontSize: 15, fontStyle: 'italic' },
  replyBubble: { backgroundColor: '#2E2924', borderRadius: 16, padding: 14 },
  replyText: { color: '#fff', fontSize: 18, lineHeight: 25 },
  translation: { color: '#9C9186', fontSize: 14, marginTop: 8, fontStyle: 'italic' },
  card: { backgroundColor: '#3A3328', color: '#fff', borderRadius: 12, padding: 10, fontSize: 15 },
  pronCard: { backgroundColor: '#2D3A2E' },
  wrong: { color: '#FF8A8E', textDecorationLine: 'line-through' },
  right: { color: '#7EE2A0', fontWeight: '800' },
  note: { color: '#CFC6BB', fontSize: 13 },
  error: { color: '#FF8A8E', fontSize: 15 },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 40, paddingVertical: 28 },
  mic: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.good,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: { backgroundColor: colors.primary, transform: [{ scale: 1.12 }] },
  micDisabled: { backgroundColor: '#4A433B' },
  micIcon: { fontSize: 42 },
  hangup: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bad,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hangupIcon: { fontSize: 28 },
});
