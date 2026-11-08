/**
 * "Typing only" answer boxes: when a quiz does not allow paste, students may not paste, drop text,
 * or let a keyboard suggestion (word or clipboard suggestions on phones) fill an answer box.
 *
 * Phone keyboards put suggestion text in as if it were typed, so no paste event fires. We catch it
 * two ways: by the browser's input type where it gives one (beforeinput), and, as the backstop, by
 * rejecting any single change that adds more than MAX_TYPED_CHUNK characters at once.
 */

/** Marks an input/textarea as a student answer box (the guard only acts on these). */
export const ANSWER_BOX_ATTR = 'data-answer-box';

/** A single keystroke adds 1 character; a little slack covers autocorrect swaps and auto-spacing. */
export const MAX_TYPED_CHUNK = 2;

/** Input types that are never typing: paste, drop and suggestion replacement. */
export const BLOCKED_INPUT_TYPES = new Set([
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'insertFromYank',
  'insertReplacementText',
  'insertLink',
]);

export const isAnswerBox = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(`[${ANSWER_BOX_ATTR}]`) !== null;

/** How many characters `next` adds over `prev`, ignoring the unchanged start and end. */
export const charsAdded = (prev: string, next: string): number => {
  const max = Math.min(prev.length, next.length);
  let start = 0;
  while (start < max && prev[start] === next[start]) start++;
  let end = 0;
  while (end < max - start && prev[prev.length - 1 - end] === next[next.length - 1 - end]) end++;
  return Math.max(0, next.length - start - end);
};

/** True when one change put in more text than a keystroke can: a paste or a suggestion tap. */
export const addsTooMuchAtOnce = (prev: string, next: string): boolean =>
  charsAdded(prev, next) > MAX_TYPED_CHUNK;

/** Attributes that ask the keyboard (and spell-check / grammar extensions) not to offer suggestions. */
export const noSuggestionProps = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'data-gramm': 'false',
  'data-gramm_editor': 'false',
  'data-enable-grammarly': 'false',
} as const;
