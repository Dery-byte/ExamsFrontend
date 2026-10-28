import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CreditCard, Eye, Layers, ListChecks, Loader2, SlidersHorizontal } from 'lucide-react';
import { getFeeSettings, saveFeeSettings, type FeeSettings } from '../../api/endpoints';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import ResultsHoldSettings from '../superadmin/fees/ResultsHoldSettings';
import { tx } from '../../utils/terms';

const TOGGLES: { key: keyof FeeSettings; label: string; sub: string; icon: ReactNode }[] = [
  { key: 'visibleToStudents', label: tx('Students see their fees'), sub: tx('Adds "School Fees" to the student menu and a fee card to their dashboard.'), icon: <Eye size={18} /> },
  { key: 'onlinePayment', label: 'Online payment (Paystack)', sub: 'Students pay by card or Mobile Money. When off, they pay at the accounts office and a cashier records it.', icon: <CreditCard size={18} /> },
  { key: 'partPayment', label: 'Part payments', sub: 'Students may pay in instalments. When off, each payment must clear the fee.', icon: <Layers size={18} /> },
  { key: 'stockIssueUnpaid', label: 'Hand over store items before payment', sub: 'Uniform, books and other stocked items may be handed over while the bill is unpaid. When off, they are handed over once it is paid in full.', icon: <ListChecks size={18} /> },
  { key: 'itemPayment', label: 'Pay by item', sub: 'Where a fee has a breakdown, students can pay for chosen items (e.g. PTA levy first).', icon: <ListChecks size={18} /> },
];

/** The bursar's fee switches and results-hold rules (the Super Admin has the same under Configuration). */
export default function FeeSettingsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['fee-settings'], queryFn: getFeeSettings });
  const [busy, setBusy] = useState<keyof FeeSettings | null>(null);

  const flip = async (key: keyof FeeSettings) => {
    if (!q.data) return;
    const next = !q.data.settings[key];
    setBusy(key);
    try {
      const r = await saveFeeSettings({ [key]: next });
      qc.setQueryData(['fee-settings'], r);
      qc.invalidateQueries({ queryKey: ['fee-overview'] });
      qc.invalidateQueries({ queryKey: ['results-holds'] });
      toast.success('Saved');
    } catch (e: any) { toast.error(tx(e?.response?.data?.message ?? 'Could not save')); }
    finally { setBusy(null); }
  };

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + SET_CSS}</style>
      <div className="fe-head">
        <div className="fe-title">
          <div className="fe-logo"><SlidersHorizontal size={24} color="#fff" /></div>
          <div style={{ minWidth: 0 }}>
            <h1 className="fe-h1">Fee settings</h1>
            <p className="fe-sub">How students see and pay their fees. Every change is recorded in the audit log.</p>
          </div>
        </div>
      </div>

      <section className="fe-card">
        {q.isLoading ? <div className="fe-empty"><Loader2 size={24} className="fe-spin" /></div> : q.data && (
          <ul className="fs-list">
            {TOGGLES.map(t => {
              const on = q.data.settings[t.key];
              const disabled = t.key === 'onlinePayment' && !q.data.paystack.configured;
              return (
                <li key={t.key}>
                  <span className="fs-ico">{t.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fe-strong">{t.label}</div>
                    <div className="fe-muted fe-small" style={{ marginTop: 2, lineHeight: 1.45 }}>
                      {t.sub}{disabled ? ' Paystack is not connected on the server yet.' : ''}
                    </div>
                  </div>
                  <button type="button" role="switch" aria-checked={on} aria-label={t.label} className={`fs-switch${on ? ' on' : ''}`}
                    onClick={() => flip(t.key)} disabled={busy !== null}>
                    <span>{busy === t.key && <Loader2 size={11} className="fe-spin" />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ResultsHoldSettings />
    </div>
  );
}

const SET_CSS = `
.fs-list { list-style: none; margin: 0; padding: 6px 18px; }
.fs-list li { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
.fs-list li:last-child { border-bottom: none; }
.fs-ico { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; background: rgba(var(--accent-rgb), 0.14); color: var(--accent-light); }
.fs-switch { position: relative; width: 46px; height: 26px; border-radius: 13px; border: none; background: rgba(255,255,255,0.16); cursor: pointer; flex-shrink: 0; transition: background .15s; }
.fs-switch span { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; display: grid; place-items: center; color: #334155; transition: transform .15s; }
.fs-switch.on { background: #10b981; }
.fs-switch.on span { transform: translateX(20px); }
.fs-switch:disabled { opacity: .6; cursor: default; }
.fs-switch:focus-visible { outline: 2px solid var(--accent-light); outline-offset: 2px; }
@media (pointer: coarse) { .fs-switch { width: 52px; height: 30px; border-radius: 15px; } .fs-switch span { width: 24px; height: 24px; } .fs-switch.on span { transform: translateX(22px); } }
`;
