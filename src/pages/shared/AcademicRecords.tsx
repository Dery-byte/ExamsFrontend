import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Loader2, Download, UserRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import TranscriptView from '../../components/academic/TranscriptView';
import { useAuth } from '../../contexts/AuthContext';
import {
  adminGetAllStudents, downloadTranscriptPdf, getStudentEligibility, getStudentTranscript, saGetAllStudents,
} from '../../api/endpoints';

const nameOf = (s: any): string => (s.fullName ?? `${s.firstname ?? ''} ${s.lastname ?? ''}`.trim()) || s.username || 'Student';

/** Super Admin / HOD: look up any student's academic record, promotion standing and transcript PDF. */
export default function AcademicRecords() {
  const { user } = useAuth() as any;
  const isSuper = user?.role === 'SUPER_ADMIN';
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  const students = useQuery({ queryKey: ['records', 'students', isSuper], queryFn: () => (isSuper ? saGetAllStudents() : adminGetAllStudents()) });
  const transcript = useQuery({ queryKey: ['records', 'transcript', selected?.id], queryFn: () => getStudentTranscript(selected.id), enabled: !!selected });
  const eligibility = useQuery({ queryKey: ['records', 'elig', selected?.id], queryFn: () => getStudentEligibility(selected.id), enabled: !!selected });

  const list = useMemo(() => {
    const all: any[] = Array.isArray(students.data) ? students.data : [];
    const s = q.toLowerCase();
    return all.filter(x => !s || nameOf(x).toLowerCase().includes(s) || (x.username ?? '').toLowerCase().includes(s)
      || (x.program ?? '').toLowerCase().includes(s)).slice(0, 200);
  }, [students.data, q]);

  const download = async () => {
    setDownloading(true);
    try { await downloadTranscriptPdf(selected.id); }
    catch { toast.error('Could not generate the transcript'); }
    finally { setDownloading(false); }
  };

  const e = eligibility.data;

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Academic Records" breadcrumbs={['Students', 'Academic Records']} />
      <div className="ar-grid">
        <nav className="ar-card" aria-label="Students" style={{ alignSelf: 'start' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #f1f5f9', position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 21, top: '50%', transform: 'translateY(-50%)', color: '#adb5bd' }} />
            <input aria-label="Search students" className="ar-input" placeholder="Search name, ID or program…" value={q} onChange={ev => setQ(ev.target.value)} />
          </div>
          <div style={{ maxHeight: 560, overflowY: 'auto' }}>
            {students.isLoading ? <div style={{ padding: 20, textAlign: 'center' }}><Loader2 size={20} color="#5156be" className="spin-ico" style={{ animation: 'spin 1s linear infinite' }} /></div>
              : list.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No students found</div>
              : list.map(s => (
                <button key={s.id} onClick={() => setSelected(s)} className={`ar-stu ${selected?.id === s.id ? 'is-active' : ''}`} aria-current={selected?.id === s.id}>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{nameOf(s)}</span>
                  <span style={{ fontSize: 11.5, color: '#64748b' }}>{s.username}{s.program ? ` · ${s.program}` : ''}{s.currentLevel ? ` · L${s.currentLevel}` : ''}</span>
                </button>
              ))}
          </div>
        </nav>

        <section>
          {!selected ? (
            <div className="ar-empty"><UserRound size={34} /><p>Select a student to see their academic record.</p></div>
          ) : (
            <>
              <div className="ar-banner">
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>{nameOf(selected)}</div>
                  <div style={{ fontSize: 12.5, color: '#64748b' }}>{selected.username}{selected.program ? ` · ${selected.program}` : ''}{selected.currentLevel ? ` · Level ${selected.currentLevel}` : ''}</div>
                </div>
                {e && (
                  <span className="ar-elig" style={e.eligible ? { background: '#eefbee', color: '#0b7a0b' } : { background: '#fdeeee', color: '#9f1f1f' }}
                    title={e.reasons?.join('; ')}>
                    {e.eligible ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                    {e.eligible ? 'Meets promotion rules' : `Held back: ${e.reasons.join('; ')}`}
                  </span>
                )}
                <button onClick={download} disabled={downloading || !transcript.data} className="ar-btn">
                  {downloading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />} Transcript PDF
                </button>
              </div>
              {transcript.isLoading ? <div style={{ padding: 40, textAlign: 'center' }}><Loader2 size={24} color="#5156be" style={{ animation: 'spin 1s linear infinite' }} /></div>
                : transcript.isError ? <div className="ar-empty">{(transcript.error as any)?.response?.data?.message ?? 'Could not load this record.'}</div>
                : <TranscriptView t={transcript.data} />}
            </>
          )}
        </section>
      </div>

      <style>{`
        .ar-grid { display: grid; grid-template-columns: 300px 1fr; gap: 16px; align-items: start; }
        .ar-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
        .ar-input { width: 100%; box-sizing: border-box; height: 36px; padding: 0 10px 0 28px; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; }
        .ar-stu { display: flex; flex-direction: column; gap: 1px; width: 100%; text-align: left; padding: 9px 14px; border: none; border-bottom: 1px solid #f8fafc; background: #fff; cursor: pointer; font-family: inherit; font-size: 13px; }
        .ar-stu:hover { background: #fafbff; }
        .ar-stu.is-active { background: #eef0ff; }
        .ar-banner { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; }
        .ar-banner > div:first-child { flex: 1; }
        .ar-elig { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 8px; max-width: 100%; }
        .ar-btn { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border: none; border-radius: 8px; background: #5156be; color: #fff; font-weight: 700; font-size: 13px; cursor: pointer; }
        .ar-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ar-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 60px 20px; color: #94a3b8; background: #fff; border: 1.5px dashed #e2e8f0; border-radius: 12px; text-align: center; }
        .ar-empty p { margin: 0; }
        @media (max-width: 860px) { .ar-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
