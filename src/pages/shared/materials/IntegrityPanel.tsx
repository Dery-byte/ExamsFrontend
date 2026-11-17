import { AlertTriangle, Bot, CheckCircle2, ChevronRight, Copy, Info } from 'lucide-react';
import type { StudentWork } from '../../../api/materials';

/**
 * The marking screen's checks on one student's work:
 *  - similarity with classmates (share of their phrases in common, question wording left out), with the
 *    passages they share: real evidence the lecturer can read;
 *  - phrases chatbots write, left in by mistake;
 *  - the AI's cautious view on AI writing (from "Mark with AI"): a pointer, never proof, never in the mark.
 */
export default function IntegrityPanel({ w, onOpenStudent }: { w: StudentWork; onOpenStudent?: (studentId: number) => void }) {
  if (!w.submittedAt) return null;
  const similar = w.similar ?? [];
  const flagged = similar.filter(s => s.flagged);
  const phrases = w.chatbotPhrases ?? [];
  const level = w.aiWriting;
  const concern = flagged.length > 0 || phrases.length > 0 || level === 'HIGH' || level === 'MEDIUM';

  return (
    <details className={`cm-details cm-checks${concern ? ' has-concern' : ''}`} open={concern} style={{ marginTop: 0, marginBottom: 14 }}>
      <summary>
        Checks{concern ? ': worth a look' : ': nothing found'}
      </summary>

      {/* Similarity */}
      <div className="cm-check-block">
        <div className="cm-check-title"><Copy size={14} /> Similar to classmates' work</div>
        {w.hasText === false ? (
          <p className="cm-help">No text to compare: the work is photos or scanned pages.</p>
        ) : similar.length === 0 ? (
          <p className="cm-check-ok"><CheckCircle2 size={14} /> Not similar to anyone else's work.</p>
        ) : similar.map(s => (
          <details key={s.studentId} className="cm-match">
            <summary>
              <span className={`cm-chip ${s.percent >= 70 ? 'cm-chip-bad' : s.flagged ? 'cm-chip-warn' : 'cm-chip-mute'}`}>{s.percent}%</span>
              <span>similar to <b>{s.name}</b></span>
            </summary>
            {s.passages.length > 0 && <div className="cm-passages">
              <small>Shared passages (in this student's words):</small>
              {s.passages.map((p, i) => <blockquote key={i}>{p}</blockquote>)}
            </div>}
            {onOpenStudent && (
              <button type="button" className="cm-btn-ghost cm-btn-sm" onClick={() => onOpenStudent(s.studentId)}>
                Open {s.name}'s work <ChevronRight size={14} />
              </button>
            )}
          </details>
        ))}
        {similar.length > 0 && <p className="cm-help">The share of this work's phrases that also appear in the other's, leaving out the question's own wording.</p>}
      </div>

      {/* Chatbot leftovers */}
      {phrases.length > 0 && (
        <div className="cm-check-block">
          <div className="cm-banner cm-banner-bad" style={{ margin: 0 }}><Bot size={16} />
            <span>Contains phrases chatbots write: {phrases.map(p => `“${p}”`).join(', ')}.</span></div>
        </div>
      )}

      {/* AI writing */}
      <div className="cm-check-block">
        <div className="cm-check-title"><Bot size={14} /> Signs of AI writing</div>
        {level ? (
          <>
            <span className={`cm-chip ${level === 'HIGH' ? 'cm-chip-bad' : level === 'MEDIUM' ? 'cm-chip-warn' : 'cm-chip-ok'}`}>
              {level === 'HIGH' ? 'Strong signs' : level === 'MEDIUM' ? 'Some signs' : 'No clear signs'}
            </span>
            {w.aiWritingNotes && <ul className="cm-signals">{w.aiWritingNotes.split('\n').map((x, i) => <li key={i}>{x}</li>)}</ul>}
            <p className="cm-help" style={{ display: 'flex', gap: 6 }}><Info size={13} style={{ flexShrink: 0, marginTop: 2 }} />
              A pointer, not proof: no tool can tell for certain, and clear writing or writing in a second language can look like AI.
              It doesn't change the mark. Talk to the student before acting on it.</p>
          </>
        ) : (
          <p className="cm-help">{w.aiScore != null ? 'Mark again with AI to also check for AI writing.' : '“Mark with AI” also checks for signs of AI writing.'}</p>
        )}
      </div>
      {concern && <p className="cm-help" style={{ display: 'flex', gap: 6, marginBottom: 0 }}><AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
        Students don't see these checks.</p>}
    </details>
  );
}
