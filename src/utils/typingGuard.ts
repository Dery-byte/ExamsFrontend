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

type AnswerField = HTMLInputElement | HTMLTextAreaElement;

const asAnswerField = (t: EventTarget | null): AnswerField | null =>
  (t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement) && t.hasAttribute(ANSWER_BOX_ATTR) ? t : null;

/** Which answer box a field is (the value of its data-answer-box attribute). */
export const answerBoxKey = (t: EventTarget | null): string | null => {
  const box = t instanceof Element ? t.closest(`[${ANSWER_BOX_ATTR}]`) : null;
  return box ? box.getAttribute(ANSWER_BOX_ATTR) : null;
};

/**
 * Document-level guard, run before React sees the change. Phone keyboards (Gboard on Android in
 * particular) commit suggestion and clipboard text through the input-method connection: the browser
 * fires beforeinput/input but no paste event, and the beforeinput usually cannot be cancelled. So we
 * remember each box's value on every beforeinput and, on the input that follows, put it back if the
 * change added more than a keystroke can. The input event is then stopped, so React never sees it
 * and the saved answer never contains the inserted text.
 *
 * Returns a function that removes the listeners.
 */
export function installTypingGuard(isBlocking: () => boolean, onBlocked: (field: AnswerField) => void): () => void {
  const before = new WeakMap<AnswerField, string>();   // value just before the current change
  const accepted = new WeakMap<AnswerField, string>(); // last value we let through
  const forced = new WeakSet<AnswerField>();           // a paste/drop the browser wouldn't let us cancel

  const revert = (f: AnswerField, value: string, caret: number) => {
    f.value = value;
    accepted.set(f, value);
    try { f.setSelectionRange(caret, caret); } catch { /* field type without a caret */ }
    // Some keyboards re-apply their text right after; if one does it without an input event, undo it again
    requestAnimationFrame(() => {
      const want = accepted.get(f);
      if (want !== undefined && f.value !== want && isBlocking()) f.value = want;
    });
  };

  const onFocusIn = (e: Event) => {
    const f = asAnswerField(e.target);
    if (f) accepted.set(f, f.value);
  };
  const onBeforeInput = (e: Event) => {
    const f = asAnswerField(e.target);
    if (!f) return;
    before.set(f, f.value);
    if (!isBlocking()) return;
    if (BLOCKED_INPUT_TYPES.has((e as InputEvent).inputType)) {
      if (e.cancelable) { e.preventDefault(); before.delete(f); onBlocked(f); }
      else forced.add(f);
    }
  };
  const onInput = (e: Event) => {
    const f = asAnswerField(e.target);
    if (!f) return;
    const prev = before.get(f) ?? accepted.get(f);
    const force = forced.has(f);
    before.delete(f);
    forced.delete(f);
    if (!isBlocking() || prev === undefined || !(force || addsTooMuchAtOnce(prev, f.value))) {
      accepted.set(f, f.value);
      return;
    }
    let at = 0;
    while (at < prev.length && prev[at] === f.value[at]) at++;
    revert(f, prev, at);
    e.stopImmediatePropagation();
    onBlocked(f);
  };
  const onDrop = (e: DragEvent) => {
    const f = asAnswerField(e.target);
    if (!f || !isBlocking()) return;
    e.preventDefault();
    onBlocked(f);
  };

  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('beforeinput', onBeforeInput, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('drop', onDrop, true);
  return () => {
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('beforeinput', onBeforeInput, true);
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('drop', onDrop, true);
  };
}

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
