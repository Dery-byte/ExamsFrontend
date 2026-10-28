import { useRef, type ReactNode } from 'react';
import { Printer } from 'lucide-react';
import { useInstitution } from '../../../hooks/useInstitution';
import { institutionLogoUrl, type FeePaymentInfo } from '../../../api/endpoints';
import { formatDate, formatMoney, paymentMethodLabel } from '../../../utils/money';
import { levelName, tx, isSchoolMode } from '../../../utils/terms';
import { STUDENT_FEE_CSS } from './studentFeeStyles';
import FeeDialog from './FeeDialog';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * A payment's receipt, for the student and the accounts office alike: receipt number, what it was for
 * (term, items), how it was paid and who took it, and the code that checks it on the verification page.
 * Prints from its own frame. {@code foot}: e.g. the student's balance after it.
 */
export default function ReceiptModal({ payment, foot, onClose }: { payment: FeePaymentInfo; foot?: ReactNode; onClose: () => void }) {
  const { institution } = useInstitution();
  const method = payment.method === 'PAYSTACK' ? `${paymentMethodLabel(payment)} (Paystack)` : paymentMethodLabel(payment);
  const receiptRef = useRef<HTMLDivElement>(null);
  const verifyUrl = payment.verificationCode ? `${(institution.portalUrl || window.location.origin).replace(/\/+$/, '')}/verify/${payment.verificationCode}` : null;
  const voided = payment.status === 'VOIDED';
  const allocations = payment.allocations ?? [];
  // Lines: the items paid for, else where the money went when it was more than one fee
  const lines = payment.items.length > 0 ? payment.items.map(i => ({ label: i.name, amount: i.amount }))
    : allocations.length > 1 || allocations.some(a => a.kind !== 'FEE') ? allocations : [];

  /** Prints only the receipt, from its own frame (printing the page would include the hidden dashboard's height). */
  const print = () => {
    const node = receiptRef.current;
    if (!node) return;
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    document.body.appendChild(frame);
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) { frame.remove(); window.print(); return; }
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${payment.receiptNo ?? payment.reference}</title>`
      + `<style>${STUDENT_FEE_CSS} body{margin:24px;font-family:Inter,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact} .sf-receipt{border:none}</style>`
      + `</head><body>${node.outerHTML}</body></html>`);
    doc.close();
    const go = () => { win.focus(); win.print(); setTimeout(() => frame.remove(), 1000); };
    // Wait for the logo, but never more than 2 s
    const pending = Array.from(doc.images).filter(img => !img.complete);
    if (pending.length === 0) go();
    else Promise.race([
      Promise.all(pending.map(img => new Promise(r => { img.onload = img.onerror = r; }))),
      sleep(2000),
    ]).then(go);
  };

  return (
    <FeeDialog title="Receipt" subtitle="Print it or save it as a PDF." onClose={onClose} wide
      footer={<>
        <button type="button" className="sf-btn-ghost" onClick={onClose}>Close</button>
        <button type="button" className="sf-btn" onClick={print}><Printer size={16} /> Print / Save PDF</button>
      </>}>
      <style>{STUDENT_FEE_CSS}</style>
      <div className="sf-receipt" ref={receiptRef}>
        <div className="sf-receipt-head">
          <div className="sf-receipt-brand">
            {institution.hasLogo && <img src={institutionLogoUrl(institution.logoVersion)} alt="" />}
            <div style={{ minWidth: 0 }}>
              <h3>{institution.name}</h3>
              {institution.subtitle && <p>{institution.subtitle}</p>}
            </div>
          </div>
          <div className="sf-receipt-title"><b>Official receipt</b><span>{payment.receiptNo ?? payment.reference}</span></div>
        </div>
        <div className="sf-stamp" aria-hidden="true" style={voided ? { color: '#dc2626', borderColor: '#dc2626' } : undefined}>{voided ? 'CANCELLED' : 'PAID'}</div>
        <dl className="sf-receipt-grid">
          <div><dt>Receipt no.</dt><dd style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontWeight: 800 }}>{payment.receiptNo ?? '—'}</dd></div>
          <div><dt>Date paid</dt><dd>{formatDate(payment.paidAt ?? payment.createdAt, true)}</dd></div>
          <div><dt>{tx('Student')}</dt><dd>{payment.studentName}</dd></div>
          <div><dt>{tx('Student ID')}</dt><dd>{payment.studentId}</dd></div>
          <div><dt>{tx('Programme')}</dt><dd>{payment.programName ?? '—'}</dd></div>
          {!isSchoolMode() && <div><dt>{tx('Level')}</dt><dd>{payment.level != null ? levelName(payment.level) : '—'}</dd></div>}
          <div><dt>For</dt><dd>{allocations.length === 1 ? tx(allocations[0].label) : allocations.length > 1 ? 'See below'
            : `${payment.periodName && payment.periodName !== 'Whole year' ? `${tx(payment.periodName)}, ` : ''}${payment.sessionName} fees`}</dd></div>
          <div><dt>Payment method</dt><dd>{method}</dd></div>
          {payment.recordedBy && <div><dt>Received by</dt><dd>{payment.recordedBy}</dd></div>}
          <div><dt>Reference</dt><dd style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{payment.reference}</dd></div>
        </dl>
        {lines.length > 0 && (
          <table className="sf-lines" style={{ marginBottom: 12 }}>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}><td><span className="sf-dot" />{tx(l.label)}</td><td>{formatMoney(l.amount, payment.currency)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="sf-receipt-amount"><span>Amount paid</span><strong>{formatMoney(payment.amount, payment.currency)}</strong></div>
        <div className="sf-receipt-foot">
          {foot}
          {foot && <br />}
          {verifyUrl
            ? <>Check this receipt at <b>{verifyUrl}</b> (code <b style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace' }}>{payment.verificationCode}</b>).<br /></>
            : null}
          Issued electronically by {institution.name}. Quote the receipt number in any enquiry.
        </div>
      </div>
    </FeeDialog>
  );
}
