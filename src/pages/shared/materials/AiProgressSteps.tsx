import { Check, Loader2 } from 'lucide-react';
import type { AiProgressInfo } from '../../../api/materials';

/**
 * What the AI is doing for this student right now, step by step, with how long it has been at it.
 * Every step shown is one the server has really reached (no made-up progress): getting the work ready
 * (and turning slides or Word files into pages), sending it, the AI reading and marking, saving.
 */
export default function AiProgressSteps({ p, extraSeconds = 0 }: { p: AiProgressInfo; extraSeconds?: number }) {
  const order = ['QUEUED', 'PREPARING', 'CONVERTING', 'READING', 'SAVING'];
  const at = order.indexOf(p.stage);
  const reading = p.stage === 'READING';
  const stageSecs = p.stageSeconds + extraSeconds;
  const total = p.seconds + extraSeconds;
  const steps: { key: string; title: string; sub?: string | null; state: 'done' | 'now' | 'todo' }[] = [
    {
      key: 'prep', title: p.stage === 'QUEUED' ? 'Waiting to start' : 'Getting the work ready',
      sub: p.stage === 'CONVERTING' ? `Turning ${p.detail} into pages so ${p.provider} can see the slides and pictures` : null,
      state: at <= 2 ? 'now' : 'done',
    },
    {
      key: 'send', title: `Sending it to ${p.provider}`,
      sub: at >= 3 && p.detail ? `Sent ${p.detail}` : null,
      state: at >= 3 ? 'done' : 'todo',
    },
    {
      key: 'read', title: `${p.provider} is reading and marking`,
      sub: reading ? `Reading the work, checking it against the instructions and your marking guide, and writing feedback · ${fmt(stageSecs)}` : null,
      state: reading ? 'now' : at > 3 ? 'done' : 'todo',
    },
    { key: 'save', title: 'Saving the suggestion', state: p.stage === 'SAVING' ? 'now' : 'todo' },
  ];
  return (
    <div className="cm-steps" role="status" aria-live="polite">
      <ol>
        {steps.map(s => (
          <li key={s.key} className={`is-${s.state}`}>
            <span className="cm-step-dot" aria-hidden>
              {s.state === 'done' ? <Check size={12} strokeWidth={3} /> : s.state === 'now' ? <Loader2 size={13} className="cm-spin" /> : null}
            </span>
            <span className="cm-step-text">
              <b>{s.title}</b>
              {s.sub && <small>{s.sub}</small>}
              {s.state === 'now' && s.key === 'read' && <span className="cm-step-bar" aria-hidden><span /></span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="cm-step-foot">
        {fmt(total)} so far{reading && stageSecs > 45 ? ' · long or scanned work can take a minute or two' : ''}. You can move on to the next student; this carries on.
      </p>
    </div>
  );
}

const fmt = (s: number) => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`);
