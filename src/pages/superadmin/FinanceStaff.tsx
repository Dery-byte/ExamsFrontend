import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Copy, KeyRound, Landmark, Loader2, Mail, Plus, Power, Save, UserCog } from 'lucide-react';
import { addFinanceStaff, getAccountsOfficeSettings, getFinanceStaff, resetFinanceStaffPassword, saveAccountsOfficeSettings, updateFinanceStaff, type FinanceStaff as Staff } from '../../api/endpoints';
import { toggleAccount } from '../../components/admin/accountActions';
import FeeModal from './fees/FeeModal';
import { FEE_ADMIN_CSS } from './fees/feeStyles';

type Duty = 'BURSAR' | 'CASHIER';
const DUTY: Record<Duty, { label: string; sub: string }> = {
  BURSAR: { label: 'Bursar', sub: 'Everything a cashier does, plus fees, fee settings, results holds, the price list, bills to groups, concessions, refunds, the year end, stock, reminders, cancelling any payment and confirming cash-ups.' },
  CASHIER: { label: 'Cashier', sub: 'Records payments, prints receipts, bills one student from the price list, hands over store items and hands in cash-ups. Sees fees but cannot change them.' },
};

/** Super Admin: the accounts office's logins. Each one signs in to their own Accounts Office area. */
export default function FinanceStaff() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['finance-staff'], queryFn: getFinanceStaff });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [issued, setIssued] = useState<Staff | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ['finance-staff'] });

  const reset = async (s: Staff) => {
    const ok = await Swal.fire({
      title: `Reset ${s.name}'s password?`, text: 'A new temporary password is made; they must change it when they next sign in.',
      icon: 'question', showCancelButton: true, confirmButtonText: 'Reset password', confirmButtonColor: 'var(--brand)',
    });
    if (!ok.isConfirmed) return;
    setBusy(s.id);
    try { setIssued(await resetFinanceStaffPassword(s.id)); refresh(); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not reset the password'); }
    finally { setBusy(null); }
  };

  const rows = q.data ?? [];
  const office = useQuery({ queryKey: ['accounts-office-settings'], queryFn: getAccountsOfficeSettings });
  const setAlone = async (on: boolean) => {
    try { qc.setQueryData(['accounts-office-settings'], await saveAccountsOfficeSettings(on)); toast.success('Saved'); }
    catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not save'); }
  };
  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + STAFF_CSS}</style>
      <div className="fe-head">
        <div className="fe-title">
          <div className="fe-logo"><Landmark size={24} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className="fe-h1">Finance staff</h1>
            <p className="fe-sub">You (the Super Admin) create the accounts office's logins here. A bursar can do everything a cashier can, so a school with one accountant just makes them the bursar.</p>
          </div>
        </div>
        <div className="fe-actions"><button type="button" className="fe-btn" onClick={() => setAdding(true)}><Plus size={15} /> Add accountant</button></div>
      </div>

      <section className="fe-card">
        {q.isLoading ? <div className="fe-empty"><Loader2 size={24} className="fe-spin" /></div>
          : rows.length === 0 ? (
            <div className="fe-empty"><UserCog size={32} style={{ color: 'rgba(var(--accent-rgb), 0.5)' }} />
              <h3>No accountants yet</h3><p>Add the bursar and the cashiers who take fees, so they no longer need your account.</p></div>
          ) : (
            <ul className="fs-staff">
              {rows.map(s => (
                <li key={s.id} className={s.enabled ? '' : 'off'}>
                  <div className="fs-avatar">{s.name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                    <div className="fe-strong" style={{ overflowWrap: 'anywhere' }}>{s.name}
                      <span className={`fs-duty ${s.duty}`}>{DUTY[s.duty].label}</span>
                      {!s.enabled && <span className="fs-duty off">Deactivated</span>}
                    </div>
                    <div className="fe-muted fe-small" style={{ overflowWrap: 'anywhere' }}>{s.username} · {s.email}{s.phone ? ` · ${s.phone}` : ''}</div>
                  </div>
                  <div className="fe-row-actions" style={{ flexWrap: 'wrap' }}>
                    <button type="button" className="fe-ghost sm" onClick={() => setEditing(s)}><UserCog size={13} /> Edit</button>
                    <button type="button" className="fe-ghost sm" onClick={() => reset(s)} disabled={busy === s.id}>{busy === s.id ? <Loader2 size={13} className="fe-spin" /> : <KeyRound size={13} />} Reset password</button>
                    <button type="button" className="fe-ghost sm" onClick={() => toggleAccount(s, s.name, refresh)}><Power size={13} /> {s.enabled ? 'Deactivate' : 'Reactivate'}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section className="fe-card" style={{ marginTop: 14, padding: 16 }}>
        <label style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input type="checkbox" style={{ marginTop: 4 }} checked={!!office.data?.selfCashUp} disabled={!office.data} onChange={e => setAlone(e.target.checked)} />
          <span style={{ minWidth: 0 }}>
            <span className="fe-strong">One-person accounts office</span>
            <span className="fe-muted fe-small" style={{ display: 'block', marginTop: 2 }}>
              Turn on when the bursar also does the cashier's work. Their own cash-ups are then recorded without a second check;
              otherwise you confirm them (a bursar never confirms their own). A cashier's cash-ups are always confirmed by the bursar or you.
            </span>
          </span>
        </label>
      </section>

      {adding && <StaffDialog onClose={() => setAdding(false)} onSaved={s => { setAdding(false); setIssued(s); refresh(); }} />}
      {editing && <StaffDialog staff={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {issued?.password && <PasswordDialog staff={issued} onClose={() => setIssued(null)} />}
    </div>
  );
}

function StaffDialog({ staff, onClose, onSaved }: { staff?: Staff; onClose: () => void; onSaved: (s: Staff) => void }) {
  const [f, setF] = useState({ firstname: staff?.firstname ?? '', lastname: staff?.lastname ?? '', username: staff?.username ?? '',
    email: staff?.email ?? '', phone: staff?.phone ?? '', duty: (staff?.duty ?? 'CASHIER') as Duty, emailLogin: true });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: any) => setF(x => ({ ...x, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const s = staff
        ? await updateFinanceStaff(staff.id, { firstname: f.firstname, lastname: f.lastname, phone: f.phone, duty: f.duty })
        : await addFinanceStaff({ firstname: f.firstname, lastname: f.lastname, username: f.username, email: f.email, phone: f.phone || undefined, duty: f.duty, emailLogin: f.emailLogin });
      toast.success(staff ? 'Saved' : `${s.name} added`);
      onSaved(s);
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Could not save'); }
    finally { setBusy(false); }
  };

  return (
    <FeeModal title={staff ? `Edit ${staff.name}` : 'Add an accountant'} onClose={onClose} busy={busy} narrow
      footer={<>
        <span />
        <div className="fe-foot-actions">
          <button type="button" className="fe-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="fe-btn" onClick={save} disabled={busy}>{busy ? <Loader2 size={15} className="fe-spin" /> : <Save size={15} />} {staff ? 'Save' : 'Add'}</button>
        </div>
      </>}>
      <div className="fe-grid2">
        <div className="fe-field"><label className="fe-label" htmlFor="fs-first">First name</label>
          <input id="fs-first" className="fe-input" style={{ width: '100%' }} value={f.firstname} onChange={e => set('firstname', e.target.value)} maxLength={60} /></div>
        <div className="fe-field"><label className="fe-label" htmlFor="fs-last">Last name</label>
          <input id="fs-last" className="fe-input" style={{ width: '100%' }} value={f.lastname} onChange={e => set('lastname', e.target.value)} maxLength={60} /></div>
      </div>
      {!staff && (
        <div className="fe-grid2">
          <div className="fe-field"><label className="fe-label" htmlFor="fs-id">Staff ID (sign-in name)</label>
            <input id="fs-id" className="fe-input" style={{ width: '100%' }} value={f.username} onChange={e => set('username', e.target.value)} maxLength={60} autoComplete="off" /></div>
          <div className="fe-field"><label className="fe-label" htmlFor="fs-email">Email</label>
            <input id="fs-email" type="email" className="fe-input" style={{ width: '100%' }} value={f.email} onChange={e => set('email', e.target.value)} maxLength={120} /></div>
        </div>
      )}
      <div className="fe-field"><label className="fe-label" htmlFor="fs-phone">Phone <span className="fe-muted" style={{ fontWeight: 500 }}>(optional)</span></label>
        <input id="fs-phone" type="tel" className="fe-input" style={{ width: '100%' }} value={f.phone} onChange={e => set('phone', e.target.value)} maxLength={30} /></div>
      <div className="fe-field">
        <span className="fe-label">Duty</span>
        <div className="fe-seg" role="radiogroup" aria-label="Duty">
          {(Object.keys(DUTY) as Duty[]).map(d => (
            <button key={d} type="button" role="radio" aria-checked={f.duty === d} className={f.duty === d ? 'active' : ''} onClick={() => set('duty', d)}>
              <span>{DUTY[d].label}</span><small>{DUTY[d].sub}</small>
            </button>
          ))}
        </div>
      </div>
      {!staff && (
        <label className={`fe-check${f.emailLogin ? ' on' : ''}`}>
          <input type="checkbox" checked={f.emailLogin} onChange={e => set('emailLogin', e.target.checked)} />
          <Mail size={13} /> Email them their sign-in details
        </label>
      )}
    </FeeModal>
  );
}

function PasswordDialog({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const copy = () => navigator.clipboard?.writeText(`${staff.username} / ${staff.password}`).then(() => toast.success('Copied'));
  return (
    <FeeModal title="Temporary password" subtitle={`${staff.name} · ${staff.username}`} onClose={onClose} narrow
      footer={<><span /><div className="fe-foot-actions"><button type="button" className="fe-ghost" onClick={copy}><Copy size={15} /> Copy</button>
        <button type="button" className="fe-btn" onClick={onClose}>Done</button></div></>}>
      <div className="fs-pw">{staff.password}</div>
      <p className="fe-hint" style={{ fontSize: 13 }}>
        Shown only now. {staff.emailed ? `It was also emailed to ${staff.email}. ` : ''}They must choose their own password when they first sign in.
      </p>
    </FeeModal>
  );
}

const STAFF_CSS = `
.fs-staff { list-style: none; margin: 0; padding: 4px 18px 10px; }
.fs-staff li { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; }
.fs-staff li:last-child { border-bottom: none; }
.fs-staff li.off { opacity: .6; }
.fs-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--brand)); color: var(--brand-contrast); display: grid; place-items: center; font-weight: 800; flex-shrink: 0; }
.fs-duty { display: inline-block; margin-left: 8px; font-size: 10.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; padding: 2px 8px; border-radius: 6px; vertical-align: 1px; }
.fs-duty.BURSAR { background: rgba(251,191,36,0.15); color: #fbbf24; }
.fs-duty.CASHIER { background: rgba(56,189,248,0.15); color: #38bdf8; }
.fs-duty.off { background: rgba(248,113,113,0.15); color: #f87171; }
.fs-pw { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 26px; font-weight: 800; letter-spacing: .08em; text-align: center; padding: 18px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px dashed rgba(255,255,255,0.2); overflow-wrap: anywhere; }
@media (max-width: 640px) { .fs-staff .fe-row-actions { width: 100%; justify-content: flex-start; padding-left: 50px; } }
`;
