import Swal from 'sweetalert2';
import toast from 'react-hot-toast';
import { deactivateAccount, reactivateAccount } from '../../api/endpoints';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/**
 * Deactivate (asks for an optional reason) or reactivate an account, then calls onDone.
 * Deactivated users can't sign in; their records are kept.
 */
export async function toggleAccount(user: { id: number; enabled?: boolean }, name: string, onDone: () => void) {
  const active = user.enabled !== false;
  if (active) {
    const r = await Swal.fire({
      title: `Deactivate ${esc(name)}?`,
      html: 'They will be signed out and can no longer sign in. Results, marks and history are kept, and you can reactivate the account at any time.',
      input: 'text', inputPlaceholder: 'Reason (optional), e.g. Graduated',
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Deactivate', confirmButtonColor: '#f59e0b',
    });
    if (!r.isConfirmed) return;
    try { await deactivateAccount(user.id, r.value || undefined); toast.success(`${name} deactivated`); onDone(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not deactivate'); }
  } else {
    const r = await Swal.fire({ title: `Reactivate ${esc(name)}?`, text: 'They will be able to sign in again.', icon: 'question', showCancelButton: true, confirmButtonText: 'Reactivate', confirmButtonColor: '#0b7a0b' });
    if (!r.isConfirmed) return;
    try { await reactivateAccount(user.id); toast.success(`${name} reactivated`); onDone(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not reactivate'); }
  }
}
