/**
 * Time a student's attempt took (start to finish), for staff to compare with the time allowed.
 * It counts the whole span, so it includes time away when the exam clock pauses while away, and the
 * marking time at submission; see TIME_USED_HELP.
 */
import { parseServerDate } from './scores';

/** Over the time allowed by more than this is flagged (saving and marking at submission take a little). */
export const OVER_TIME_GRACE_MINUTES = 2;

export const TIME_USED_HELP =
  'Start to finish of the attempt. It can be longer than the time allowed when: the quiz has a theory section (its time is added); '
  + 'the student was away (browser closed, phone off, offline) while the exam clock pauses for time away; '
  + 'marking at submission was slow; or the time ran out while they were away and the attempt closed when they came back. '
  + 'A violation lock-out does not add time.';

export interface AttemptTimes { status?: string; startedAt?: string; submittedAt?: string; attemptNumber?: number }

/** Minutes from start to finish of the student's latest submitted attempt, or null. */
export function minutesUsed(attempts: AttemptTimes[]): number | null {
  const done = attempts
    .filter(a => a.status === 'SUBMITTED' && a.startedAt && a.submittedAt)
    .sort((a, b) => (b.attemptNumber ?? 0) - (a.attemptNumber ?? 0));
  const last = done[0];
  if (!last) return null;
  const start = parseServerDate(last.startedAt!);
  const end = parseServerDate(last.submittedAt!);
  if (!start || !end) return null;
  const mins = (end.getTime() - start.getTime()) / 60000;
  return mins >= 0 ? mins : null;
}

export const fmtMinutes = (m: number) => {
  const total = Math.round(m);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60), r = total % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};
