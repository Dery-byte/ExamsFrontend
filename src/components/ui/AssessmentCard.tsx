import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStaffBase } from '../../hooks/useStaffBase';
import { Settings, Trash2, Loader2, Link2, ShieldAlert, ArrowRight, Save, Lock } from 'lucide-react';
import MoreMenu from './MoreMenu';
import { copyQuizLink } from '../../utils/quizLink';
import './AssessmentCard.css';
import { tx } from '../../utils/terms';

interface AssessmentCardProps {
  qId: number;
  title: string;
  quizType: string;
  status: string;
  category?: { title?: string };
  numberOfQuestions: number;
  /** Question pool on: numberOfQuestions is how many each student gets from a larger pool. */
  questionPool?: boolean;
  maxMarks: number;
  quizTime: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  /** Students have results: delete is shown locked (choosing it still explains why). */
  deleteLocked?: boolean;
  /** Explanation shown for delete. */
  deleteHint?: string;
  selectedStatus: string;
  onStatusChange: (id: number, newStatus: string) => void;
  onSync: () => void;
  updating: boolean;
}

type Kind = 'OBJ' | 'THEORY' | 'BOTH';
const kindOf = (t: string): Kind => {
  const u = (t || '').toUpperCase();
  return u === 'THEORY' ? 'THEORY' : u === 'BOTH' ? 'BOTH' : 'OBJ';   // 'OBJ' / 'OBJECTIVE' / unknown
};
const KIND_LABEL: Record<Kind, string> = { OBJ: 'Objective', THEORY: 'Theory', BOTH: 'Obj + Theory' };
const KIND_FULL: Record<Kind, string> = { OBJ: 'Objective', THEORY: 'Theory', BOTH: 'Objective + Theory' };

/**
 * A quiz in the staff Quizzes list, laid out like a listing card: course and title, the key numbers in the brand colour, a status bar (pick Open / Closed, then Save), and a
 * footer with the type pill, the way into the questions and a "more" menu for the other actions.
 */
export default function AssessmentCard({
  qId, title, quizType, status, category, numberOfQuestions, questionPool, maxMarks, quizTime,
  onEdit, onDelete, deleteLocked, deleteHint, selectedStatus, onStatusChange, onSync, updating,
}: AssessmentCardProps) {
  const staffBase = useStaffBase();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const kind = kindOf(quizType);
  const current = (status || 'CLOSED').toUpperCase();
  const chosen = (selectedStatus || current).toUpperCase();
  const changed = chosen !== current;
  const isOpen = current === 'OPEN';
  const perStudent = questionPool && kind !== 'THEORY';

  return (
    <article className={`qz-card${menuOpen ? ' menu-open' : ''}`}>
      <header className="qz-head">
        <div className="qz-head-text">
          <p className="qz-course" title={category?.title}>{category?.title || 'No course'}</p>
          <h3 className="qz-title" title={title}>{title}</h3>
        </div>
      </header>

      <p className="qz-meta">
        {numberOfQuestions} {perStudent ? tx('per student') : numberOfQuestions === 1 ? 'question' : 'questions'}
        <span className="qz-sep" aria-hidden>·</span>{maxMarks} marks
        <span className="qz-sep" aria-hidden>·</span>{quizTime} mins
      </p>

      <div className={`qz-status${isOpen ? ' is-open' : ''}`}>
        <span className="qz-state">
          <span className="qz-dot" aria-hidden />
          {isOpen ? 'Open to students' : 'Closed'}
        </span>
        <div className="qz-status-ctl" role="group" aria-label="Change status">
          <div className="qz-seg">
            {(['CLOSED', 'OPEN'] as const).map(v => (
              <button key={v} type="button" className={`${v === 'OPEN' ? 'v-open' : 'v-closed'}${chosen === v ? ' on' : ''}`} aria-pressed={chosen === v}
                onClick={() => onStatusChange(qId, v)} disabled={updating}>
                {v === 'OPEN' ? 'Open' : 'Closed'}
              </button>
            ))}
          </div>
          <button type="button" className={`qz-save${changed ? ' ready' : ''}`} onClick={onSync} disabled={updating || !changed}
            title={changed ? `Save: make the quiz ${chosen === 'OPEN' ? 'open' : 'closed'}` : 'Choose Open or Closed, then save'}
            aria-label={changed ? `Save: make the quiz ${chosen === 'OPEN' ? 'open' : 'closed'}` : 'Save status (no change to save)'}>
            {updating ? <Loader2 size={14} className="spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </div>

      <footer className="qz-foot">
        <span className="qz-pill" title={KIND_FULL[kind]}>{KIND_LABEL[kind]}</span>
        <div className="qz-foot-right">
          <Link to={`${staffBase}/view-questions/${qId}/${encodeURIComponent(title)}`} className="qz-bank">
            Question bank <ArrowRight size={15} />
          </Link>
          <MoreMenu
            onOpenChange={setMenuOpen} label={`More actions for ${title}`}
            items={[
              { icon: <Link2 size={16} />, label: tx('Copy student link'), onSelect: () => copyQuizLink(qId, { title, courseTitle: category?.title }) },
              { icon: <ShieldAlert size={16} />, label: 'Proctoring report', onSelect: () => navigate(`${staffBase}/proctoring/${qId}`) },
              { icon: <Settings size={16} />, label: 'Quiz settings', onSelect: () => onEdit(qId) },
              { icon: deleteLocked ? <Lock size={16} /> : <Trash2 size={16} />, label: 'Delete quiz', hint: deleteHint, danger: true, muted: deleteLocked, onSelect: () => onDelete(qId) },
            ]}
          />
        </div>
      </footer>
    </article>
  );
}
