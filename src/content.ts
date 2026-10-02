import type { Course, LanguageCode } from './types';

// Чтобы добавить язык: положи content/<код>/course.json и допиши строку сюда.
const courses: Partial<Record<LanguageCode, Course>> = {
  pl: require('../content/pl/course.json'),
};

export function getCourse(lang: LanguageCode): Course {
  const course = courses[lang];
  if (!course) throw new Error(`Курс "${lang}" ещё не добавлен`);
  return course;
}

export function allLessonIds(course: Course): string[] {
  return course.units.flatMap((u) => u.lessons.map((l) => l.id));
}
