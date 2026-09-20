import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { quizLinkSlug, type QuizLinkMeta } from './quizSlug';

/** Where a student lands after login: the Instructions page, which holds the Start button. */
export const quizInstructionsPath = (qId: number | string) => `/user-dashboard/instructions/${qId}`;

export { quizLinkSlug };
export type { QuizLinkMeta };

/** Shareable link for a quiz. Opening it prompts for login (if needed), then goes to the quiz's start page. */
export const quizShareLink = (qId: number | string, meta?: QuizLinkMeta) => {
  const slug = quizLinkSlug(meta);
  return `${window.location.origin}/quiz/${qId}${slug ? `/${slug}` : ''}`;
};

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
