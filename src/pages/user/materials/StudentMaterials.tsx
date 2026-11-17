import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BookOpen, ClipboardList, EyeOff, FileText } from 'lucide-react';
import PageHeader from '../../../components/PageHeader';
import { errMsg, getStudentCourses } from '../../../api/materials';
import { Spinner, plain } from '../../shared/materials/shared';
import { tx } from '../../../utils/terms';
import '../../shared/materials/materials.css';

/** Student: courses this term with notes and assignments. */
export default function StudentMaterials() {
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ['materials', 'student-courses'], queryFn: getStudentCourses });
  const list = q.data ?? [];
  return (
    <div className="cm-page">
      <PageHeader title={tx('Notes & Assignments')} breadcrumbs={['Learning', tx('Notes & Assignments')]} />
      {q.isLoading ? <Spinner label={tx('Loading your courses…')} />
        : q.isError ? <div className="cm-banner cm-banner-bad"><AlertTriangle size={16} />{errMsg(q.error, tx('Could not load your courses.'))}</div>
        : list.length === 0 ? (
          <div className="cm-card cm-empty"><BookOpen size={34} /><b>{tx('No courses yet')}</b>{tx('Courses you are registered for this term appear here.')}</div>
        ) : (
          <div className="cm-courses">
            {list.map(c => (
              <button key={c.courseId} type="button" className="cm-course" onClick={() => navigate(`/user-dashboard/materials/${c.courseId}`)}>
                {c.code && <span className="cm-course-code">{c.code}</span>}
                <span className="cm-course-title">{c.title}</span>
                {c.lecturer && <span className="cm-sub">{c.lecturer}</span>}
                <span className="cm-row">
                  {c.hiddenReason ? (
                    <span className="cm-chip cm-chip-mute"><EyeOff size={12} /> {c.hiddenReason === 'QUIZ' ? 'Hidden during your quiz' : 'Not available yet'}</span>
                  ) : <>
                    {c.newItems > 0 && <span className="cm-chip cm-chip-new">{c.newItems} new</span>}
                    {c.toHandIn > 0 && <span className="cm-chip cm-chip-warn"><ClipboardList size={12} /> {c.toHandIn} to hand in</span>}
                    {c.assignmentTotal && <span className="cm-chip cm-chip-info" title="Your assignment marks so far">Assignments {plain(c.assignmentTotal.total)}/{plain(c.assignmentTotal.outOf)}{c.assignmentTotal.percent != null ? ` · ${plain(c.assignmentTotal.percent)}%` : ''}</span>}
                    <span className="cm-chip cm-chip-mute"><FileText size={12} /> {c.items} {c.items === 1 ? 'item' : 'items'}</span>
                    {c.assignments > 0 && <span className="cm-chip cm-chip-mute"><ClipboardList size={12} /> {c.assignments} {c.assignments === 1 ? 'assignment' : 'assignments'}</span>}
                  </>}
                </span>
              </button>
            ))}
          </div>
        )}
    </div>
  );
}
