import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react';
import { getStudentOverview } from '../../../api/materials';
import { useMaterials } from '../../../hooks/useFeatureFlags';
import { KindIcon, fmtWhen, relative } from '../../shared/materials/shared';
import { tx } from '../../../utils/terms';
import '../../shared/materials/materials.css';

/** Student dashboard: new notes this week and assignments due soon. Nothing shows when there's nothing. */
export default function MaterialsCard() {
  const on = useMaterials();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['materials', 'overview'], queryFn: getStudentOverview, enabled: on, staleTime: 60_000, retry: false });
  const d = q.data;
  if (!on || !d || (d.newItems.length === 0 && d.dueSoon.length === 0)) return null;
  return (
    <section className="cm-card" style={{ marginBottom: 16 }} aria-label={tx('Notes and assignments')}>
      <div className="cm-card-head" style={{ marginBottom: 10 }}>
        <h2 className="cm-title" style={{ fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}><BookOpen size={18} color="var(--brand-text)" /> {tx('This week in your courses')}</h2>
        <button type="button" className="cm-btn-ghost cm-btn-sm" onClick={() => navigate('/user-dashboard/materials')}>All <ChevronRight size={14} /></button>
      </div>
      <div className="cm-dash-list">
        {d.dueSoon.map(a => (
          <button key={`a${a.id}`} type="button" className="cm-dash-item" onClick={() => navigate(`/user-dashboard/materials/${a.courseId}?item=${a.id}`)}>
            <KindIcon kind="ASSIGNMENT" size={15} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="cm-item-title" style={{ fontSize: 13.5 }}>{a.title}</span>
              <span className="cm-sub" style={{ display: 'block' }}>{a.courseCode || a.courseTitle} · due {fmtWhen(a.dueAt)} ({relative(a.dueAt)})</span>
            </span>
            {a.submitted ? <span className="cm-chip cm-chip-ok"><CheckCircle2 size={12} /> Handed in</span> : <span className="cm-chip cm-chip-warn">To do</span>}
          </button>
        ))}
        {d.newItems.filter(n => n.kind !== 'ASSIGNMENT' || !d.dueSoon.some(a => a.id === n.id)).map(n => (
          <button key={`n${n.id}`} type="button" className="cm-dash-item" onClick={() => navigate(`/user-dashboard/materials/${n.courseId}?item=${n.id}`)}>
            <KindIcon kind={n.kind} size={15} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span className="cm-item-title" style={{ fontSize: 13.5 }}>{n.title}</span>
              <span className="cm-sub" style={{ display: 'block' }}>{n.courseCode || n.courseTitle} · {n.weekNumber === 0 ? 'General' : `Week ${n.weekNumber}`}</span>
            </span>
            <span className="cm-chip cm-chip-new">New</span>
          </button>
        ))}
      </div>
    </section>
  );
}
