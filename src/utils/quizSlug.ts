export interface QuizLinkMeta {
  /** Quiz title. */
  title?: string;
  /** Course name. */
  courseTitle?: string;
}

/** 'Intro to C++ — Mid-Sem Exam!' -> 'intro-to-c-mid-sem-exam'. Lower-case ASCII, hyphen separated. */
export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents: é -> e
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Each of the course name and quiz title gets its own budget, so a long course name can't crowd out the quiz title. */
export const PART_MAX = 40;

const cutAtWord = (slug: string, max: number) => {
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  const i = cut.lastIndexOf('-');
  return i > 0 ? cut.slice(0, i) : cut;
};

/**
 * Readable part of the link, e.g. 'introduction-to-programming-mid-semester-test'.
 * It is purely decorative: the quiz is found by its number, so a renamed quiz, or a slug that is
 * empty (e.g. a name with no Latin letters), still opens the right quiz.
 */
export const quizLinkSlug = (meta?: QuizLinkMeta) =>
  [meta?.courseTitle, meta?.title]
    .map(part => cutAtWord(slugify(part ?? ''), PART_MAX))
    .filter(Boolean)
    .join('-');
