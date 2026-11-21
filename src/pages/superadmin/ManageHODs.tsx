import { useState, useEffect } from 'react';
import { saGetAllHods, saCreateHod, saUpdateHod, saDeleteHod, saGetDepartments } from '../../api/endpoints';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { UserCog, Plus, Trash2, Edit2, Eye, EyeOff, Building2, Mail, Phone, User, Key, X } from 'lucide-react';
import { tx } from '../../utils/terms';
import AppModal from '../../components/ui/AppModal';

interface Hod { id: number; firstname: string; lastname: string; email: string; username: string; phone: string; departmentId?: number; }
interface Department { id: number; name: string; code: string; }

const inputStyle: React.CSSProperties = { width: '100%', height: 44, padding: '0 14px', borderRadius: 12, background: 'var(--sx-input)', border: '1px solid var(--sx-line-2)', color: 'var(--sx-ink)', fontSize: 14.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--sx-ink-2)', marginBottom: 8 };
/** A field with its icon inside the box, on the left. */
const iconInput = (icon: React.ReactNode, input: React.ReactNode) => (
  <div className="hod-ii">
    <span className="hod-ii-ico" aria-hidden>{icon}</span>
    {input}
  </div>
);

export default function ManageHODs() {
  const [hods, setHods] = useState<Hod[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ firstname: '', lastname: '', email: '', phone: '', username: '', password: '', departmentId: '' });
  const [editingHod, setEditingHod] = useState<Hod | null>(null);
  const [editForm, setEditForm] = useState({ firstname: '', lastname: '', email: '', phone: '', username: '', password: '', departmentId: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [h, d] = await Promise.all([saGetAllHods(), saGetDepartments()]);
      setHods(Array.isArray(h) ? h : []);
      setDepartments(Array.isArray(d) ? d : []);
      if (Array.isArray(d) && d.length > 0 && !form.departmentId) setForm(p => ({ ...p, departmentId: String(d[0].id) }));
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstname || !form.lastname || !form.email || !form.username || !form.password || !form.departmentId) {
      toast.error('All fields are required.'); return;
    }
    setSaving(true);
    try {
      await saCreateHod({ ...form, departmentId: Number(form.departmentId) });
      toast.success(tx(`HOD account created for ${form.firstname} ${form.lastname}`));
      setForm({ firstname: '', lastname: '', email: '', phone: '', username: '', password: '', departmentId: String(departments[0]?.id || '') });
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.message || tx('Failed to create HOD')); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHod) return;
    if (!editForm.firstname || !editForm.lastname || !editForm.email || !editForm.username || !editForm.departmentId) {
      toast.error('Required fields missing.'); return;
    }
    setSaving(true);
    try {
      const payload: any = { ...editForm, departmentId: Number(editForm.departmentId) };
      if (!payload.password) delete payload.password; // Don't send empty password if not changing
      await saUpdateHod(editingHod.id, payload);
      toast.success(tx('HOD account updated.'));
      setEditingHod(null);
      await load();
    } catch (e: any) { toast.error(e?.response?.data?.message || tx('Failed to update HOD')); }
    finally { setSaving(false); }
  };

  const openEdit = (h: Hod) => {
    setEditForm({
      firstname: h.firstname || '', lastname: h.lastname || '',
      email: h.email || '', phone: h.phone || '', username: h.username || '',
      password: '', departmentId: String(h.departmentId || (departments.length > 0 ? departments[0].id : ''))
    });
    setEditingHod(h);
  };

  const handleDelete = async (h: Hod) => {
    const res = await Swal.fire({ title: tx(`Remove HOD "${h.firstname} ${h.lastname}"?`), text: 'The account will be permanently deleted.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Remove', confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', background: 'var(--sx-option)', color: 'var(--sx-ink)' });
    if (!res.isConfirmed) return;
    try { await saDeleteHod(h.id); setHods(prev => prev.filter(x => x.id !== h.id)); toast.success(tx('HOD removed.')); }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Delete failed'); }
  };

  const dept = (id: string | number) => departments.find(d => d.id === Number(id));

  return (
    <div style={{ color: 'var(--sx-ink)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserCog size={20} color="var(--brand-contrast)" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{tx("HOD Accounts")}</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--sx-muted)' }}>{tx("Manage Head of Department administrator accounts")}</p>
        </div>
      </div>

      <div className="hod-grid">
        {/* Create Form */}
        <form onSubmit={handleCreate} style={{ background: 'var(--sx-card)', boxShadow: 'var(--sx-card-shadow)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: '24px', backdropFilter: 'blur(12px)' }}>
          <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'var(--sx-ok)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> {tx("Register New HOD")}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="hod-name-grid">
              <div>
                <label style={labelStyle}>First Name *</label>
                {iconInput(<User size={14} />, <input style={inputStyle} value={form.firstname} onChange={e => setForm(p => ({ ...p, firstname: e.target.value }))} placeholder="Jane" />)}
              </div>
              <div>
                <label style={labelStyle}>Last Name *</label>
                {iconInput(<User size={14} />, <input style={inputStyle} value={form.lastname} onChange={e => setForm(p => ({ ...p, lastname: e.target.value }))} placeholder="Doe" />)}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email *</label>
              {iconInput(<Mail size={14} />, <input style={{ ...inputStyle }} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jane.doe@university.edu" type="email" />)}
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              {iconInput(<Phone size={14} />, <input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+1 555 000 0000" />)}
            </div>
            <div>
              <label style={labelStyle}>Staff ID / Username *</label>
              {iconInput(<Key size={14} />, <input style={inputStyle} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="STF-001" />)}
            </div>
            <div>
              <label style={labelStyle}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 40 }} value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} type={showPass ? 'text' : 'password'} placeholder="Strong password" />
                <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--sx-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>{tx('Department *')}</label>
              {iconInput(<Building2 size={14} />, (
                <select style={inputStyle} value={form.departmentId} onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}>
                  <option value="" style={{ background: 'var(--sx-option)' }}>{tx('Select department…')}</option>
                  {departments.map(d => <option key={d.id} value={d.id} style={{ background: 'var(--sx-option)' }}>{d.name}</option>)}
                </select>
              ))}
            </div>
            <button type="submit" disabled={saving} style={{ width: '100%', padding: '11px', borderRadius: 10, background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <UserCog size={16} />{saving ? 'Creating…' : tx('Create HOD Account')}
            </button>
          </div>
        </form>

        {/* HOD List */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--sx-ink-2)' }}>
            {tx("Existing HODs (")}{hods.length})
          </h2>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 12, background: 'var(--sx-fill)', animation: 'pulse 1.5s infinite' }} />)}
            </div>
          ) : hods.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--sx-fill)', borderRadius: 14, border: '1px dashed rgba(var(--accent-rgb), 0.2)' }}>
              <UserCog size={36} style={{ color: 'rgba(var(--accent-rgb), 0.3)', marginBottom: 10 }} />
              <p style={{ color: 'var(--sx-faint)', fontSize: 13 }}>{tx("No HOD accounts yet.")}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {hods.map(h => (
                <div key={h.id} style={{ background: 'var(--sx-card)', boxShadow: 'var(--sx-card-shadow)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s', flexWrap: 'wrap' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.3)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(16,185,129,0.15)'}
                >
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {h.firstname?.[0]?.toUpperCase() || 'H'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{h.firstname} {h.lastname}</div>
                    <div style={{ fontSize: 11, color: 'var(--sx-muted)', marginTop: 2 }}>{h.email} · {h.username}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" onClick={() => openEdit(h)} aria-label={`Edit ${h.firstname} ${h.lastname}`} title="Edit" style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(var(--accent-rgb), 0.12)', border: '1px solid rgba(var(--accent-rgb), 0.25)', color: 'var(--sx-accent-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDelete(h)} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--sx-bad)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div></div>   {/* Edit Modal */}
      {editingHod && (
        <AppModal
          title={tx('Edit HOD Account')}
          subtitle={`${editingHod.firstname ?? ''} ${editingHod.lastname ?? ''}`.trim() || undefined}
          onClose={() => { if (!saving) setEditingHod(null); }}
          closeOnBackdrop={!saving}
          footer={<>
            <button type="button" className="am-btn am-btn-ghost" onClick={() => setEditingHod(null)} disabled={saving}>Cancel</button>
            <button type="submit" form="hod-edit-form" className="am-btn am-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </>}
        >
          <form id="hod-edit-form" onSubmit={handleUpdate} className="hod-edit">
            <div className="hod-pair">
              <div><label style={labelStyle} htmlFor="he-first">First Name *</label>{iconInput(<User size={14} />, <input id="he-first" style={inputStyle} value={editForm.firstname} onChange={e => setEditForm(p => ({ ...p, firstname: e.target.value }))} autoComplete="off" />)}</div>
              <div><label style={labelStyle} htmlFor="he-last">Last Name *</label>{iconInput(<User size={14} />, <input id="he-last" style={inputStyle} value={editForm.lastname} onChange={e => setEditForm(p => ({ ...p, lastname: e.target.value }))} autoComplete="off" />)}</div>
            </div>
            <div className="hod-pair">
              <div><label style={labelStyle} htmlFor="he-user">Staff ID / Username *</label>{iconInput(<Key size={14} />, <input id="he-user" style={inputStyle} value={editForm.username} onChange={e => setEditForm(p => ({ ...p, username: e.target.value }))} autoComplete="off" />)}</div>
              <div><label style={labelStyle} htmlFor="he-phone">Phone</label>{iconInput(<Phone size={14} />, <input id="he-phone" style={inputStyle} value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} type="tel" autoComplete="off" />)}</div>
            </div>
            <div><label style={labelStyle} htmlFor="he-email">Email *</label>{iconInput(<Mail size={14} />, <input id="he-email" style={inputStyle} value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} type="email" autoComplete="off" />)}</div>
            <div className="hod-pair stack-sm">
              <div><label style={labelStyle} htmlFor="he-pass">New password <span style={{ fontWeight: 400, color: 'var(--sx-muted)' }}>(blank = keep)</span></label>
                <div style={{ position: 'relative' }}>
                  <input id="he-pass" style={{ ...inputStyle, paddingRight: 40 }} value={editForm.password} onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))} type={showPass ? 'text' : 'password'} placeholder="New password" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPass(p => !p)} aria-label={showPass ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--sx-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div><label style={labelStyle} htmlFor="he-dept">{tx('Department *')}</label>
                {iconInput(<Building2 size={14} />, (
                  <select id="he-dept" style={inputStyle} value={editForm.departmentId} onChange={e => setEditForm(p => ({ ...p, departmentId: e.target.value }))}>
                    <option value="" style={{ background: 'var(--sx-option)' }}>{tx('Select department…')}</option>
                    {departments.map(d => <option key={d.id} value={d.id} style={{ background: 'var(--sx-option)' }}>{d.name}</option>)}
                  </select>
                ))}
              </div>
            </div>
          </form>
        </AppModal>
      )}

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        .hod-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
        .hod-edit{display:flex;flex-direction:column;gap:14px}.hod-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}
        .hod-edit input,.hod-edit select{height:40px!important;font-size:14px!important}
        @media(max-width:480px){.hod-pair.stack-sm{grid-template-columns:minmax(0,1fr)}}
        .hod-ii{position:relative}.hod-ii-ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--sx-muted);pointer-events:none;display:flex;align-items:center}.hod-ii input,.hod-ii select{padding-left:40px!important}
        .hod-ii input:focus,.hod-ii select:focus,.hod-pw input:focus{border-color:var(--brand)!important;box-shadow:0 0 0 4px rgba(var(--brand-rgb),.14)}
        .hod-name-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:768px){
          .hod-grid{grid-template-columns:1fr}
          .hod-name-grid{grid-template-columns:1fr}
        }
      `}</style>
    </div>
  );
}

