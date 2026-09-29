import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Building2, School, Upload, Trash2, Loader2, Save, Search, ShieldCheck, ShieldX, ExternalLink } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import {
  getInstitution, updateInstitution, uploadInstitutionLogo, deleteInstitutionLogo, institutionLogoUrl,
  getIssuedDocuments, setDocumentRevoked,
} from '../../api/endpoints';
import type { Institution } from '../../hooks/useInstitution';
import { tx } from '../../utils/terms';

const DOC_LABEL: Record<string, string> = { TRANSCRIPT: 'Transcript', REPORT_CARD: 'Report card', CUMULATIVE_REPORT: 'Cumulative report' };

/** Super Admin: who the portal belongs to, university vs school mode, logo, and issued documents. */
export default function InstitutionSettings() {
  const qc = useQueryClient();
  const inst = useQuery<Institution>({ queryKey: ['institution'], queryFn: getInstitution });
  const [form, setForm] = useState({ name: '', shortName: '', subtitle: '', type: 'UNIVERSITY', portalUrl: '', showPosition: false });
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const docs = useQuery({ queryKey: ['issued-documents', search], queryFn: () => getIssuedDocuments(search) });

  useEffect(() => {
    if (inst.data) setForm({
      name: inst.data.name, shortName: inst.data.shortName, subtitle: inst.data.subtitle ?? '',
      type: inst.data.type, portalUrl: inst.data.portalUrl ?? '', showPosition: inst.data.showPosition,
    });
  }, [inst.data]);

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Enter the institution name'); return; }
    setSaving(true);
    try {
      const updated = await updateInstitution(form);
      qc.setQueryData(['institution'], updated);
      toast.success('Institution settings saved');
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Could not save'); }
    finally { setSaving(false); }
  };

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    setLogoBusy(true);
    try {
      const updated = await uploadInstitutionLogo(file);
      qc.setQueryData(['institution'], updated);
      setLogoVersion(v => v + 1);
      toast.success('Logo uploaded');
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Could not upload the logo'); }
    finally { setLogoBusy(false); }
  };

  const removeLogo = async () => {
    setLogoBusy(true);
    try {
      const updated = await deleteInstitutionLogo();
      qc.setQueryData(['institution'], updated);
      toast.success('Logo removed');
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Could not remove the logo'); }
    finally { setLogoBusy(false); }
  };

  const toggleRevoked = async (d: any) => {
    let reason: string | undefined;
    if (!d.revoked) {
      const res = await Swal.fire({
        title: 'Withdraw this document?', input: 'text', inputLabel: 'Reason (shown to anyone who checks the code)',
        inputPlaceholder: 'e.g. Issued with an error; replaced by a new copy',
        text: `${DOC_LABEL[d.type] ?? d.type} for ${d.studentName} (${d.code})`,
        showCancelButton: true, confirmButtonText: 'Withdraw', confirmButtonColor: '#dc2626',
      });
      if (!res.isConfirmed) return;
      reason = res.value || undefined;
    }
    try {
      await setDocumentRevoked(d.id, !d.revoked, reason);
      toast.success(d.revoked ? 'Document is valid again' : 'Document withdrawn');
      docs.refetch();
    } catch (err: any) { toast.error(err?.response?.data?.message ?? 'Could not update'); }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Institution" breadcrumbs={['Configuration', 'Institution']} />

      <form className="is-card" onSubmit={save}>
        <h2>System mode</h2>
        <div className="is-mode">
          {inst.data?.type === 'SCHOOL' ? <School size={22} /> : <Building2 size={22} />}
          <div>
            <strong>{inst.data?.modeLabel ?? '…'}</strong>
            <span>The developer sets the system mode. It decides the wording, the calendar and which features everyone sees.</span>
          </div>
        </div>

        <h2>Name and details</h2>
        <div className="is-grid">
          <label>Full name<input value={form.name} maxLength={120} onChange={e => set('name', e.target.value)} placeholder="e.g. Accra Academy" /></label>
          <label>Short name<input value={form.shortName} maxLength={20} onChange={e => set('shortName', e.target.value)} placeholder="e.g. AA" /></label>
          <label className="is-wide">Second line on documents (optional)
            <input value={form.subtitle} maxLength={200} onChange={e => set('subtitle', e.target.value)} placeholder="e.g. School of Physical Sciences, or P.O. Box 1, Accra" />
          </label>
          <label className="is-wide">Portal address (used in verification links)
            <input value={form.portalUrl} onChange={e => set('portalUrl', e.target.value)} placeholder="https://results.myschool.edu.gh" inputMode="url" />
          </label>
        </div>
        <label className="is-check">
          <input type="checkbox" checked={form.showPosition} onChange={e => set('showPosition', e.target.checked)} />
          {tx("Print the position in class on report cards")}</label>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="is-btn" disabled={saving}>{saving ? <Loader2 size={15} className="is-spin" /> : <Save size={15} />} Save</button>
        </div>
      </form>

      <div className="is-card">
        <h2>Logo</h2>
        <p className="is-help">{tx("Printed on transcripts and report cards. PNG or JPEG, under 512 KB. ")}{inst.data?.hasLogo ? '' : 'Until you upload one, the UCC crest is used only while the name is "University of Cape Coast".'}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div className="is-logo">
            {inst.data?.hasLogo
              ? <img src={`${institutionLogoUrl()}?v=${logoVersion}`} alt={`${form.name} logo`} />
              : <span>{form.shortName || '—'}</span>}
          </div>
          <label className="is-btn is-btn-ghost">
            {logoBusy ? <Loader2 size={15} className="is-spin" /> : <Upload size={15} />} Upload logo
            <input type="file" accept="image/png,image/jpeg" hidden disabled={logoBusy} onChange={e => { onLogo(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {inst.data?.hasLogo && (
            <button type="button" className="is-btn is-btn-danger" onClick={removeLogo} disabled={logoBusy}><Trash2 size={15} /> Remove</button>
          )}
        </div>
      </div>

      <div className="is-card">
        <h2>Issued documents</h2>
        <p className="is-help">
          {tx("Every downloaded transcript and report card gets a code. Anyone can check it at")}{' '}
          <a href="/verify" target="_blank" rel="noreferrer">/verify <ExternalLink size={11} /></a>.
          Withdraw a document if it was issued in error.
        </p>
        <form onSubmit={e => { e.preventDefault(); setSearch(q.trim()); }} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input className="is-search" value={q} onChange={e => setQ(e.target.value)} placeholder={tx("Search by student ID or code")} aria-label="Search issued documents" />
          <button type="submit" className="is-btn is-btn-ghost"><Search size={15} /> Search</button>
        </form>
        {docs.isLoading ? <Loader2 size={20} className="is-spin" /> : !docs.data?.length ? (
          <p className="is-help">No documents found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="is-table">
              <thead><tr><th>Code</th><th>Document</th><th>{tx("Student")}</th><th>Details</th><th>Issued</th><th></th></tr></thead>
              <tbody>
                {docs.data.map((d: any) => (
                  <tr key={d.id} style={d.revoked ? { opacity: 0.6 } : undefined}>
                    <td style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{d.code}</td>
                    <td>{DOC_LABEL[d.type] ?? d.type}</td>
                    <td>{d.studentName}<div className="is-muted">{d.studentId}</div></td>
                    <td style={{ minWidth: 200 }}>{d.summary}{d.revoked && <div className="is-revoked">Withdrawn{d.revokedReason ? `: ${d.revokedReason}` : ''}</div>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(d.issuedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}<div className="is-muted">{d.issuedBy}</div></td>
                    <td>
                      <button type="button" className={`is-link ${d.revoked ? '' : 'is-link-danger'}`} onClick={() => toggleRevoked(d)}>
                        {d.revoked ? <><ShieldCheck size={13} /> Restore</> : <><ShieldX size={13} /> Withdraw</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        .is-card { background: #fff; border-radius: 14px; padding: 20px; margin-bottom: 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); border: 1px solid #eef0f4; }
        .is-card h2 { font-size: 15px; margin: 0 0 6px; color: #1e293b; }
        .is-card h2:not(:first-child) { margin-top: 20px; }
        .is-help { font-size: 13px; color: #64748b; margin: 0 0 12px; }
        .is-help a { color: #5156be; font-weight: 600; }
        .is-mode { display: flex; gap: 12px; align-items: flex-start; border: 1.5px solid #c7c9f0; background: #f5f5ff; color: #5156be; border-radius: 12px; padding: 14px; margin-bottom: 6px; }
        .is-mode strong { display: block; color: #1e293b; font-size: 14px; }
        .is-mode span { font-size: 12.5px; color: #475569; }
        .is-types { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .is-types button { text-align: left; border: 1.5px solid #e2e8f0; border-radius: 12px; background: #fff; padding: 14px; display: flex; flex-direction: column; gap: 4px; cursor: pointer; color: #475569; }
        .is-types button strong { color: #1e293b; font-size: 14px; }
        .is-types button span { font-size: 12.5px; }
        .is-types button.on { border-color: #5156be; background: #f5f5ff; color: #5156be; }
        .is-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; }
        .is-grid label, .is-wide { display: flex; flex-direction: column; gap: 5px; font-size: 12px; font-weight: 700; color: #475569; }
        .is-wide { grid-column: 1 / -1; }
        .is-grid input, .is-search { height: 40px; border: 1.5px solid #e2e8f0; border-radius: 9px; padding: 0 11px; font-size: 14px; font-weight: 400; color: #1e293b; }
        .is-search { flex: 1; min-width: 0; }
        .is-grid input:focus, .is-search:focus { outline: none; border-color: #5156be; }
        .is-check { display: flex; align-items: center; gap: 8px; margin: 14px 0; font-size: 13.5px; color: #334155; }
        .is-check input { width: 16px; height: 16px; accent-color: #5156be; }
        .is-btn { height: 38px; padding: 0 16px; border-radius: 9px; border: none; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
        .is-btn:disabled { opacity: 0.6; cursor: default; }
        .is-btn-ghost { background: #fff; color: #5156be; border: 1.5px solid #c7c9f0; }
        .is-btn-danger { background: #fff; color: #dc2626; border: 1.5px solid #fecaca; }
        .is-logo { width: 72px; height: 72px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: center; background: #1a2744; color: #fff; font-weight: 800; overflow: hidden; }
        .is-logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
        .is-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .is-table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; padding: 8px; border-bottom: 1px solid #e2e8f0; }
        .is-table td { padding: 9px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; color: #1e293b; }
        .is-muted { font-size: 11.5px; color: #94a3b8; }
        .is-revoked { font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 3px; }
        .is-link { border: none; background: none; color: #5156be; font-weight: 700; font-size: 12.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
        .is-link-danger { color: #dc2626; }
        .is-spin { animation: is-spin 1s linear infinite; }
        @keyframes is-spin { to { transform: rotate(360deg); } }
        @media (max-width: 640px) { .is-types, .is-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
