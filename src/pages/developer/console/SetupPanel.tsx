import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CheckCircle2, Circle, Mail, UserPlus, Download, Upload, Loader2, ArrowRight, KeyRound, FileJson, Info, X,
} from 'lucide-react';
import {
  getSetupChecklist, sendSetupTestEmail, createSuperAdminAccount, exportSystemConfig, previewSystemConfig, importSystemConfig,
} from '../../../api/endpoints';
import { PanelHeader, PanelLoading, PanelError, Meter, apiMessage, CopyButton } from './ui';

export type SetupTab = 'mode' | 'branding' | 'maintenance';

interface Item { key: string; label: string; owner: 'developer' | 'superAdmin'; where: string | null; done: boolean; detail: string }

/** Everything a fresh installation needs, who does it, and the developer's own setup tools. */
export default function SetupPanel({ onOpen }: { onOpen: (tab: SetupTab) => void }) {
  const q = useQuery({ queryKey: ['dev-setup'], queryFn: getSetupChecklist });
  const items: Item[] = q.data?.items ?? [];
  const done: number = q.data?.done ?? 0;
  const total: number = q.data?.total ?? 0;
  const emailRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);

  const action = (i: Item) => {
    if (i.owner !== 'developer') return <span className="ds-where">Super Admin → {i.where}</span>;
    if (i.key === 'email') return <button className="dd-btn dd-btn-sm" onClick={() => emailRef.current?.scrollIntoView({ behavior: 'smooth' })}>Send one <ArrowRight size={13} /></button>;
    if (i.key === 'superAdmin') return <button className="dd-btn dd-btn-sm" onClick={() => adminRef.current?.scrollIntoView({ behavior: 'smooth' })}>Create <ArrowRight size={13} /></button>;
    if (i.where === 'mode' || i.where === 'branding' || i.where === 'maintenance')
      return <button className="dd-btn dd-btn-sm" onClick={() => onOpen(i.where as SetupTab)}>Open <ArrowRight size={13} /></button>;
    return null;
  };

  return (
    <section>
      <PanelHeader
        title="Setup"
        description="What this installation still needs before the institution uses it. Items marked Super Admin are done in their portal; the rest are yours."
      />

      <div className="dd-card">
        <div className="dd-card-head">
          <h2 className="dd-card-title">Checklist</h2>
          {!q.isLoading && <span className="dd-muted-sm">{done} of {total} done</span>}
        </div>
        {q.isLoading ? <PanelLoading label="Loading the checklist" />
          : q.isError ? <PanelError message="Could not load the checklist." onRetry={() => q.refetch()} />
          : (
            <>
              <Meter percent={total ? (done / total) * 100 : 0} tone={done === total ? 'ok' : 'warn'} />
              <ul className="ds-list">
                {items.map(i => (
                  <li key={i.key} className={i.done ? 'done' : ''}>
                    {i.done ? <CheckCircle2 size={18} className="ds-ok" /> : <Circle size={18} className="ds-todo" />}
                    <div className="ds-text">
                      <strong>{i.label}</strong>
                      <span>{i.detail}</span>
                    </div>
                    <span className={`dd-tag ${i.owner === 'developer' ? 'dd-tag-accent' : ''}`}>{i.owner === 'developer' ? 'You' : 'Super Admin'}</span>
                    <span className="ds-act">{!i.done || i.owner === 'developer' ? action(i) : null}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
      </div>

      <div className="dd-two">
        <div ref={emailRef}><TestEmail /></div>
        <div ref={adminRef}><CreateSuperAdmin /></div>
      </div>
      <Backup />
      <style>{CSS}</style>
    </section>
  );
}

function TestEmail() {
  const qc = useQueryClient();
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await sendSetupTestEmail(to.trim());
      toast.success(r.message);
      qc.invalidateQueries({ queryKey: ['dev-setup'] });
    } catch (err) { toast.error(apiMessage(err, 'The test email could not be sent'), { duration: 8000 }); }
    finally { setBusy(false); }
  };
  return (
    <form className="dd-card" onSubmit={send}>
      <div className="dd-card-head"><h2 className="dd-card-title"><Mail size={15} /> Test email</h2></div>
      <p className="dd-card-text">Sends a short email right away, so you see straight away whether password resets and result slips can be delivered.</p>
      <label className="ds-label" htmlFor="ds-to">Send to</label>
      <div className="ds-row">
        <input id="ds-to" type="email" required className="dd-select ds-input" placeholder="you@example.com" value={to} onChange={e => setTo(e.target.value)} />
        <button className="dd-btn dd-btn-primary" disabled={busy || !to.trim()}>{busy ? <Loader2 size={15} className="dd-spin" /> : <Mail size={15} />} Send</button>
      </div>
    </form>
  );
}

const tempPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
};

function CreateSuperAdmin() {
  const qc = useQueryClient();
  const empty = { firstname: '', lastname: '', email: '', username: '', phone: '', password: '' };
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);
  const set = (k: keyof typeof empty, v: string) => setF(x => ({ ...x, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await createSuperAdminAccount(f);
      toast.success(r.message);
      setCreated({ username: f.username.trim(), password: f.password });
      setF(empty);
      qc.invalidateQueries({ queryKey: ['dev-setup'] });
    } catch (err) { toast.error(apiMessage(err, 'Could not create the account')); }
    finally { setBusy(false); }
  };

  const field = (k: keyof typeof empty, label: string, type = 'text', required = true) => (
    <div className="ds-field">
      <label className="ds-label" htmlFor={`ds-${k}`}>{label}{!required && <span className="dd-muted-sm"> (optional)</span>}</label>
      <input id={`ds-${k}`} type={type} required={required} className="dd-select ds-input" value={f[k]} onChange={e => set(k, e.target.value)}
        autoComplete="off" />
    </div>
  );

  return (
    <form className="dd-card" onSubmit={submit}>
      <div className="dd-card-head"><h2 className="dd-card-title"><UserPlus size={15} /> Create a Super Admin</h2></div>
      <p className="dd-card-text">The Super Admin runs the institution's settings, departments and staff. The password you set is temporary; they choose their own when they first sign in.</p>
      {created && (
        <div className="ds-created" role="status">
          <span>Give these to the new Super Admin: <strong className="dd-mono">{created.username}</strong> / <strong className="dd-mono">{created.password}</strong></span>
          <CopyButton text={`Username: ${created.username}\nTemporary password: ${created.password}`} />
          <button type="button" className="dd-iconbtn" aria-label="Hide" onClick={() => setCreated(null)}><X size={14} /></button>
        </div>
      )}
      <div className="ds-grid">
        {field('firstname', 'First name')}
        {field('lastname', 'Last name')}
        {field('email', 'Email', 'email')}
        {field('username', 'Username')}
        {field('phone', 'Phone', 'tel', false)}
        <div className="ds-field">
          <label className="ds-label" htmlFor="ds-password">Temporary password</label>
          <div className="ds-row">
            <input id="ds-password" required minLength={8} className="dd-select ds-input dd-mono" value={f.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
            <button type="button" className="dd-btn" onClick={() => set('password', tempPassword())} title="Generate a password"><KeyRound size={15} /></button>
          </div>
        </div>
      </div>
      <div className="ds-actions">
        <button className="dd-btn dd-btn-primary" disabled={busy}>{busy ? <Loader2 size={15} className="dd-spin" /> : <UserPlus size={15} />} Create account</button>
      </div>
    </form>
  );
}

interface Preview { changes: { key: string; from: string | null; to: string }[]; unchanged: number; skipped: string[]; logo: boolean; source?: any; exportedAt?: string }

function Backup() {
  const qc = useQueryClient();
  const [withLogo, setWithLogo] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [file, setFile] = useState<{ name: string; data: any } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const download = async () => {
    setExporting(true);
    try {
      const data = await exportSystemConfig(withLogo);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `portal-settings-${(data.institution?.shortName ?? 'export').replace(/[^a-z0-9]+/gi, '-')}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch (err) { toast.error(apiMessage(err, 'Could not export the settings')); }
    finally { setExporting(false); }
  };

  const choose = async (f: File | undefined) => {
    if (input.current) input.current.value = '';
    if (!f) return;
    setPreview(null);
    try {
      const data = JSON.parse(await f.text());
      setBusy(true);
      setPreview(await previewSystemConfig(data));
      setFile({ name: f.name, data });
    } catch (err: any) {
      toast.error(err instanceof SyntaxError ? 'That file is not valid JSON.' : apiMessage(err, 'Could not read that settings file'));
      setFile(null);
    } finally { setBusy(false); }
  };

  const apply = async () => {
    if (!file || !preview) return;
    if (!window.confirm(`Apply ${preview.changes.length} change(s)${preview.logo ? ' and replace the logo' : ''}?`)) return;
    setBusy(true);
    try {
      const r = await importSystemConfig(file.data);
      toast.success(`Imported: ${r.changes.length} setting(s) changed${r.logo ? ', logo replaced' : ''}. Reloading…`);
      qc.invalidateQueries();
      // Mode and wording are read at load time, so reload to pick everything up
      setTimeout(() => window.location.reload(), 900);
    } catch (err) { toast.error(apiMessage(err, 'Could not import the settings')); setBusy(false); }
  };

  return (
    <div className="dd-card ds-backup">
      <div className="dd-card-head"><h2 className="dd-card-title"><FileJson size={15} /> Backup and restore settings</h2></div>
      <p className="dd-card-text">
        One file with the institution's details, system mode, colours, every on/off switch and (optionally) the logo. Use it to restore
        this setup or copy it to another server. People, courses, results and passwords are not included.
      </p>
      <div className="ds-row ds-wrap">
        <button className="dd-btn" onClick={download} disabled={exporting}>{exporting ? <Loader2 size={15} className="dd-spin" /> : <Download size={15} />} Download settings</button>
        <label className="dd-check ds-inline"><input type="checkbox" checked={withLogo} onChange={e => setWithLogo(e.target.checked)} /><span>Include the logo</span></label>
        <span className="ds-spacer" />
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={e => choose(e.target.files?.[0])} />
        <button className="dd-btn" onClick={() => input.current?.click()} disabled={busy}>{busy && !preview ? <Loader2 size={15} className="dd-spin" /> : <Upload size={15} />} Load a settings file…</button>
      </div>

      {preview && file && (
        <div className="ds-preview">
          <div className="ds-preview-head">
            <div>
              <strong>{file.name}</strong>
              <span className="dd-muted-sm">
                {preview.source?.name ? ` from ${preview.source.name}` : ''}{preview.exportedAt ? `, saved ${new Date(preview.exportedAt).toLocaleString()}` : ''}
              </span>
            </div>
            <button className="dd-iconbtn" aria-label="Close" onClick={() => { setPreview(null); setFile(null); }}><X size={15} /></button>
          </div>
          {preview.changes.length === 0 && !preview.logo ? (
            <p className="dd-card-text">Nothing to change: this server already has these settings.</p>
          ) : (
            <div className="ds-table-wrap">
              <table className="ds-table">
                <thead><tr><th>Setting</th><th>Now</th><th>From the file</th></tr></thead>
                <tbody>
                  {preview.changes.map(c => (
                    <tr key={c.key}><td className="dd-mono">{c.key}</td><td>{c.from ?? <em>not set</em>}</td><td><strong>{c.to === '' ? <em>blank</em> : c.to}</strong></td></tr>
                  ))}
                  {preview.logo && <tr><td className="dd-mono">Logo</td><td colSpan={2}>Replaced with the logo in the file</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          <p className="dd-note"><Info size={14} />
            {preview.unchanged} setting(s) already match.{preview.skipped.length > 0 && ` Skipped (not allowed or invalid): ${preview.skipped.join(', ')}.`}
          </p>
          <div className="ds-actions">
            <button className="dd-btn dd-btn-primary" onClick={apply} disabled={busy || (preview.changes.length === 0 && !preview.logo)}>
              {busy ? <Loader2 size={15} className="dd-spin" /> : <Upload size={15} />} Apply {preview.changes.length} change{preview.changes.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const CSS = `
.ds-list { list-style: none; margin: 14px 0 0; padding: 0; display: grid; }
.ds-list li { display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto; gap: 6px 12px; align-items: center; padding: 12px 0; border-top: 1px solid var(--dd-border); }
.ds-list li:first-child { border-top: 0; }
.ds-ok { color: var(--dd-ok); }
.ds-todo { color: var(--dd-faint); }
.ds-text { display: flex; flex-direction: column; min-width: 0; }
.ds-text strong { font-size: 13.5px; color: var(--dd-text); }
.ds-text span { font-size: 12.5px; color: var(--dd-muted); overflow-wrap: anywhere; }
.ds-list li.done .ds-text strong { color: var(--dd-text-2); }
.ds-where { font-size: 12px; color: var(--dd-muted); white-space: nowrap; }
.ds-act { display: flex; justify-content: flex-end; }
@media (max-width: 639.98px) {
  .ds-list li { grid-template-columns: auto minmax(0, 1fr); }
  .ds-list li > .dd-tag, .ds-list li > .ds-act { grid-column: 2; justify-self: start; }
}
.ds-label { display: block; margin: 0 0 6px; font-size: 13px; font-weight: 700; color: var(--dd-text); }
.ds-row { display: flex; gap: 8px; align-items: center; }
.ds-wrap { flex-wrap: wrap; }
.ds-input { flex: 1; min-width: 0; width: 100%; padding: 0 12px; cursor: text; }
.ds-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); }
.ds-field { min-width: 0; }
.ds-actions { display: flex; justify-content: flex-end; margin-top: 16px; }
.ds-created { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 12px; margin-bottom: 14px; border-radius: 9px;
  background: var(--dd-ok-soft); border: 1px solid var(--dd-ok-line); font-size: 13px; color: var(--dd-text-2); }
.ds-created > span { flex: 1 1 220px; }
.ds-backup { margin-top: 16px; }
.ds-inline { flex: none; align-items: center; }
.ds-spacer { flex: 1; }
.ds-preview { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--dd-border); }
.ds-preview-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 10px; }
.ds-preview-head strong { font-size: 13.5px; margin-right: 4px; }
.ds-table-wrap { overflow-x: auto; border: 1px solid var(--dd-border); border-radius: 10px; }
.ds-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ds-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--dd-muted); padding: 8px 12px; background: var(--dd-surface-2); border-bottom: 1px solid var(--dd-border); }
.ds-table td { padding: 8px 12px; border-top: 1px solid var(--dd-border); vertical-align: top; overflow-wrap: anywhere; color: var(--dd-text-2); }
.ds-table em { color: var(--dd-faint); }
`;
