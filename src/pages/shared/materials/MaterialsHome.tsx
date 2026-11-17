import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ClipboardList, EyeOff, FileText, Search, AlertTriangle } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import { getManageCourses, errMsg } from '../../../api/materials';
import { useAuth } from '../../../contexts/AuthContext';
import { Spinner, useMaterialsBase } from './shared';
import { tx } from '../../../utils/terms';
import './materials.css';

/** Staff: the courses whose notes and assignments they manage. */
export default function MaterialsHome() {
  const base = useMaterialsBase();
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const [q, setQ] = useState('');
  const courses = useQuery({ queryKey: ['materials', 'manage-courses'], queryFn: () => getManageCourses() });
  const list = (courses.data ?? []).filter(c => !q.trim() || `${c.code ?? ''} ${c.title} ${c.lecturer ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  const showLecturer = user?.role !== 'LECTURER';

  return (
    <div className="cm-page">
      <PageHeader title={tx('Course Materials')} breadcrumbs={['Teaching', tx('Notes & Assignments')]} />
      <p className="cm-help" style={{ marginTop: -12, marginBottom: 16, maxWidth: 720 }}>
        {tx('Post notes, links and assignments week by week. You decide what students see and when; they download, hand in work online and get their marks here.')}
      </p>
      {(courses.data?.length ?? 0) > 6 && (
        <div className="cm-search">
          <Search size={16} />
          <input className="cm-input" value={q} onChange={e => setQ(e.target.value)} placeholder={tx('Search courses')} aria-label={tx('Search courses')} />
        </div>
      )}
      {courses.isLoading ? <Spinner label={tx('Loading your courses…')} />
        : courses.isError ? <div className="cm-banner cm-banner-bad"><AlertTriangle size={16} />{errMsg(courses.error, tx('Could not load the courses.'))}</div>
        : list.length === 0 ? (
          <div className="cm-card cm-empty"><BookOpen size={34} /><b>{q ? tx('No course matches') : tx('No courses yet')}</b>
            {!q && tx('Courses you teach appear here once they are set up.')}</div>
        ) : (
          <div className="cm-courses">
            {list.map(c => (
              <button key={c.courseId} type="button" className="cm-course" onClick={() => navigate(`${base}/materials/${c.courseId}`)}>
                {c.code && <span className="cm-course-code">{c.code}</span>}
                <span className="cm-course-title">{c.title}</span>
                {showLecturer && c.lecturer && <span className="cm-sub">{c.lecturer}</span>}
                <span className="cm-row">
                  <span className="cm-chip cm-chip-mute"><FileText size={12} /> {c.items} {c.items === 1 ? 'item' : 'items'}</span>
                  <span className="cm-chip cm-chip-mute"><ClipboardList size={12} /> {c.assignments} {c.assignments === 1 ? 'assignment' : 'assignments'}</span>
                  {c.toMark > 0 && <span className="cm-chip cm-chip-warn">{c.toMark} to mark</span>}
                  {!c.visibleToStudents && <span className="cm-chip cm-chip-bad"><EyeOff size={12} /> Hidden from students</span>}
                </span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
