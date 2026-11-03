/**
 * saveQueue.ts
 *
 * Every save the exam page makes while a student writes (answers, theory text, the exam clock,
 * violations and lock-outs) goes through this queue instead of straight to the server:
 *  - saves of the same thing replace each other, so a burst of clicks or one tab switch sends a
 *    single request, and all of a quiz's queued answers (objective or theory) go together in one request
 *  - an entry stays in localStorage until the server confirms it and is retried with backoff, so a
 *    slow or overloaded server never silently loses an answer or a violation
 *  - one request at a time, shared by every open tab (Web Locks), oldest first
 *
 * Entries belong to the signed-in user (stored under their username) and are only sent while that
 * user is signed in. Logout waits briefly for the queue so nothing is left behind on this device.
 */
import { useSyncExternalStore } from 'react';
import {
  updateQuizAnswer, updateQuizAnswers, saveTheoryAnswers, saveQuizTimer, saveViolationDelay, recordProctoringEvent,
} from '../api/endpoints';

type Kind = 'answer' | 'theory' | 'timer' | 'violation' | 'delay';

interface Entry {
  id: string;
  key: string;      // a new entry replaces any queued entry with the same key
  kind: Kind;
  quizId: string;
  payload: any;
  at: number;       // when it was queued (ms)
  tries: number;
}

const STORE_PREFIX = 'exam-save-queue:';
const MAX_ENTRIES = 1000;
const LOCK_NAME = 'exam-save-queue';
/** Statuses that mean "try again later" however often they happen. */
const RETRY_ALWAYS = new Set([408, 429, 502, 503, 504]);
/** Other server errors are retried this many times, then the entry is dropped so it cannot block the rest. */
const MAX_SERVER_ERROR_TRIES = 6;

let memory: Entry[] = [];
let failing = false;
let nextAllowedAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<void> | null = null;
const closedQuizzes = new Set<string>();
const listeners = new Set<() => void>();

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const owner = (): string | null => {
  try { return JSON.parse(localStorage.getItem('user') || 'null')?.username ?? null; } catch { return null; }
};
const signedIn = () => { try { return !!localStorage.getItem('access_token'); } catch { return false; } };

/** Re-read on every use: another tab may have changed the queue. */
const read = (): Entry[] => {
  const u = owner();
  if (!u) return memory;
  try {
    const raw = localStorage.getItem(STORE_PREFIX + u);
    memory = raw ? JSON.parse(raw) : [];
  } catch { /* storage blocked: keep the in-memory copy */ }
  return memory;
};

const write = (q: Entry[]) => {
  memory = q;
  const u = owner();
  if (u) {
    try {
      if (q.length) localStorage.setItem(STORE_PREFIX + u, JSON.stringify(q));
      else localStorage.removeItem(STORE_PREFIX + u);
    } catch { /* quota or blocked: in-memory only */ }
  }
};

const setFailing = (v: boolean) => {
  if (failing === v) return;
  failing = v;
  listeners.forEach(fn => fn());
};

const schedule = (ms: number) => {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = null; void runOnce(); }, Math.max(ms, nextAllowedAt - Date.now(), 0));
};

const enqueue = (kind: Kind, quizId: number | string, key: string, payload: any) => {
  const qid = String(quizId);
  if (!qid || closedQuizzes.has(qid) || !owner()) return;
  const q = read().filter(e => e.key !== key);
  q.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, key, kind, quizId: qid, payload, at: Date.now(), tries: 0 });
  write(q.length > MAX_ENTRIES ? q.slice(-MAX_ENTRIES) : q);
  schedule(50);   // short pause so saves fired together (blur + visibilitychange) merge first
};

/**
 * Seconds of a queued lock-out still to run. A lock-out that runs while the student is away kept
 * running while the entry waited; one that pauses stopped where it was when the entry was queued
 * (the entry may be sent only after the student returns).
 */
const delayLeft = (e: Entry) => e.payload.paused
  ? Math.max(0, e.payload.seconds)
  : Math.max(0, e.payload.seconds - Math.floor((Date.now() - e.at) / 1000));

/** Most answer changes one request carries (the server accepts up to 500). */
const MAX_ANSWER_BATCH = 200;
/** Set once a server without the batch endpoint answers 404: answers then go one per request. */
let answerBatchUnsupported = false;

/** The entries one request will carry, starting from the head of the queue. */
const batchFor = (head: Entry, q: Entry[]): Entry[] => {
  if (head.kind === 'theory') return q.filter(e => e.kind === 'theory' && e.quizId === head.quizId);
  // A quiz's answer changes go together, oldest first, so the server applies them in the order made
  if (head.kind === 'answer' && !answerBatchUnsupported) {
    return q.filter(e => e.kind === 'answer' && e.quizId === head.quizId).slice(0, MAX_ANSWER_BATCH);
  }
  return [head];
};

const sendAnswers = async (batch: Entry[]): Promise<unknown> => {
  if (batch.length === 1) return updateQuizAnswer(batch[0].payload);
  try {
    return await updateQuizAnswers(batch.map(e => e.payload));
  } catch (err: any) {
    const status = err?.response?.status;
    if (status !== 404 && status !== 405) throw err;
    // An older server: from now on send answers one at a time. This one goes now; the rest stay queued.
    answerBatchUnsupported = true;
    await updateQuizAnswer(batch[0].payload);
    throw Object.assign(new Error('batch unsupported'), { sentOnly: batch[0].id });
  }
};

const send = (head: Entry, batch: Entry[]): Promise<unknown> => {
  switch (head.kind) {
    case 'answer':    return sendAnswers(batch);
    case 'theory':    return saveTheoryAnswers(head.quizId, batch.map(e => e.payload));
    case 'timer':     return saveQuizTimer(head.quizId, head.payload.remainingTime);
    case 'delay':     return saveViolationDelay(head.quizId, delayLeft(head));
    case 'violation': return recordProctoringEvent(head.quizId, head.payload.type, head.payload.violationNumber);
  }
};

const drain = async () => {
  for (;;) {
    if (!signedIn()) return;                     // keep entries for the next sign-in
    const q = read();
    const head = q[0];
    if (!head) { setFailing(false); return; }
    const batch = batchFor(head, q);
    const ids = new Set(batch.map(e => e.id));
    try {
      await send(head, batch);
      write(read().filter(e => !ids.has(e.id)));  // entries queued meanwhile have new ids and stay
      nextAllowedAt = 0;
      setFailing(false);
    } catch (err: any) {
      if (err?.sentOnly) {                       // see sendAnswers: only the head went, the rest go singly next
        write(read().filter(e => e.id !== err.sentOnly));
        continue;
      }
      const status: number | undefined = err?.response?.status;
      if (status === 401) return;                // client.ts signs the user out; resend after sign-in
      const retry = !status || RETRY_ALWAYS.has(status) || (status >= 500 && head.tries + 1 < MAX_SERVER_ERROR_TRIES);
      if (!retry) {                              // the server refused it for good (bad request, attempt closed …)
        write(read().filter(e => !ids.has(e.id)));
        continue;
      }
      write(read().map(e => (e.id === head.id ? { ...e, tries: e.tries + 1 } : e)));
      nextAllowedAt = Date.now() + Math.min(30_000, 1000 * 2 ** head.tries) + Math.random() * 1000;
      setFailing(true);
      schedule(0);
      return;
    }
  }
};

const runOnce = (): Promise<void> => {
  if (running) return running;
  running = (async () => {
    try {
      const locks = (navigator as any).locks;
      if (locks?.request) {
        await locks.request(LOCK_NAME, { ifAvailable: true }, async (lock: unknown) => {
          if (!lock) { schedule(1000); return; }  // another tab is sending; look again shortly
          await drain();
        });
      } else {
        await drain();
      }
    } catch { /* never let the queue break the page */ } finally {
      running = null;
    }
  })();
  return running;
};

// ── Public API ──────────────────────────────────────────────────────────────

/** One objective answer change. Typed answers and matching pairs keep only their latest value. */
export const queueAnswer = (quizId: number | string, data: {
  questionId: number; option: string; checked: boolean; pairIndex?: number; replace?: boolean;
}) => {
  const which = data.replace ? 'typed' : data.pairIndex != null ? `pair:${data.pairIndex}` : `option:${data.option}`;
  enqueue('answer', quizId, `answer:${quizId}:${data.questionId}:${which}`, { ...data, quizId: Number(quizId) });
};

/** One theory answer's text (only changed answers are queued). */
export const queueTheoryAnswer = (quizId: number | string, quesNo: string, givenAnswer: string) =>
  enqueue('theory', quizId, `theory:${quizId}:${quesNo}`, { quesNo, givenAnswer });

/** Exam clock checkpoint. */
export const queueTimer = (quizId: number | string, remainingTime: number) =>
  enqueue('timer', quizId, `timer:${quizId}`, { remainingTime });

/** A violation (or the auto-submit) for the proctoring report; a numbered one also stores the count. */
export const queueViolation = (quizId: number | string, type: string, violationNumber?: number) =>
  enqueue('violation', quizId, `violation:${quizId}:${Date.now()}:${Math.random()}`, { type, violationNumber });

/**
 * A lock-out starting now (0 clears it); the server works out when it ends. A lock-out that pauses
 * while the student is away (paused) is also queued every few seconds with what is left.
 */
export const queueViolationDelay = (quizId: number | string, seconds: number, paused = false) =>
  enqueue('delay', quizId, `delay:${quizId}`, { seconds, paused });

/** Violations queued on this device but not confirmed yet: the highest count and any lock-out still running. */
export const pendingViolationState = (quizId: number | string) => {
  const q = read().filter(e => e.quizId === String(quizId));
  const count = q.filter(e => e.kind === 'violation').reduce((m, e) => Math.max(m, Number(e.payload.violationNumber) || 0), 0);
  const d = q.find(e => e.kind === 'delay');
  return { count, delay: d ? delayLeft(d) : null };
};

/**
 * Sends what is queued and waits until it is confirmed or timeoutMs passes (ignoring backoff).
 * With quizId, waits only for that quiz's entries. Resolves true when none of them are left.
 */
export const flushSaveQueue = async ({ quizId, timeoutMs = 5000 }: { quizId?: number | string; timeoutMs?: number } = {}) => {
  const pending = () => read().some(e => quizId == null || e.quizId === String(quizId));
  const deadline = Date.now() + timeoutMs;
  while (pending() && signedIn() && Date.now() < deadline) {
    nextAllowedAt = 0;
    await Promise.race([runOnce(), sleep(deadline - Date.now())]);
    if (pending()) await sleep(Math.min(1000, Math.max(0, deadline - Date.now())));
  }
  return !pending();
};

/** After submission: drop this quiz's unsent progress and ignore later saves from this page (e.g. a blur while it closes). */
export const closeQuizSaves = (quizId: number | string) => {
  closedQuizzes.add(String(quizId));
  write(read().filter(e => e.quizId !== String(quizId)));
};

/** A new attempt is opening on this page: accept its saves again. */
export const openQuizSaves = (quizId: number | string) => { closedQuizzes.delete(String(quizId)); };

/** Start sending anything left from an earlier visit (after sign-in, when back online …). */
export const kickSaveQueue = () => schedule(0);

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** True while saves are failing and being retried — for a "saving…" warning. */
export const useSaveQueueFailing = () => useSyncExternalStore(subscribe, () => failing);

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { nextAllowedAt = 0; schedule(0); });
  schedule(1000);
}
