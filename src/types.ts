// Формат курса. Курс — это просто JSON в content/<lang>/course.json,
// поэтому новые уроки и языки добавляются без изменения кода.

export type LanguageCode = 'pl' | 'en' | 'kk';

/** Выбрать правильный вариант. `speak` — фраза, которую озвучит TTS. */
export type ChoiceExercise = {
  type: 'choice';
  prompt: string;
  options: string[];
  answer: number;
  speak?: string;
};

/** Собрать перевод из слов. Лишние слова в `bank` — отвлекающие. */
export type BuildExercise = {
  type: 'build';
  prompt: string;
  bank: string[];
  answer: string[];
  speak?: string;
};

/** Прослушать фразу и выбрать её значение. */
export type ListenExercise = {
  type: 'listen';
  speak: string;
  options: string[];
  answer: number;
};

export type Exercise = ChoiceExercise | BuildExercise | ListenExercise;

/** Блок теории для урока грамматики. */
export type TheoryBlock = {
  title: string;
  text: string;
  /** Таблица-пример, например спряжение: [["ja", "jestem"], ["ty", "jesteś"]]. */
  table?: string[][];
  examples?: { pl: string; ru: string }[];
};

/** Текст для урока чтения: каждое предложение с переводом по тапу. */
export type ReadingText = {
  title: string;
  sentences: { pl: string; ru: string }[];
};

export type LessonKind = 'vocab' | 'grammar' | 'reading';

export type Lesson = {
  id: string;
  title: string;
  /** По умолчанию 'vocab'. Определяет, что показывается перед упражнениями. */
  kind?: LessonKind;
  theory?: TheoryBlock[];
  reading?: ReadingText;
  /** Новые слова урока: показываются перед упражнениями и идут в словарь. */
  words: { pl: string; ru: string; hint?: string }[];
  exercises: Exercise[];
};

export type Unit = {
  id: string;
  title: string;
  emoji: string;
  lessons: Lesson[];
};

export type Course = {
  language: LanguageCode;
  /** Код голоса для озвучки, например "pl-PL". */
  ttsLocale: string;
  title: string;
  flag: string;
  units: Unit[];
};
