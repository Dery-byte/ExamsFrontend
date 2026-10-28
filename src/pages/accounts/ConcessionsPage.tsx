import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ban, Gift, Plus, Search } from 'lucide-react';
import { FEE_ADMIN_CSS } from '../superadmin/fees/feeStyles';
import ConcessionModal from './ConcessionModal';
import { BILL_CSS, useBursar } from './BillsPage';
import { AccountsHead, askReason, errorText, Totals } from './accountsUi';
import { getConcessions, revokeConcession, type ConcessionInfo } from '../../api/endpoints';
import { formatDate, formatMoney } from '../../utils/money';
import { levelName, periodsPerLevel, tx, levelSuffix } from '../../utils/terms';
import { useAuth } from '../../contexts/AuthContext';

/** Every concession this session, what each student saves, and granting or revoking them (bursar). */
export default function ConcessionsPage() {
  const qc = useQueryClient();
  const bursar = useBursar();
  const { user } = useAuth() as any;
  const base = user?.role === 'ACCOUNTANT' ? '/accounts/students' : '/super-admin/student-accounts';
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['concessions'], queryFn: () => getConcessions() });
  const refresh = () => qc.invalidateQueries({ queryKey: ['concessions'] });
  const cur = data?.currency ?? 'GHS';
  const needle = q.trim().toLowerCase();
  const rows = (data?.concessions ?? []).filter(c => !needle || `${c.studentName} ${c.username} ${c.title}`.toLowerCase().includes(needle));

  const revoke = async (c: ConcessionInfo) => {
    const reason = await askReason(`Revoke “${c.title}”?`, `${c.studentName}'s fees go back up; any credit they have goes to them.`, 'Revoke');
    if (!reason) return;
    try { await revokeConcession(c.id, reason); toast.success('Concession revoked'); refresh(); }
    catch (e) { toast.error(errorText(e, 'Could not revoke')); }
  };

  return (
    <div className="fe">
      <style>{FEE_ADMIN_CSS + BILL_CSS}</style>
      <AccountsHead icon={<Gift size={24} color="#fff" />} title="Concessions"
        sub={tx('Scholarships, bursaries, sibling and staff-child discounts and waivers on school fees.')}
        actions={bursar && data && !data.closed ? <button type="button" className="fe-btn" onClick={() => setAdding(true)}><Plus size={15} /> Grant concession</button> : undefined} />
      {data && <Totals items={[
        { label: 'Session', value: data.session.name }, { label: tx('Students'), value: String(data.students) },
        { label: 'Fees forgone', value: formatMoney(data.totalSaved, cur), tone: 'warn' },
      ]} />}
      {data?.closed && <div className="fe-note warn" style={{ margin: '12px 0' }}><span>{data.session.name} fees are closed (now arrears), so concessions can no longer change.</span></div>}
      <div className="fe-card" style={{ marginTop: 14 }}>
        <div className="bl-bar">
          <div className="fe-search" style={{ flex: '1 1 240px', maxWidth: 420 }}>
            <Search size={15} /><input className="fe-input" placeholder={tx('Search name, Student ID or concession')} value={q} onChange={e => setQ(e.target.value)} aria-label="Search concessions" />
          </div>
        </div>
        {isLoading ? <div style={{ padding: 18 }}><div className="fe-skel" style={{ height: 120 }} /></div> : rows.length === 0 ? (
          <div className="fe-empty"><Gift size={34} style={{ color: 'rgba(var(--accent-rgb), 0.45)' }} /><h3>{needle ? 'Nothing matches' : 'No concessions yet'}</h3>
            <p>{bursar ? 'Grant one to take money off a student’s fees.' : 'Only the bursar grants concessions.'}</p></div>
        ) : (
          <ul className="bl-list">
            {rows.map(c => (
              <li key={c.id} className="bl-row" style={c.active ? undefined : { opacity: 0.55 }}>
                <div className="bl-main">
                  <div className="fe-strong"><Link to={`${base}?student=${c.studentId}`} className="fe-link" style={{ color: 'inherit' }}>{c.studentName}</Link>
                    <span className="fe-muted fe-small"> · {c.username}{c.programName ? ` · ${c.programName}` : ''}{levelSuffix(c.level)}</span></div>
                  <div className="fe-small" style={{ marginTop: 2 }}>{c.title} <span className="fe-muted">({c.kindLabel})</span>: <b>{describe(c, cur)}</b></div>
                  <div className="fe-muted fe-small">{c.active ? c.note : `Revoked by ${c.revokedBy}: ${c.revokeReason}`} · {c.createdBy} · {formatDate(c.createdAt)}</div>
                </div>
                <div className="bl-amt">
                  {c.studentSaves != null && <div className="fe-strong" style={{ color: '#fbbf24' }}>{formatMoney(c.studentSaves, cur)}</div>}
                  <div className="fe-muted fe-small">{c.active ? (c.studentSaves != null ? 'saved this session' : '') : 'revoked'}</div>
                </div>
                {bursar && c.active && !data?.closed && <button type="button" className="fe-icon-btn danger" onClick={() => revoke(c)} aria-label={`Revoke ${c.title}`}><Ban size={14} /></button>}
              </li>
            ))}
          </ul>
        )}
      </div>
      {adding && data && <ConcessionModal currency={cur} terms={periodsPerLevel()} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refresh(); }} />}
    </div>
  );
}

/** "50% of Tuition · Term 1" / "GHS 100.00 off each fee". */
export function describe(c: ConcessionInfo, currency: string) {
  const v = c.mode === 'PERCENT' ? `${c.value}%` : `${formatMoney(c.value, currency)} off`;
  const on = c.items.length ? ` of ${c.items.join(', ')}` : c.mode === 'PERCENT' ? ' of the fee' : ' each fee';
  return v + on + (c.termName ? ` · ${tx(c.termName)} only` : '');
}
