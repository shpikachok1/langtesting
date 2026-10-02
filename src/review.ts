import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

// Интервальное повторение слов по системе Лейтнера: каждое слово лежит в «коробке».
// Вспомнил — слово переезжает в следующую коробку и вернётся позже. Забыл — назад в первую.

export type Card = { pl: string; ru: string; hint?: string; box: number; due: string };

/** Через сколько дней показать слово снова, по номеру коробки. */
const INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120];
const KEY = 'review:pl';
const SESSION_SIZE = 20;

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function useReview() {
  const [cards, setCards] = useState<Record<string, Card>>({});

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => raw && setCards(JSON.parse(raw)));
  }, []);

  const save = useCallback((update: (prev: Record<string, Card>) => Record<string, Card>) => {
    setCards((prev) => {
      const next = update(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  /** Добавить слова пройденного урока. Уже известные слова не сбрасываются. */
  const addWords = useCallback(
    (words: { pl: string; ru: string; hint?: string }[]) =>
      save((prev) => {
        const next = { ...prev };
        for (const w of words) next[w.pl] ??= { ...w, box: 0, due: addDays(1) };
        return next;
      }),
    [save],
  );

  const grade = useCallback(
    (pl: string, remembered: boolean) =>
      save((prev) => {
        const card = prev[pl];
        if (!card) return prev;
        const box = remembered ? Math.min(card.box + 1, INTERVALS.length - 1) : 0;
        return { ...prev, [pl]: { ...card, box, due: addDays(Math.max(1, INTERVALS[box])) } };
      }),
    [save],
  );

  const today = addDays(0);
  const due = useMemo(
    () =>
      Object.values(cards)
        .filter((c) => c.due <= today)
        .sort((a, b) => a.box - b.box)
        .slice(0, SESSION_SIZE),
    [cards, today],
  );

  return { cards, due, addWords, grade };
}
