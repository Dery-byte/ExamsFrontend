/**
 * Menu entries that belong to the Assessments (quiz) module, hidden from every role while the
 * developer has the module switched off.
 */
const QUIZ_PAGES = /\/(quizzes|quizes|add-quiz|add-quizes|quiz-review|question-bank|timetable|remarks|history|analytics)$/;

export const isQuizPage = (to: string) => QUIZ_PAGES.test(to);

/** A flat menu without quiz pages (unchanged while the module is on). */
export function hideQuizItems<T extends { to: string }>(items: T[], on: boolean): T[] {
  return on ? items : items.filter(i => !isQuizPage(i.to));
}

/** A grouped menu without quiz pages; groups left empty are dropped. */
export function hideQuizGroups<T extends { items: { to: string }[] }>(groups: T[], on: boolean): T[] {
  return on ? groups : groups.map(g => ({ ...g, items: hideQuizItems(g.items, false) })).filter(g => g.items.length > 0);
}
