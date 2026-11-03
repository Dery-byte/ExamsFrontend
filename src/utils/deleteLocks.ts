import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { getQuizResultsSummary, saDeleteQuizWithResults } from '../api/endpoints';
import { tx } from './terms';

/**
 * Deletes that students' results depend on are locked: the button looks disabled, hovering it shows
 * why, and tapping it (phones have no hover) shows the same reason as a toast. Only the Super Admin
 * can still delete a taken quiz, and only with a reason that goes into the audit log.
 */
export const lockMessage = {
  question: () => tx("Can't delete: students have already taken this quiz, and their answers and marks depend on this question."),
  quiz: () => tx("Can't delete: students have already taken this quiz. Unpublish it instead to hide it from students."),
  quizSuperAdmin: () => tx('Students have already taken this quiz. As Super Admin you can still delete it, with a reason.'),
  course: () => tx("Can't delete: students have results in quizzes in this course."),
};

/** Class for a delete button that is locked (see index.css). */
export const LOCKED_CLASS = 'is-delete-locked';

export function explainLocked(message: string) {
  toast.error(message, { id: 'delete-locked' });
}

/** The server's message for a failed request, e.g. the 409 a locked delete returns. */
export function apiMessage(err: any, fallback: string): string {
  return err?.response?.data?.message || fallback;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const MIN_REASON = 10;
const MAX_REASON = 500;

/**
 * Super Admin: asks for a reason and deletes a quiz students have taken, with all their results.
 * Resolves true once deleted.
 */
export async function superAdminDeleteTakenQuiz(qId: number, title?: string): Promise<boolean> {
  let students = 0;
  try { students = (await getQuizResultsSummary(qId)).students; } catch { /* the dialog still works without the count */ }
  const who = students > 0 ? `${students} student${students === 1 ? '' : 's'}` : 'students';

  const r = await Swal.fire({
    title: 'Delete a quiz with student results?',
    html:
      `<p style="margin:0 0 8px">${escapeHtml(tx('Students have already taken'))} <b>${escapeHtml(title || tx('this quiz'))}</b>. ` +
      `Deleting it permanently removes the answers and marks of <b>${who}</b>. This cannot be undone.</p>` +
      `<p style="margin:0;font-size:13px;opacity:.8">Your username, the date and time, and your reason are saved in the audit log.</p>`,
    icon: 'warning',
    input: 'textarea',
    inputLabel: 'Reason for deleting',
    inputPlaceholder: 'e.g. Set up in the wrong course; the students will take the correct quiz again.',
    inputAttributes: { maxlength: String(MAX_REASON), 'aria-label': 'Reason for deleting' },
    inputValidator: v => {
      const t = (v || '').trim();
      if (t.length < MIN_REASON) return `Please give a reason of at least ${MIN_REASON} characters.`;
      return null;
    },
    showCancelButton: true,
    focusCancel: true,
    confirmButtonColor: '#fd625e',
    confirmButtonText: 'Delete quiz and results',
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    preConfirm: async (reason: string) => {
      try {
        return await saDeleteQuizWithResults(qId, reason.trim());
      } catch (err) {
        Swal.showValidationMessage(apiMessage(err, 'Could not delete the quiz.'));
        return false;
      }
    },
  });
  if (!r.isConfirmed) return false;
  toast.success(tx('Quiz and its results deleted. The reason is in the audit log.'));
  return true;
}
