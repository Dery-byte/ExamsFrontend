import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { quizLinkSlug, type QuizLinkMeta } from './quizSlug';

// ---------------------------------------------------------------------------
// ID obfuscation – keeps raw database IDs out of shared URLs while giving
// the token a meaningful course/program prefix.
//
// Format:  {COURSE-ABBREV}-{base36(id XOR MASK)}
//
// Examples (course "Software Engineering"):
//   id  1 → "SE-f3t"
//   id 42 → "SE-f2i"
//
// Examples (course "Introduction to Computer Science"):
//   id  1 → "ICS-f3t"
//   id  5 → "ICS-f3p"
// ---------------------------------------------------------------------------

const MASK = 0x4D3C; // XOR mask – decorrelates small sequential IDs

/** Stop-words excluded when building initials. */
const STOPS = new Set(['to', 'of', 'and', 'the', 'for', 'in', 'a', 'an', 'at', 'by', 'or', 'is']);

/**
 * Derive a 2–4 letter uppercase abbreviation from a course / program title.
 * e.g. "Software Engineering" → "SE"
 *      "Introduction to Computer Science" → "ICS"  (skips "to")
 *      "" → "QZ" (fallback)
 */
const courseAbbrev = (text: string): string => {
  const letters = text
    .trim()
    .split(/\s+/)
    .filter(w => w && !STOPS.has(w.toLowerCase()))
    .map(w => w[0].toUpperCase())
    .slice(0, 4)
    .join('');
  return letters || 'QZ';
};

/**
 * Encode a quiz ID into a course-aware, human-readable URL token.
 * Pass `meta` so the abbreviation reflects the course (e.g. "SE-f3t").
 */
export const encodeQuizId = (qId: number | string, meta?: QuizLinkMeta): string => {
  const abbrev = courseAbbrev(meta?.courseTitle ?? meta?.title ?? '');
  const masked = (Number(qId) ^ MASK).toString(36);
  return `${abbrev}-${masked}`;
};

/**
 * Decode a URL token back to the numeric quiz ID string.
 * Returns `null` if the token is missing, malformed, or produces a non-positive ID.
 */
export const decodeQuizId = (token: string): string | null => {
  // Split at the last '-'; everything before is the (ignored) abbreviation,
  // everything after is the base36-encoded XOR'd ID.
  const sep = token.lastIndexOf('-');
  if (sep < 0) return null;
  const encoded = token.slice(sep + 1);
  if (!encoded) return null;
  const parsed = parseInt(encoded, 36);
  if (isNaN(parsed)) return null;
  const id = parsed ^ MASK;
  if (id <= 0) return null; // DB IDs are always positive integers
  return String(id);
};

/**
 * Decode an obfuscated `:qid` param back to the real numeric quiz ID.
 * Alias so pages only need one import from this file.
 */
export const decodeParam = decodeQuizId;

// ---------------------------------------------------------------------------
// URL path helpers — all IDs are encoded so raw integers never appear in URLs
// ---------------------------------------------------------------------------

export { quizLinkSlug };
export type { QuizLinkMeta };

/**
 * Where a student lands after login: the Instructions page.
 * Pass `meta` to get a course-prefixed token; omit for a generic "QZ-…" token.
 */
export const quizInstructionsPath = (qId: number | string, meta?: QuizLinkMeta) =>
  `/user-dashboard/instructions/${encodeQuizId(qId, meta)}`;

/** Standalone exam-window URL (/start/:qid). ID is encoded identically. */
export const startQuizPath = (qId: number | string, meta?: QuizLinkMeta) =>
  `/start/${encodeQuizId(qId, meta)}`;

/** Shareable link for a quiz — ID is hidden behind a course-prefixed token. */
export const quizShareLink = (qId: number | string, meta?: QuizLinkMeta) => {
  const token = encodeQuizId(qId, meta);
  const slug = quizLinkSlug(meta);
  return `${window.location.origin}/quiz/${token}${slug ? `/${slug}` : ''}`;
};

// ---------------------------------------------------------------------------
// Clipboard helpers
// ---------------------------------------------------------------------------

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API is unavailable on plain-http origins; fall back to a hidden textarea
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export async function copyQuizLink(qId: number | string, meta?: QuizLinkMeta) {
  const ok = await copyText(quizShareLink(qId, meta));
  if (ok) toast.success('Quiz link copied');
  else toast.error('Could not copy — select and copy the link manually');
}

/** Shown right after a quiz is created. Resolves when the dialog is closed. */
export async function showQuizLinkDialog(qId: number | string, meta?: QuizLinkMeta) {
  const link = quizShareLink(qId, meta);
  const title = meta?.title;
  const result = await Swal.fire({
    icon: 'success',
    title: 'Assessment created',
    html: `<p style="margin:0 0 12px;color:#64748b;font-size:14px">
             Share this link${title ? ` for <b>${title.replace(/[<>&]/g, '')}</b>` : ''}. Students sign in first,
             then land directly on the quiz's start page.
           </p>`,
    input: 'text',
    inputValue: link,
    inputAttributes: { readonly: 'true', onfocus: 'this.select()' },
    showCancelButton: true,
    confirmButtonText: 'Copy link',
    cancelButtonText: 'Done',
    confirmButtonColor: '#5156be',
    reverseButtons: true,
    allowOutsideClick: false,
  });
  if (result.isConfirmed) await copyQuizLink(qId, meta);
}

