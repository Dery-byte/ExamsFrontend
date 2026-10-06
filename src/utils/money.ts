import type { FeePaymentInfo } from '../api/endpoints';

const formatters = new Map<string, Intl.NumberFormat>();

/** "GH₵3,000.00" — falls back to "GHS 3000.00" if the browser doesn't know the currency. */
export function formatMoney(amount: number | string | null | undefined, currency = 'GHS'): string {
  const n = Number(amount ?? 0);
  const value = Number.isFinite(n) ? n : 0;
  try {
    let f = formatters.get(currency);
    if (!f) {
      f = new Intl.NumberFormat('en-GH', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
      formatters.set(currency, f);
    }
    return f.format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

/** Parses what someone typed into a money field ("1,500.5" → 1500.5); NaN when it isn't a number. */
export function parseMoney(text: string): number {
  const clean = text.replace(/[,\s]/g, '');
  if (!/^\d*\.?\d{0,2}$/.test(clean) || clean === '' || clean === '.') return NaN;
  return Number(clean);
}

/** Keeps only digits, one dot and two decimals while typing. */
export function moneyInput(text: string): string {
  let t = text.replace(/[^\d.]/g, '');
  const dot = t.indexOf('.');
  if (dot >= 0) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, '').slice(0, 2);
  return t;
}

/** Rounds to pesewas so totals of typed amounts don't show float noise. */
export const roundMoney = (n: number) => Math.round(n * 100) / 100;

/** "Mobile Money", "Card", "Cash" … for a payment. */
export function paymentMethodLabel(p: Pick<FeePaymentInfo, 'method' | 'channel'>): string {
  if (p.method === 'CASH') return 'Cash';
  if (p.method === 'BANK_TRANSFER') return 'Bank transfer';
  if (p.method === 'OTHER') return 'Other';
  switch (p.channel) {
    case 'card': return 'Card';
    case 'mobile_money': return 'Mobile Money';
    case 'bank': case 'bank_transfer': return 'Bank';
    case 'ussd': return 'USSD';
    case null: case undefined: case '': return 'Online';
    default: return p.channel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return '—';
  // A bare date ("2026-12-01") is a calendar day, not UTC midnight
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const d = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}
