import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CreditCard, KeyRound, Loader2, Save, ShieldAlert, ShieldCheck, CalendarPlus, Users, History, Info, AlertTriangle, X,
  Link2, RefreshCw, Unlink, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  getSubscription, checkSubscriptionKey, installSubscriptionKey, suspendPortal, resumePortal, extendSubscription,
  clearSubscriptionExtension, saveSubscriptionSettings, linkVendorPortal, unlinkVendorPortal, syncSubscriptionNow,
  type SubscriptionDetails, type SubscriptionKeyInfo, type SubscriptionStateName,
} from '../../../api/endpoints';
import { PanelHeader, PanelLoading, PanelError, apiMessage, relativeTime, fullDate, useNow } from './ui';

const LABEL: Record<SubscriptionStateName, string> = {
  ACTIVE: 'Active', GRACE: 'Grace period', RESTRICTED: 'Read-only', SUSPENDED: 'Suspended',
};
const TONE: Record<SubscriptionStateName, 'ok' | 'warn' | 'bad'> = {
  ACTIVE: 'ok', GRACE: 'warn', RESTRICTED: 'bad', SUSPENDED: 'bad',
};
const EVENT_LABEL: Record<string, string> = {
  KEY_INSTALLED: 'Key installed', STATE_CHANGED: 'State changed', SUSPENDED: 'Suspended by hand', RESUMED: 'Suspension lifted',
  EXTENDED: 'Grace extended', EXTENSION_REMOVED: 'Extension removed', SETTINGS: 'Settings changed', REMINDER: 'Reminder emailed',
  VENDOR_LINKED: 'Linked to the vendor portal', VENDOR_UNLINKED: 'Unlinked from the vendor portal',
};

const day = (d?: string | null) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00`);
  x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const days = (n: number | null) => (n == null ? '' : n <= 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);

/** Block access when the institution hasn't paid: install keys, choose who is told, extend or suspend. */
export default function SubscriptionPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['dev-subscription'], queryFn: getSubscription });
  const now = useNow();
  const [busy, setBusy] = useState<string | null>(null);

  const header = (
    <PanelHeader
      title="Subscription"
      description="Limits the portal step by step when the institution hasn't paid: a grace period, then read-only, then suspended. Exams already in progress are never interrupted, and developers are never locked out."
    />
  );
  if (q.isLoading) return <section>{header}<PanelLoading label="Loading subscription" /></section>;
  if (q.isError || !q.data) return <section>{header}<PanelError message="Could not load the subscription." onRetry={() => q.refetch()} /></section>;
  const s = q.data;

  /** Runs a change, shows the new state and refreshes everything that depends on it. */
  const run = async (kind: string, action: () => Promise<SubscriptionDetails>, ok: string) => {
    setBusy(kind);
    try {
      const next = await action();
      qc.setQueryData(['dev-subscription'], next);
      qc.invalidateQueries({ queryKey: ['subscription-notice'] });
      qc.invalidateQueries({ queryKey: ['dev-setup'] });
      toast.success(ok);
      return true;
    } catch (err) {
      toast.error(apiMessage(err, 'That did not work'));
      return false;
    } finally { setBusy(null); }
  };

  return (
    <section>
      {header}
      <StatusBanner s={s} />
      <Timeline s={s} />
      <VendorCard s={s} busy={busy} run={run} now={now} />

      <div className="dd-two">
        <KeyCard s={s} busy={busy} run={run} />
        <AudienceCard s={s} busy={busy} run={run} />
      </div>
      <div className="dd-two">
        <ExtensionCard s={s} busy={busy} run={run} />
        <SuspendCard s={s} busy={busy} run={run} now={now} />
      </div>
      <HistoryCard s={s} now={now} />
      <style>{CSS}</style>
    </section>
  );
}

type Run = (kind: string, action: () => Promise<SubscriptionDetails>, ok: string) => Promise<boolean>;
interface CardProps { s: SubscriptionDetails; busy: string | null; run: Run }

function StatusBanner({ s }: { s: SubscriptionDetails }) {
  const tone = TONE[s.state];
  const headline = s.suspendedReason ? 'Suspended by you'
    : s.providerSuspended ? 'Suspended from the vendor portal'
    : s.state === 'ACTIVE' ? `Active, paid until ${day(s.paidUntil)}`
    : s.state === 'GRACE' ? `Grace period: read-only ${days(s.daysLeft)}`
    : s.state === 'RESTRICTED' ? `Read-only: suspended ${days(s.daysLeft)}`
    : 'Suspended: subscription not renewed';
  const sub = s.suspendedReason ? `Reason: ${s.suspendedReason}`
    : s.providerSuspended ? (s.key?.note ? `Reason: ${s.key.note}. Lift it in the vendor portal.` : 'Lift it in the vendor portal.')
    : s.nextChange ? `${LABEL[s.nextState ?? 'SUSPENDED']} from ${day(s.nextChange)}` : 'Only the Super Admin (read-only) and developers can sign in.';
  return (
    <>
      <div className={`dd-banner dd-banner-${tone}`}>
        <span className={`dd-pulse dd-tone-${tone}`} aria-hidden />
        <div className="dd-banner-main">
          <strong>{headline}</strong>
          <span>{sub}</span>
        </div>
        <dl className="dd-banner-meta">
          <div><dt>Plan</dt><dd>{s.key?.plan ?? 'No key'}</dd></div>
          <div><dt>Institution</dt><dd>{s.key ? `${s.key.institutionName} (${s.key.institutionId})` : '—'}</dd></div>
          <div><dt>Paid until</dt><dd>{s.key ? day(s.paidUntil) : '—'}</dd></div>
        </dl>
      </div>
      {s.source === 'NO_KEY' && (
        <div className="dd-callout dd-callout-warn sp-gap" role="status">
          <AlertTriangle size={18} />
          <div><strong>No subscription key installed.</strong> Since {day(s.firstSeen)} this deployment has run on its 30-day allowance; it turns
            read-only on {day(addDays(s.graceEnd, 1))}. The institution is only told in the last week. Install a key below.</div>
        </div>
      )}
      {(s.source === 'INVALID_KEY' || s.source === 'WRONG_INSTITUTION') && (
        <div className="dd-callout dd-callout-bad sp-gap" role="alert">
          <ShieldAlert size={18} />
          <div><strong>The installed key is not accepted.</strong> {s.keyProblem} The portal is treated as having no key.</div>
        </div>
      )}
    </>
  );
}

/** The four stages with their dates, the current one highlighted. */
function Timeline({ s }: { s: SubscriptionDetails }) {
  const steps: { state: SubscriptionStateName; when: string; what: string }[] = [
    { state: 'ACTIVE', when: s.key ? `Until ${day(s.paidUntil)}` : 'No paid period', what: 'Everything works.' },
    { state: 'GRACE', when: `${day(addDays(s.paidUntil, 1))} – ${day(s.graceEnd)}`, what: 'Everything works; the chosen audience sees a warning and gets emails.' },
    { state: 'RESTRICTED', when: `${day(addDays(s.graceEnd, 1))} – ${day(s.restrictedEnd)}`, what: 'View and export only. No new exams, no changes, no sign-ups.' },
    { state: 'SUSPENDED', when: `From ${day(addDays(s.restrictedEnd, 1))}`, what: 'Only the Super Admin (read-only, to export) and developers.' },
  ];
  const skipped = (st: SubscriptionStateName) =>
    (st === 'GRACE' && s.graceEnd === s.paidUntil && !s.extendedUntil) || (st === 'RESTRICTED' && s.restrictedEnd === s.graceEnd);
  return (
    <ol className="sp-steps" aria-label="Subscription stages">
      {steps.map(st => (
        <li key={st.state} className={`sp-step sp-t-${TONE[st.state]}${s.state === st.state ? ' is-now' : ''}${skipped(st.state) ? ' is-skipped' : ''}`}
          aria-current={s.state === st.state ? 'step' : undefined}>
          <span className="sp-step-name">{LABEL[st.state]}{s.state === st.state && <span className="dd-tag dd-tag-accent">Now</span>}</span>
          <span className="sp-step-when">{skipped(st.state) ? 'Skipped (0 days)' : st.when}</span>
          <span className="sp-step-what">{st.what}</span>
        </li>
      ))}
    </ol>
  );
}

/** The automatic link: the portal checks in every 6 hours and installs newer keys by itself. */
function VendorCard({ s, busy, run, now }: CardProps & { now: number }) {
  const v = s.vendor;
  const qc = useQueryClient();
  const [url, setUrl] = useState(v.url ?? '');
  const [token, setToken] = useState('');
  const [syncing, setSyncing] = useState(false);
  useEffect(() => { setUrl(v.url ?? ''); }, [v.url]);
  const linked = !!v.url && v.tokenSet;

  const checkNow = async () => {
    setSyncing(true);
    try {
      const next = await syncSubscriptionNow();
      qc.setQueryData(['dev-subscription'], next);
      qc.invalidateQueries({ queryKey: ['subscription-notice'] });
      if (next.vendor.lastOk) toast.success(next.syncResult ?? 'Checked in.');
      else toast.error(next.syncResult ?? 'Check-in failed.');
    } catch (err) { toast.error(apiMessage(err, 'Check-in failed')); }
    finally { setSyncing(false); }
  };

  return (
    <div className="dd-card sp-gap-lg">
      <div className="dd-card-head">
        <h2 className="dd-card-title"><Link2 size={16} /> Vendor portal link</h2>
        {linked && (
          <button type="button" className="dd-btn dd-btn-sm" onClick={checkNow} disabled={syncing}>
            {syncing ? <Loader2 size={13} className="dd-spin" /> : <RefreshCw size={13} />} Check in now
          </button>
        )}
      </div>
      <p className="dd-card-text">Linked, this portal checks in with the vendor portal every 6 hours and installs renewed keys by itself, so
        nobody pastes keys after each payment. If the vendor portal can't be reached, nothing changes: the installed key stays in force.</p>

      {linked && (
        <div className={`sp-sync${v.lastOk === false ? ' is-bad' : v.lastOk ? ' is-ok' : ''}`} role="status">
          {v.lastOk === false ? <XCircle size={16} /> : v.lastOk ? <CheckCircle2 size={16} /> : <Info size={16} />}
          <div>
            <strong>{v.lastAttempt ? <>Last check-in <time title={fullDate(v.lastAttempt)}>{relativeTime(v.lastAttempt, now)}</time></> : 'Not checked in yet'}</strong>
            {v.lastResult && <span>{v.lastResult}</span>}
            {v.lastOk === false && v.lastSuccess && <span>Last successful {relativeTime(v.lastSuccess, now)}.</span>}
            {s.invoice && <span>Open invoice {s.invoice.number}: {s.invoice.currency} {s.invoice.amount}, due {day(s.invoice.dueDate)}.
              The {s.audience === 'ADMINS' ? 'Super Admins and Admins see' : 'Super Admin sees'} a Pay online button.</span>}
          </div>
        </div>
      )}

      {v.fromEnvironment ? (
        <dl className="sp-kv sp-gap">
          <div><dt>Address</dt><dd>{v.url ?? '—'}</dd></div>
          <div><dt>Token</dt><dd>{v.tokenSet ? v.tokenHint : 'Not set'}</dd></div>
          <div><dt>Set by</dt><dd>Server (SUBSCRIPTION_VENDOR_URL / TOKEN)</dd></div>
        </dl>
      ) : (
        <>
          <div className="sp-link-grid">
            <div>
              <label className="sp-label" htmlFor="sp-vurl">Vendor portal address</label>
              <input id="sp-vurl" className="sp-input sp-line" placeholder="https://vendor.yourcompany.com" inputMode="url"
                value={url} onChange={e => setUrl(e.target.value)} />
            </div>
            <div>
              <label className="sp-label" htmlFor="sp-vtoken">This portal's token</label>
              <input id="sp-vtoken" className="sp-input sp-line sp-mono" type="password" autoComplete="off" spellCheck={false}
                placeholder={v.tokenSet ? `Saved (${v.tokenHint}); leave blank to keep` : 'vpt_…'}
                value={token} onChange={e => setToken(e.target.value)} />
            </div>
          </div>
          <p className="dd-note"><Info size={14} /> <span>The vendor portal shows the token once, when the client is added or its token is replaced.</span></p>
          <div className="sp-actions">
            {linked && (
              <button type="button" className="dd-btn dd-btn-danger" disabled={busy === 'unlink'}
                onClick={() => window.confirm('Unlink from the vendor portal? The installed key stays in force; renewals must then be pasted by hand.')
                  && run('unlink', unlinkVendorPortal, 'Unlinked.')}>
                {busy === 'unlink' ? <Loader2 size={15} className="dd-spin" /> : <Unlink size={15} />} Unlink
              </button>
            )}
            <button type="button" className="dd-btn dd-btn-primary" disabled={!url.trim() || (!token.trim() && !v.tokenSet) || busy === 'link'}
              onClick={async () => { if (await run('link', () => linkVendorPortal(url.trim(), token.trim()), 'Saved and checked in.')) setToken(''); }}>
              {busy === 'link' ? <Loader2 size={15} className="dd-spin" /> : <Link2 size={15} />} {linked ? 'Save & check in' : 'Link & check in'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function KeyCard({ s, busy, run }: CardProps) {
  const [key, setKey] = useState('');
  const [checked, setChecked] = useState<SubscriptionKeyInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try { setChecked(await checkSubscriptionKey(key.trim())); }
    catch (err) { setChecked(null); toast.error(apiMessage(err, 'Could not read the key')); }
    finally { setChecking(false); }
  };
  const install = async () => {
    if (!checked) return;
    if (!window.confirm(`Install this key? The portal will be paid until ${day(checked.paidUntil)}.`)) return;
    if (await run('key', () => installSubscriptionKey(key.trim()), 'Key installed.')) { setKey(''); setChecked(null); }
  };

  return (
    <div className="dd-card">
      <div className="dd-card-head"><h2 className="dd-card-title"><KeyRound size={16} /> Install a key</h2></div>
      <p className="dd-card-text">
        {s.vendor.url && s.vendor.tokenSet
          ? "Keys arrive from the vendor portal by themselves. Paste one here only if this server can't reach it. "
          : <>Paste the key from the vendor portal (or <span className="dd-mono">SubscriptionKeyTool issue</span>) once the institution has paid. </>}
        It is checked against the vendor signature before anything changes.</p>
      <label className="sp-label" htmlFor="sp-key">Subscription key</label>
      <textarea id="sp-key" className="sp-input sp-mono" rows={4} placeholder="EPSUB1.…" spellCheck={false}
        value={key} onChange={e => { setKey(e.target.value); setChecked(null); }} />
      {checked && (
        <div className="sp-preview" aria-live="polite">
          <dl className="sp-kv">
            <div><dt>Institution</dt><dd>{checked.institutionName} ({checked.institutionId})</dd></div>
            <div><dt>Plan</dt><dd>{checked.plan}</dd></div>
            <div><dt>Paid until</dt><dd>{day(checked.paidUntil)}</dd></div>
            <div><dt>Grace / read-only</dt><dd>{checked.graceDays} / {checked.restrictedDays} days</dd></div>
            <div><dt>Issued</dt><dd>{day(checked.issued)}</dd></div>
          </dl>
          {checked.warnings?.map(w => <p key={w} className="dd-note sp-warn"><AlertTriangle size={14} /> {w}</p>)}
        </div>
      )}
      <div className="sp-actions">
        {!checked ? (
          <button type="button" className="dd-btn dd-btn-primary" onClick={check} disabled={!key.trim() || checking}>
            {checking ? <Loader2 size={15} className="dd-spin" /> : <ShieldCheck size={15} />} Check key
          </button>
        ) : (
          <>
            <button type="button" className="dd-btn" onClick={() => setChecked(null)} disabled={busy === 'key'}>Back</button>
            <button type="button" className="dd-btn dd-btn-primary" onClick={install} disabled={busy === 'key'}>
              {busy === 'key' ? <Loader2 size={15} className="dd-spin" /> : <KeyRound size={15} />} Install key
            </button>
          </>
        )}
      </div>
      {s.boundInstitution && <p className="dd-note"><Info size={14} /> <span>This server only accepts keys for <b>{s.boundInstitution}</b> (SUBSCRIPTION_INSTITUTION_ID).</span></p>}
    </div>
  );
}

function AudienceCard({ s, busy, run }: CardProps) {
  const [audience, setAudience] = useState(s.audience);
  const [contact, setContact] = useState(s.contact);
  const [emails, setEmails] = useState(s.billingEmails);
  useEffect(() => { setAudience(s.audience); setContact(s.contact); setEmails(s.billingEmails); }, [s.audience, s.contact, s.billingEmails]);
  const dirty = audience !== s.audience || contact.trim() !== s.contact || emails.trim() !== s.billingEmails;

  const options = [
    { value: 'SUPER_ADMIN' as const, title: 'Super Admins only', desc: 'Only the Super Admin sees the warnings and gets the emails.' },
    { value: 'ADMINS' as const, title: 'Super Admins and Admins', desc: 'HODs see the warnings and get the emails too.' },
  ];

  return (
    <div className="dd-card">
      <div className="dd-card-head"><h2 className="dd-card-title"><Users size={16} /> Who is told</h2></div>
      <p className="dd-card-text">Who sees the grace, read-only and suspended notices. Lecturers and students are never told why; they only see that something is unavailable.</p>
      <div className="sp-options" role="radiogroup" aria-label="Who sees subscription notices">
        {options.map(o => (
          <label key={o.value} className={`dd-mcard sp-option${audience === o.value ? ' is-selected' : ''}`}>
            <input type="radio" name="sp-audience" className="dd-sr" value={o.value} checked={audience === o.value} onChange={() => setAudience(o.value)} />
            <div className="dd-mcard-head">
              <span className="dd-mcard-title"><strong>{o.title}</strong></span>
              <span className="dd-radio" aria-hidden />
            </div>
            <p className="dd-mcard-desc">{o.desc}</p>
          </label>
        ))}
      </div>
      <label className="sp-label" htmlFor="sp-contact">How to reach you (shown with every notice)</label>
      <textarea id="sp-contact" className="sp-input" rows={2} maxLength={300} placeholder="e.g. Call 024 000 0000 or email billing@yourcompany.com"
        value={contact} onChange={e => setContact(e.target.value)} />
      <label className="sp-label" htmlFor="sp-emails">Extra billing emails (optional)</label>
      <input id="sp-emails" className="sp-input sp-line" placeholder="bursar@institution.edu, finance@institution.edu"
        value={emails} onChange={e => setEmails(e.target.value)} />
      <p className="dd-note"><Info size={14} /> Developers are always copied in. Comma-separated, up to 10.</p>
      <div className="sp-actions">
        <button type="button" className="dd-btn dd-btn-primary" disabled={!dirty || busy === 'settings'}
          onClick={() => run('settings', () => saveSubscriptionSettings({ audience, contact: contact.trim(), billingEmails: emails.trim() }), 'Saved.')}>
          {busy === 'settings' ? <Loader2 size={15} className="dd-spin" /> : <Save size={15} />} Save
        </button>
      </div>
    </div>
  );
}

function ExtensionCard({ s, busy, run }: CardProps) {
  const [until, setUntil] = useState('');
  const [reason, setReason] = useState('');
  // Past the end of grace, and no earlier than today (an earlier day would change nothing)
  const afterGrace = addDays(s.graceEnd, 1);
  const min = afterGrace > s.today ? afterGrace : s.today;
  const overdue = s.state !== 'ACTIVE';

  return (
    <div className="dd-card">
      <div className="dd-card-head"><h2 className="dd-card-title"><CalendarPlus size={16} /> Extend grace</h2></div>
      <p className="dd-card-text">When the institution has promised to pay, keep everything working a little longer. At most 30 days past the key's own grace; for more, issue a new key.</p>
      {s.extendedUntil ? (
        <div className="sp-current">
          <div>
            <strong>Grace extended to {day(s.extendedUntil)}</strong>
            {s.extensionReason && <span>{s.extensionReason}</span>}
          </div>
          <button type="button" className="dd-btn dd-btn-sm" disabled={busy === 'unextend'}
            onClick={() => window.confirm('Remove the extension? The normal dates apply again straight away.')
              && run('unextend', clearSubscriptionExtension, 'Extension removed.')}>
            {busy === 'unextend' ? <Loader2 size={13} className="dd-spin" /> : <X size={13} />} Remove
          </button>
        </div>
      ) : !overdue ? (
        <p className="dd-note"><Info size={14} /> Not needed while the subscription is paid.</p>
      ) : (
        <>
          <label className="sp-label" htmlFor="sp-until">Keep working until (inclusive)</label>
          <input id="sp-until" type="date" className="dd-select sp-date" min={min} max={s.maxExtensionUntil}
            value={until} onChange={e => setUntil(e.target.value)} />
          <span className="dd-muted-sm sp-hint">Latest {day(s.maxExtensionUntil)}</span>
          <label className="sp-label" htmlFor="sp-ext-reason">Reason (kept in the history)</label>
          <input id="sp-ext-reason" className="sp-input sp-line" maxLength={300} placeholder="e.g. Bursar promised payment by Friday"
            value={reason} onChange={e => setReason(e.target.value)} />
          <div className="sp-actions">
            <button type="button" className="dd-btn dd-btn-primary" disabled={!until || !reason.trim() || busy === 'extend'}
              onClick={async () => { if (await run('extend', () => extendSubscription(until, reason.trim()), 'Grace extended.')) { setUntil(''); setReason(''); } }}>
              {busy === 'extend' ? <Loader2 size={15} className="dd-spin" /> : <CalendarPlus size={15} />} Extend
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SuspendCard({ s, busy, run, now }: CardProps & { now: number }) {
  const [reason, setReason] = useState('');
  return (
    <div className={`dd-card${s.suspendedReason ? ' sp-danger-card' : ''}`}>
      <div className="dd-card-head"><h2 className="dd-card-title"><ShieldAlert size={16} /> Suspend now</h2></div>
      {s.suspendedReason ? (
        <>
          <div className="sp-current">
            <div>
              <strong>Suspended {s.suspendedAt ? <time title={fullDate(s.suspendedAt)}>{relativeTime(s.suspendedAt, now)}</time> : ''}</strong>
              <span>{s.suspendedReason}</span>
            </div>
          </div>
          <p className="dd-card-text">Lifting it goes back to whatever the key's dates say{s.key ? '' : ' (there is no key, so the 30-day allowance)'}.</p>
          <div className="sp-actions">
            <button type="button" className="dd-btn dd-btn-primary" disabled={busy === 'resume'}
              onClick={() => run('resume', resumePortal, 'Suspension lifted.')}>
              {busy === 'resume' ? <Loader2 size={15} className="dd-spin" /> : <ShieldCheck size={15} />} Lift suspension
            </button>
          </div>
        </>
      ) : s.providerSuspended ? (
        <p className="dd-card-text">The vendor portal has suspended this portal{s.key?.note ? ` (${s.key.note})` : ''}. It is lifted from there and arrives at the next check-in.</p>
      ) : (
        <>
          <p className="dd-card-text">Skips the remaining stages, whatever the key says (e.g. a cancelled contract). Only the Super Admin can still sign in, read-only, to export data. Students in an exam can finish it.</p>
          <label className="sp-label" htmlFor="sp-reason">Reason (only you and the history see it)</label>
          <input id="sp-reason" className="sp-input sp-line" maxLength={300} placeholder="e.g. Invoice INV-104 unpaid after 60 days"
            value={reason} onChange={e => setReason(e.target.value)} />
          <div className="sp-actions">
            <button type="button" className="dd-btn dd-btn-danger" disabled={!reason.trim() || busy === 'suspend'}
              onClick={async () => {
                if (!window.confirm('Suspend the portal now? Everyone except the Super Admin and developers will be signed out of their work.')) return;
                if (await run('suspend', () => suspendPortal(reason.trim()), 'Portal suspended.')) setReason('');
              }}>
              {busy === 'suspend' ? <Loader2 size={15} className="dd-spin" /> : <ShieldAlert size={15} />} Suspend portal
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function HistoryCard({ s, now }: { s: SubscriptionDetails; now: number }) {
  return (
    <div className="dd-card sp-gap-lg">
      <div className="dd-card-head"><h2 className="dd-card-title"><History size={16} /> History</h2></div>
      {s.events.length === 0 ? <p className="dd-muted-sm">Nothing yet.</p> : (
        <ul className="sp-history">
          {s.events.map(e => (
            <li key={e.id}>
              <time title={fullDate(e.at)}>{relativeTime(e.at, now)}</time>
              <div>
                <strong>{EVENT_LABEL[e.type] ?? e.type}</strong>
                {e.fromState && e.toState && e.fromState !== e.toState && (
                  <span className="sp-move">{LABEL[e.fromState as SubscriptionStateName] ?? e.fromState} → {LABEL[e.toState as SubscriptionStateName] ?? e.toState}</span>
                )}
                {e.details && <span className="sp-detail">{e.details}</span>}
                <span className="sp-actor">{e.actor ?? 'Automatic check'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="dd-note"><CreditCard size={14} /> State changes are also written to the audit log.</p>
    </div>
  );
}

const CSS = `
.sp-gap { margin-top: 12px; }
.sp-gap-lg { margin-top: 16px; }
.sp-steps { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 10px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
@media (max-width: 899.98px) { .sp-steps { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 479.98px) { .sp-steps { grid-template-columns: 1fr; } }
.sp-step { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 12px; background: var(--dd-surface);
  border: 1px solid var(--dd-border); border-top: 3px solid var(--sp-c); min-width: 0; }
.sp-t-ok { --sp-c: var(--dd-ok); } .sp-t-warn { --sp-c: var(--dd-warn); } .sp-t-bad { --sp-c: var(--dd-bad); }
.sp-step.is-now { box-shadow: 0 0 0 1px var(--sp-c), var(--dd-shadow); }
.sp-step.is-skipped { opacity: .55; }
.sp-step-name { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 14px; color: var(--dd-text); }
.sp-step-when { font-size: 12.5px; font-weight: 600; color: var(--dd-text-2); }
.sp-step-what { font-size: 12.5px; color: var(--dd-muted); line-height: 1.45; }
.dd-card-title { display: flex; align-items: center; gap: 8px; }
.sp-label { display: block; margin: 14px 0 6px; font-size: 13px; font-weight: 700; color: var(--dd-text); }
.sp-input { width: 100%; padding: 10px 12px; border-radius: 9px; border: 1px solid var(--dd-border-strong); background: var(--dd-surface);
  color: var(--dd-text); font: inherit; font-size: 13.5px; resize: vertical; box-sizing: border-box; }
.sp-input:focus { outline: none; border-color: var(--dd-accent); box-shadow: 0 0 0 3px var(--dd-accent-soft); }
.sp-line { min-height: 40px; resize: none; }
.sp-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; word-break: break-all; }
.sp-date { cursor: text; padding: 0 10px; max-width: 100%; }
.sp-hint { display: block; margin-top: 6px; }
.sp-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
.sp-preview { margin-top: 12px; padding: 12px 14px; border-radius: 10px; background: var(--dd-surface-2); border: 1px solid var(--dd-border); }
.sp-kv { margin: 0; display: grid; gap: 6px; }
.sp-kv div { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.sp-kv dt { color: var(--dd-muted); }
.sp-kv dd { margin: 0; font-weight: 600; color: var(--dd-text); text-align: right; overflow-wrap: anywhere; }
.sp-warn { color: var(--dd-warn); }
.sp-options { display: grid; gap: 10px; margin-top: 12px; }
@media (min-width: 560px) { .sp-options { grid-template-columns: 1fr 1fr; } }
.sp-option { padding: 12px 14px; gap: 6px; }
.sp-current { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-top: 12px;
  padding: 12px 14px; border-radius: 10px; background: var(--dd-surface-2); border: 1px solid var(--dd-border); }
.sp-current > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sp-current strong { font-size: 14px; color: var(--dd-text); }
.sp-current span { font-size: 13px; color: var(--dd-text-2); overflow-wrap: anywhere; }
.sp-danger-card { border-color: var(--dd-bad-line); }
.sp-sync { display: flex; gap: 10px; align-items: flex-start; margin-top: 12px; padding: 10px 12px; border-radius: 10px;
  background: var(--dd-surface-2); border: 1px solid var(--dd-border); font-size: 13px; }
.sp-sync > svg { flex: none; margin-top: 2px; color: var(--dd-muted); }
.sp-sync.is-ok > svg { color: var(--dd-ok); }
.sp-sync.is-bad { background: var(--dd-bad-soft); border-color: var(--dd-bad-line); }
.sp-sync.is-bad > svg { color: var(--dd-bad); }
.sp-sync > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sp-sync strong { color: var(--dd-text); }
.sp-sync span { color: var(--dd-text-2); overflow-wrap: anywhere; }
.sp-link-grid { display: grid; gap: 0 16px; }
@media (min-width: 720px) { .sp-link-grid { grid-template-columns: 3fr 2fr; } }
.sp-history { list-style: none; margin: 0; padding: 0; }
.sp-history li { display: grid; grid-template-columns: 110px 1fr; gap: 12px; padding: 10px 0; border-top: 1px solid var(--dd-border); font-size: 13px; }
.sp-history li:first-child { border-top: 0; padding-top: 0; }
.sp-history time { color: var(--dd-muted); font-size: 12.5px; }
.sp-history li > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sp-history strong { color: var(--dd-text); }
.sp-move { font-weight: 600; color: var(--dd-text-2); }
.sp-detail { color: var(--dd-text-2); overflow-wrap: anywhere; }
.sp-actor { color: var(--dd-muted); font-size: 12px; }
@media (max-width: 479.98px) { .sp-history li { grid-template-columns: 1fr; gap: 4px; } }
`;
