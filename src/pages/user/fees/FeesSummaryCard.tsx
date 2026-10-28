import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Wallet } from 'lucide-react';
import { getMyFees } from '../../../api/endpoints';
import { formatDate, formatMoney } from '../../../utils/money';
import { STUDENT_FEE_CSS } from './studentFeeStyles';

/** Student dashboard: fee balance at a glance with a shortcut to pay. Renders nothing until there's a fee. */
export default function FeesSummaryCard() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['my-fees'], queryFn: getMyFees, retry: false, staleTime: 60_000 });
  const bills = data?.billsBalance ?? 0;
  if (!data || (!data.fee && bills <= 0)) return null;

  // Everything owed so far this session (every term up to now) and bills, less credit
  const total = data.totalFees ?? data.fee?.amount ?? 0;
  const paidSoFar = Math.min(data.totalPaid ?? data.paid, total);
  const balance = data.toPay ?? data.totalBalance ?? data.balance;
  const paid = balance <= 0;
  const pct = total > 0 ? Math.min(100, (paidSoFar / total) * 100) : 0;
  return (
    <div className="sf lexa-card" style={{ marginBottom: 16, padding: 0 }}>
      <style>{STUDENT_FEE_CSS}</style>
      <div className="sf-dash">
        <div className="sf-dash-ico" style={paid ? { background: '#eafaf3', color: '#0f9d6e' } : { background: 'var(--brand-soft)', color: 'var(--brand-text)' }}>
          {paid ? <CheckCircle2 size={26} /> : <Wallet size={26} />}
        </div>
        <div className="sf-dash-main">
          <small>{data.fee ? 'School fees' : 'Bills'}{data.fee && bills > 0 ? ' and bills' : ''} · {data.session.name}</small>
          <b>{paid ? 'Fully paid' : `${formatMoney(balance, data.currency)} to pay`}</b>
          {data.fee && <>
            <div className="sf-progress-track"><span style={{ width: `${pct}%` }} /></div>
            <div style={{ fontSize: 12, color: '#74788d', marginTop: 6, fontWeight: 600 }}>
              {formatMoney(paidSoFar, data.currency)} of {formatMoney(total, data.currency)} fees paid
              {bills > 0 ? ` · bills ${formatMoney(bills, data.currency)}` : ''}
              {!paid && data.fee.dueDate ? ` · due ${formatDate(data.fee.dueDate)}` : ''}
            </div>
          </>}
        </div>
        <button type="button" className={paid ? 'sf-btn-ghost' : 'sf-btn'} onClick={() => navigate('/user-dashboard/fees')}>
          {paid ? 'View fees' : data.onlinePayment ? 'Pay now' : 'View fees'} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
