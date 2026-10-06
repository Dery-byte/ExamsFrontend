import { Link } from 'react-router-dom';
import { Lock, Wallet } from 'lucide-react';
import type { ResultsHold } from '../../api/endpoints';
import { tx } from '../../utils/terms';
import { formatMoney } from '../../utils/money';

/** Shown to a student instead of their report cards / transcript while unpaid fees hold them back. */
export default function ResultsHoldNotice({ hold, compact = false }: { hold: ResultsHold; compact?: boolean }) {
  return (
    <div role="alert" style={{
      maxWidth: compact ? undefined : 640, margin: compact ? '0 0 16px' : '24px auto', padding: compact ? '16px 18px' : '36px 32px',
      background: '#fff', border: '1px solid #fde68a', borderRadius: 16, boxShadow: compact ? 'none' : '0 4px 20px rgba(0,0,0,0.06)',
      display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: compact ? 'flex-start' : 'center', gap: compact ? 14 : 12,
      textAlign: compact ? 'left' : 'center',
    }}>
      <div style={{ width: compact ? 38 : 56, height: compact ? 38 : 56, borderRadius: '50%', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Lock size={compact ? 18 : 26} />
      </div>
      <div style={{ minWidth: 0 }}>
        <h3 style={{ margin: compact ? '0 0 4px' : '4px 0 8px', fontSize: compact ? 15 : 19, fontWeight: 800, color: '#0f172a' }}>
          {tx('Results on hold for unpaid fees')}
        </h3>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: '#475569' }}>{hold.message}</p>
        {!compact && hold.unpaidItems.length > 0 && (
          <ul style={{ listStyle: 'none', padding: 0, margin: '14px auto 0', maxWidth: 360, textAlign: 'left' }}>
            {hold.unpaidItems.map(i => (
              <li key={i.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                <span style={{ color: '#334155' }}>{i.name}</span>
                <b style={{ color: '#0f172a' }}>{formatMoney(i.balance, hold.currency)} left</b>
              </li>
            ))}
          </ul>
        )}
        {!compact && hold.feesPage && (
          <Link to="/user-dashboard/fees" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 18, height: 40, padding: '0 18px', borderRadius: 10, background: '#5156be', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
            <Wallet size={16} /> {tx('Go to School Fees')}
          </Link>
        )}
      </div>
    </div>
  );
}
