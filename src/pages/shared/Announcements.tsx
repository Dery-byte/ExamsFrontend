import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { Megaphone, Pin, Send, Trash2, Loader2, Inbox, Settings2, CalendarClock } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  deleteAnnouncement, getAnnouncements, getManageableAnnouncements, getPrograms, getProgramsByDept,
  postAnnouncement, saGetDepartments, type Announcement, type AnnouncementAudience,
} from '../../api/endpoints';

const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: 'ALL', label: 'Everyone' },
  { value: 'STUDENTS', label: 'Students' },
  { value: 'LECTURERS', label: 'Lecturers' },
  { value: 'ADMINS', label: 'HODs' },
  { value: 'STAFF', label: 'Lecturers & HODs' },
];
const AUDIENCE_LABEL = Object.fromEntries(AUDIENCES.map(a => [a.value, a.label]));

const EMPTY_FORM = {
  title: '', body: '', audience: 'ALL' as AnnouncementAudience,
  departmentId: '', programId: '', level: '', pinned: false, expiresOn: '',
};

function scopeText(a: Announcement) {
  const parts = [AUDIENCE_LABEL[a.audience] ?? a.audience];
  if (a.departmentName) parts.push(a.departmentName);
  if (a.programName) parts.push(a.programName);
  if (a.level) parts.push(`Level ${a.level}`);
  return parts.join(' · ');
}

export default function Announcements() {
  const { user } = useAuth() as any;
  const role: string = user?.role ?? '';
  const isSuper = role === 'SUPER_ADMIN';
  const canPost = isSuper || role === 'ADMIN';
  const qc = useQueryClient();

  const [tab, setTab] = useState<'inbox' | 'manage'>('inbox');
  const [form, setForm] = useState(EMPTY_FORM);
  const [posting, setPosting] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);

  const inbox = useQuery({ queryKey: ['announcements', 'inbox'], queryFn: getAnnouncements });
  const managed = useQuery({ queryKey: ['announcements', 'manage'], queryFn: getManageableAnnouncements, enabled: canPost });

  // Scope pickers: Super Admin chooses any department; an HOD is fixed to their own
  useEffect(() => {
    if (!canPost) return;
    if (isSuper) {
      saGetDepartments().then((d: any) => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
      getPrograms().then((d: any) => setPrograms(Array.isArray(d) ? d : [])).catch(() => {});
    } else if (user?.department?.id) {
      getProgramsByDept(user.department.id).then((d: any) => setPrograms(Array.isArray(d) ? d : [])).catch(() => {});
    }
  }, [canPost, isSuper, user]);

  const programOptions = useMemo(() => {
    if (!isSuper || !form.departmentId) return programs;
    return programs.filter((p: any) => String(p.departmentId ?? p.department?.id) === form.departmentId);
  }, [programs, form.departmentId, isSuper]);

  const studentScoped = form.audience === 'ALL' || form.audience === 'STUDENTS';
  const set = (k: keyof typeof EMPTY_FORM, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) { toast.error('Title and message are required'); return; }
    setPosting(true);
    try {
      await postAnnouncement({
        title: form.title, body: form.body, audience: form.audience,
        departmentId: isSuper && form.departmentId ? Number(form.departmentId) : null,
        programId: studentScoped && form.programId ? Number(form.programId) : null,
        level: studentScoped && form.level ? Number(form.level) : null,
        pinned: form.pinned, expiresOn: form.expiresOn || null,
      });
      toast.success('Announcement posted');
      setForm(EMPTY_FORM);
      qc.invalidateQueries({ queryKey: ['announcements'] });
      setTab('manage');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not post the announcement');
    } finally {
      setPosting(false);
    }
  };

  const remove = async (a: Announcement) => {
    const ok = await Swal.fire({
      title: 'Delete announcement?', text: `"${a.title}" will be removed for everyone.`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Delete', confirmButtonColor: '#e34948',
    });
    if (!ok.isConfirmed) return;
    try {
      await deleteAnnouncement(a.id);
      toast.success('Announcement deleted');
      qc.invalidateQueries({ queryKey: ['announcements'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not delete');
    }
  };

  const list = tab === 'inbox' ? inbox : managed;
  const items: Announcement[] = list.data ?? [];

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Announcements" breadcrumbs={['Home', 'Announcements']} />

      <div className={canPost ? 'ann-grid' : ''}>
        {/* ── Composer (Super Admin / HOD) ─────────────────────────── */}
        {canPost && (
          <form onSubmit={submit} className="ann-card" style={{ padding: 18, alignSelf: 'start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Megaphone size={18} color="#5156be" />
              <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>New announcement</span>
            </div>

            <label className="ann-label" htmlFor="ann-title">Title</label>
            <input id="ann-title" className="ann-input" value={form.title} maxLength={200}
              onChange={e => set('title', e.target.value)} placeholder="e.g. Mid-semester exams timetable" />

            <label className="ann-label" htmlFor="ann-body">Message</label>
            <textarea id="ann-body" className="ann-input" rows={5} value={form.body}
              onChange={e => set('body', e.target.value)} placeholder="Write the announcement…" style={{ resize: 'vertical', height: 'auto', paddingTop: 8 }} />

            <label className="ann-label" htmlFor="ann-aud">Audience</label>
            <select id="ann-aud" className="ann-input" value={form.audience} onChange={e => set('audience', e.target.value)}>
              {AUDIENCES.filter(a => isSuper || a.value !== 'ADMINS').map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>

            <label className="ann-label" htmlFor="ann-dept">Department</label>
            {isSuper ? (
              <select id="ann-dept" className="ann-input" value={form.departmentId}
                onChange={e => setForm(f => ({ ...f, departmentId: e.target.value, programId: '' }))}>
                <option value="">All departments</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ) : (
              <div className="ann-input" style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', color: '#475569' }}>
                {user?.department?.name ?? 'Your department'}
              </div>
            )}

            {studentScoped && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label className="ann-label" htmlFor="ann-prog">Program (students)</label>
                  <select id="ann-prog" className="ann-input" value={form.programId} onChange={e => set('programId', e.target.value)}>
                    <option value="">All programs</option>
                    {programOptions.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ann-label" htmlFor="ann-level">Level (students)</label>
                  <select id="ann-level" className="ann-input" value={form.level} onChange={e => set('level', e.target.value)}>
                    <option value="">All levels</option>
                    {[100, 200, 300, 400, 500, 600].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, alignItems: 'end' }}>
              <div>
                <label className="ann-label" htmlFor="ann-exp">Hide after (optional)</label>
                <input id="ann-exp" type="date" className="ann-input" value={form.expiresOn} onChange={e => set('expiresOn', e.target.value)} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, marginBottom: 12, fontSize: 13, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#5156be' }} />
                Pin to top
              </label>
            </div>

            <button type="submit" disabled={posting} className="ann-btn">
              {posting ? <Loader2 size={15} className="ann-spin" /> : <Send size={15} />} Post announcement
            </button>
            <p style={{ margin: '10px 0 0', fontSize: 11.5, color: '#94a3b8' }}>
              Everyone in the audience also gets a notification.
            </p>
          </form>
        )}

        {/* ── List ─────────────────────────────────────────────────── */}
        <div className="ann-card">
          {canPost && (
            <div role="tablist" style={{ display: 'flex', gap: 4, padding: '10px 12px 0', borderBottom: '1px solid #f1f5f9' }}>
              {([['inbox', 'Inbox', Inbox], ['manage', isSuper ? 'All posted' : 'Posted in my department', Settings2]] as const).map(([key, label, Icon]) => (
                <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                  className={`ann-tab ${tab === key ? 'is-active' : ''}`}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          )}

          {list.isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Loader2 size={24} color="#5156be" className="ann-spin" /></div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
              <Megaphone size={32} style={{ marginBottom: 8 }} />
              <p style={{ margin: 0, fontWeight: 700 }}>No announcements yet</p>
            </div>
          ) : items.map(a => (
            <article key={a.id} style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', background: a.pinned ? '#fafaff' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    {a.pinned && <span className="ann-chip" style={{ background: '#eef2ff', color: '#4338ca' }}><Pin size={11} /> Pinned</span>}
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{a.title}</h3>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span>{a.authorName ?? 'Administration'}</span>
                    <span>· {new Date(a.createdAt).toLocaleString()}</span>
                    {canPost && <span className="ann-chip">{scopeText(a)}</span>}
                    {a.expiresOn && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><CalendarClock size={11} /> until {a.expiresOn}</span>}
                  </div>
                </div>
                {tab === 'manage' && (
                  <button onClick={() => remove(a)} aria-label={`Delete ${a.title}`} className="ann-del"><Trash2 size={15} /></button>
                )}
              </div>
              <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{a.body}</p>
            </article>
          ))}
        </div>
      </div>

      <style>{`
        .ann-grid { display: grid; grid-template-columns: 360px 1fr; gap: 20px; align-items: start; }
        .ann-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.06); }
        .ann-label { display: block; font-size: 12px; font-weight: 700; color: #475569; margin-bottom: 5px; }
        .ann-input { width: 100%; box-sizing: border-box; height: 38px; padding: 0 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; margin-bottom: 12px; outline: none; font-family: inherit; background: #fff; color: #1e293b; }
        .ann-input:focus { border-color: #5156be; }
        .ann-btn { width: 100%; height: 40px; border: none; border-radius: 8px; background: #5156be; color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; }
        .ann-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .ann-tab { display: flex; align-items: center; gap: 6px; padding: 8px 12px; border: none; background: none; font-size: 13px; font-weight: 700; color: #64748b; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .ann-tab.is-active { color: #5156be; border-bottom-color: #5156be; }
        .ann-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: #f1f5f9; color: #475569; }
        .ann-del { flex-shrink: 0; width: 32px; height: 32px; border-radius: 8px; border: 1px solid #fee2e2; background: #fff5f5; color: #e34948; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .ann-spin { animation: ann-spin 1s linear infinite; }
        @keyframes ann-spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) { .ann-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
