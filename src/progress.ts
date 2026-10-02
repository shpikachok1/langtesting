import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

// Прогресс пока хранится на устройстве. Синхронизация между телефонами
// (Supabase) подключится поверх: тот же объект будет уходить в таблицу progress.

export type Progress = {
  xp: number;
  completed: string[];
  streak: number;
  /** YYYY-MM-DD последнего дня, когда был пройден урок. */
  lastDay: string | null;
};

const KEY = 'progress:pl';
const EMPTY: Progress = { xp: 0, completed: [], streak: 0, lastDay: null };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setProgress({ ...EMPTY, ...JSON.parse(raw) }))
      .finally(() => setLoaded(true));
  }, []);

  const completeLesson = useCallback((lessonId: string, xp: number) => {
    setProgress((prev) => {
      const day = today();
      let streak = prev.streak;
      if (prev.lastDay !== day) {
        streak = prev.lastDay && daysBetween(prev.lastDay, day) === 1 ? streak + 1 : 1;
      }
      const next: Progress = {
        xp: prev.xp + xp,
        completed: prev.completed.includes(lessonId) ? prev.completed : [...prev.completed, lessonId],
        streak,
        lastDay: day,
      };
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { progress, loaded, completeLesson };
}

/**
 * Какую долю реплик собеседник говорит по-польски: 0 — только русский, 1 — только польский.
 * Растёт с каждым пройденным уроком, к 30 урокам он почти перестаёт говорить по-русски.
 */
export function polishRatio(p: Progress): number {
  return Math.min(0.95, 0.1 + p.completed.length * 0.03);
}
