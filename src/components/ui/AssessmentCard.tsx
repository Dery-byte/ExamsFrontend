import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, Trash2, List, Zap, Loader2, Layers, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import './AssessmentCard.css';

interface AssessmentCardProps {
  qId: number;
  title: string;
  quizType: string;
  status: string;
  category?: { title?: string };
  numberOfQuestions: number;
  maxMarks: number;
  quizTime: number;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  selectedStatus: string;
  onStatusChange: (id: number, newStatus: string) => void;
  onSync: () => void;
  updating: boolean;
}

export default function AssessmentCard({
  qId,
  title,
  quizType,
  status,
  category,
  numberOfQuestions,
  maxMarks,
  quizTime,
  onEdit,
  onDelete,
  selectedStatus,
  onStatusChange,
  onSync,
  updating,
}: AssessmentCardProps) {
  const isLive = status === 'OPEN' || status === 'Open';
  const isTheory = quizType === 'THEORY';

  return (
    <div className="premium-card">
      <div className="card-top">
        <div className="card-top-left">
          <span className={`type-tag ${isTheory ? 'theory' : 'objective'}`}>
            {quizType}
          </span>
          <div className="status-indicator">
            <span className={`status-dot ${isLive ? 'live' : 'draft'}`} />
            <span className="status-text">{status}</span>
          </div>
        </div>
        <div className="card-top-right">
          <button className="icon-btn" onClick={() => onEdit(qId)} title="Settings">
            <Settings size={16} />
          </button>
          <button className="icon-btn delete" onClick={() => onDelete(qId)} title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="card-main">
        <h3 className="premium-title">{title}</h3>
        <p className="premium-category">
          <Layers size={14} />
          {category?.title || 'Uncategorized'}
        </p>
      </div>

      <div className="metrics-row">
        <div className="metric">
          <span className="m-label">ITEMS</span>
          <span className="m-val">{numberOfQuestions}</span>
        </div>
        <div className="metric">
          <span className="m-label">SCORE</span>
          <span className="m-val">{maxMarks}</span>
        </div>
        <div className="metric">
          <span className="m-label">MINS</span>
          <span className="m-val">{quizTime}</span>
        </div>
      </div>

      <div className="card-bottom">
        <Link to={`/admin/view-questions/${qId}/${title}`} className="bank-btn">
          <List size={16} /> Question Bank
        </Link>
        <div className="sync-section">
          <select 
            value={selectedStatus} 
            onChange={(e) => onStatusChange(qId, e.target.value)}
            className="premium-select"
          >
            <option value="CLOSED">Closed</option>
            <option value="OPEN">Open</option>
          </select>
          <button className="sync-btn" onClick={onSync} disabled={updating}>
            {updating ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
