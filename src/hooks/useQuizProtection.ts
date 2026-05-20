/**
 * useQuizProtection.ts
 *
 * Complete React port of Angular QuizProtectionService + ScreenshotPreventionService.
 *
 * Violation actions (from DB):
 *   NONE               → log only
 *   DELAY_ONLY         → lock student for delaySeconds on every violation
 *   AUTOSUBMIT_ONLY    → auto-submit when maxViolations reached
 *   DELAY_AND_AUTOSUBMIT → delay on each violation; auto-submit at max
 *
 * DOM overlays are injected directly (matching Angular's Renderer2 approach)
 * so React state is not needed for the overlay UI.
 */

import { useEffect, useRef, useCallback } from 'react';
import { saveViolationCount, saveViolationDelay, getViolationDelay } from '../api/endpoints';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ViolationAction =
  | 'NONE'
  | 'DELAY_ONLY'
  | 'AUTOSUBMIT_ONLY'
  | 'DELAY_AND_AUTOSUBMIT';

export interface QuizProtectionConfig {
  quizId: string;
  violationAction: ViolationAction;
  maxViolations: number;
  delaySeconds: number;
  delayMultiplier: number;
  autoSubmitCountdownSeconds: number;
  enableFullscreenLock: boolean;
  enableWatermark: boolean;
  enableScreenshotBlocking: boolean;
  enableDevToolsBlocking: boolean;
  username: string;
   _savedViolationCount?: number;
  _pendingViolationDelay?: number;
  onAutoSubmit: () => void;
}

// ── CSS injected once ─────────────────────────────────────────────────────────
const injectStyles = () => {
  if (document.getElementById('qps-global-style')) return;
  const s = document.createElement('style');
  s.id = 'qps-global-style';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    /* animations */
    @keyframes qps-ovIn   { from{opacity:0} to{opacity:1} }
    @keyframes qps-cIn    { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes qps-ring   { 0%,100%{transform:scale(1);opacity:.35} 50%{transform:scale(1.08);opacity:.12} }
    @keyframes qps-dot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.2;transform:scale(.45)} }
    @keyframes qps-pop    { 0%{transform:scale(1)} 50%{transform:scale(1.12)} 100%{transform:scale(1)} }
    @keyframes qps-slide  { from{opacity:0;transform:translateX(-50%) translateY(-14px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
    @keyframes qps-fadeOff{ from{opacity:1;transform:translateX(-50%) translateY(0)} to{opacity:0;transform:translateX(-50%) translateY(-8px)} }
    @keyframes qps-shimmer{ 0%{left:-100%} 100%{left:160%} }
    @keyframes qps-pulse  { 0%,100%{opacity:1} 50%{opacity:.35} }

    /* overlay shell */
    .qps-ov {
      position:fixed; top:0; left:0; width:100vw; height:100vh;
      display:flex; align-items:center; justify-content:center;
      z-index:1000003; font-family:'Sora',system-ui,sans-serif;
      animation: qps-ovIn .3s ease both;
    }
    .qps-ov-dark { background:rgba(4,4,4,.97); }
    .qps-ov-red  { background:rgba(6,2,2,.97); }

    /* card */
    .qps-card {
      text-align:center; padding:44px 40px 36px;
      max-width:500px; width:90vw;
      background:#0e0e0e; border:1px solid #262626; border-radius:24px;
      box-shadow:0 48px 120px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.04);
      animation: qps-cIn .35s cubic-bezier(.16,1,.3,1) both;
      position:relative; overflow:hidden;
    }
    .qps-card::before {
      content:''; display:block; position:absolute; top:0; left:0; right:0; height:1px;
    }
    .qps-c-amber::before { background:linear-gradient(90deg,transparent,rgba(251,191,36,.45),transparent); }
    .qps-c-red::before   { background:linear-gradient(90deg,transparent,rgba(248,113,113,.45),transparent); }
    .qps-c-green::before { background:linear-gradient(90deg,transparent,rgba(74,222,128,.45),transparent); }

    /* icon box */
    .qps-ico {
      width:64px; height:64px; border-radius:17px;
      display:flex; align-items:center; justify-content:center;
      margin:0 auto 22px; position:relative;
    }
    .qps-ico::after {
      content:''; position:absolute; inset:-8px; border-radius:24px;
      border:1px solid currentColor; opacity:.15;
      animation: qps-ring 2.5s ease-in-out infinite;
    }
    .qps-ico-amber { background:rgba(251,191,36,.07); border:1px solid rgba(251,191,36,.22); color:#fbbf24; }
    .qps-ico-red   { background:rgba(248,113,113,.07); border:1px solid rgba(248,113,113,.22); color:#f87171; }
    .qps-ico-green { background:rgba(74,222,128,.07);  border:1px solid rgba(74,222,128,.22);  color:#4ade80; }

    /* badge */
    .qps-bdg {
      display:inline-flex; align-items:center; gap:6px; padding:3px 12px;
      border-radius:100px; font-family:'JetBrains Mono',monospace;
      font-size:9px; font-weight:600; letter-spacing:.13em; text-transform:uppercase; margin-bottom:14px;
    }
    .qps-bdg-amber { background:rgba(251,191,36,.07); border:1px solid rgba(251,191,36,.2);  color:rgba(251,191,36,.85); }
    .qps-bdg-red   { background:rgba(248,113,113,.07); border:1px solid rgba(248,113,113,.2); color:rgba(248,113,113,.85); }
    .qps-bdg-green { background:rgba(74,222,128,.07);  border:1px solid rgba(74,222,128,.2);  color:rgba(74,222,128,.85); }
    .qps-dot { width:5px; height:5px; border-radius:50%; background:currentColor; animation:qps-dot 2s infinite; }

    /* typography */
    .qps-title { font-size:24px; font-weight:700; letter-spacing:-.025em; line-height:1.2; color:rgba(255,255,255,.9); margin:0 0 10px; }
    .qps-sub   { font-size:13px; font-weight:300; color:rgba(255,255,255,.35); line-height:1.65; margin:0 0 24px; max-width:340px; margin-left:auto; margin-right:auto; }

    /* countdown ring */
    .qps-ring-wrap { position:relative; width:160px; height:160px; margin:0 auto 28px; }
    .qps-ring-wrap svg { transform:rotate(-90deg); }
    .qps-ring-num {
      position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      font-family:'JetBrains Mono',monospace; font-size:52px; font-weight:800; line-height:1; letter-spacing:-.04em;
    }
    .qps-ring-lbl {
      position:absolute; bottom:22px; left:50%; transform:translateX(-50%);
      font-family:'JetBrains Mono',monospace; font-size:9px; letter-spacing:.12em;
      text-transform:uppercase; color:rgba(255,255,255,.22); white-space:nowrap;
    }

    /* stats */
    .qps-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:14px; width:100%; }
    .qps-stat { background:#141414; border:1px solid #262626; border-radius:11px; padding:12px 14px; text-align:left; }
    .qps-stat-lbl { font-family:'JetBrains Mono',monospace; font-size:8px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.22); margin-bottom:5px; }
    .qps-stat-val { font-family:'JetBrains Mono',monospace; font-size:20px; font-weight:700; line-height:1; }

    /* strip */
    .qps-strip {
      display:flex; align-items:flex-start; gap:8px; width:100%;
      padding:10px 14px; border-radius:9px;
      font-family:'JetBrains Mono',monospace; font-size:10px;
      text-align:left; line-height:1.6; box-sizing:border-box; margin-bottom:4px;
    }
    .qps-strip svg { flex-shrink:0; margin-top:1px; }
    .qps-strip-amber { background:rgba(251,191,36,.04); border:1px solid rgba(251,191,36,.15); color:rgba(251,191,36,.55); }
    .qps-strip-red   { background:rgba(248,113,113,.05); border:1px solid rgba(248,113,113,.15); color:rgba(248,113,113,.6); }
    .qps-strip-neutral { background:rgba(255,255,255,.03); border:1px solid #222; color:rgba(255,255,255,.28); }

    /* countdown status */
    .qps-cd-status { font-family:'JetBrains Mono',monospace; font-size:11px; color:rgba(255,255,255,.3); margin-top:8px; letter-spacing:.04em; min-height:18px; }

    /* button */
    .qps-btn {
      display:inline-flex; align-items:center; justify-content:center;
      height:50px; padding:0 32px; border:none; border-radius:13px; cursor:pointer;
      font-family:'Sora',sans-serif; font-size:14px; font-weight:700;
      transition:all .18s; position:relative; overflow:hidden;
      margin-top:20px; width:100%;
    }
    .qps-btn-amber { background:#fbbf24; color:#000; box-shadow:0 0 0 1px rgba(251,191,36,.2),0 6px 20px rgba(251,191,36,.2); }
    .qps-btn-amber:hover { background:#fcd34d; transform:translateY(-1px); }
    .qps-btn-green { background:#4ade80; color:#000; box-shadow:0 0 0 1px rgba(74,222,128,.2),0 6px 20px rgba(74,222,128,.2); }
    .qps-btn-green:hover { background:#6ee79a; transform:translateY(-1px); }
    .qps-btn::after {
      content:''; position:absolute; top:0; left:-100%; width:55%; height:100%;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);
      transform:skewX(-18deg); animation:qps-shimmer 2.5s infinite;
    }

    /* toast */
    .qps-toast {
      position:fixed; top:18px; left:50%; transform:translateX(-50%);
      z-index:1000000; animation:qps-slide .28s cubic-bezier(.16,1,.3,1) both;
      display:flex; align-items:center; gap:10px; padding:11px 18px 11px 14px;
      background:#0e0e0e; border:1px solid rgba(248,113,113,.28); border-radius:12px;
      box-shadow:0 0 0 1px rgba(248,113,113,.08) inset,0 12px 36px rgba(0,0,0,.7);
      max-width:440px; white-space:nowrap; pointer-events:none;
    }
    .qps-toast-bar  { flex-shrink:0; width:3px; height:32px; border-radius:2px; background:rgba(248,113,113,.8); }
    .qps-toast-ico  { flex-shrink:0; width:28px; height:28px; border-radius:7px; background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.2); display:flex; align-items:center; justify-content:center; color:rgba(248,113,113,.9); }
    .qps-toast-lbl  { font-family:'JetBrains Mono',monospace; font-size:8.5px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:rgba(248,113,113,.55); }
    .qps-toast-msg  { font-family:'Sora',sans-serif; font-size:12.5px; font-weight:500; color:rgba(255,255,255,.75); }
  `;
  document.head.appendChild(s);
};

// ── Audio ─────────────────────────────────────────────────────────────────────
const beep = (freq: number, dur: number, vol = 0.25) => {
  try {
    const ctx  = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + dur);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + dur);
  } catch {}
};

// ── Fullscreen ────────────────────────────────────────────────────────────────
const enterFS = () => {
  const el = document.documentElement as any;
  try { (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen)?.call(el, { navigationUI: 'hide' }); } catch {}
};
const exitFS = () => {
  const d = document as any;
  try { (d.exitFullscreen || d.webkitExitFullscreen || d.mozCancelFullScreen || d.msExitFullscreen)?.call(d); } catch {}
};
const isFS = () => !!(
  document.fullscreenElement || (document as any).webkitFullscreenElement ||
  (document as any).mozFullScreenElement || (document as any).msFullscreenElement
);

// ── Toast notification ─────────────────────────────────────────────────────────
const showToast = (msg: string) => {
  injectStyles();
  const t = document.createElement('div');
  t.className = 'qps-toast';
  t.innerHTML = `
    <div class="qps-toast-bar"></div>
    <div class="qps-toast-ico">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    </div>
    <div style="display:flex;flex-direction:column;gap:2px">
      <span class="qps-toast-lbl">Security Alert</span>
      <span class="qps-toast-msg">${msg.replace(/[⚠️📸🚨]/g,'').trim()}</span>
    </div>`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.animation = 'qps-fadeOff .22s ease both';
    setTimeout(() => t.parentNode?.removeChild(t), 220);
  }, 3500);
};

// ── Overlay management ─────────────────────────────────────────────────────────
// Only ONE overlay at a time (like Angular)
let _ov: HTMLElement | null = null;
const removeOv = () => { _ov?.parentNode?.removeChild(_ov); _ov = null; };

// ── DELAY OVERLAY (ACCESS SUSPENDED) ─────────────────────────────────────────
const showDelayOv = (
  type: string, duration: number, totalV: number, maxV: number,
  willAutoNext: boolean, action: ViolationAction, delayServed: number
) => {
  removeOv();
  injectStyles();
  const isDelayOnly = action === 'DELAY_ONLY';
  const remaining   = maxV - totalV;
  const warnText    = isDelayOnly
    ? `Violation ${totalV} recorded`
    : willAutoNext
      ? 'Next violation will AUTO-SUBMIT your quiz'
      : `${remaining} violation(s) remaining before auto-submit`;

  const el = document.createElement('div');
  el.className = 'qps-ov qps-ov-dark';
  el.id = 'qps-delay-ov';
  el.innerHTML = `
    <div class="qps-card qps-c-amber">
      <div class="qps-ico qps-ico-amber">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
      </div>
      <div class="qps-bdg qps-bdg-amber"><span class="qps-dot"></span>ACCESS SUSPENDED</div>
      <h2 class="qps-title">Quiz Locked</h2>
      <p class="qps-sub">Your access is temporarily suspended while the countdown runs.</p>
      <div class="qps-ring-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>
          <circle id="qps-d-ring" cx="80" cy="80" r="70" fill="none" stroke="#fbbf24" stroke-width="10"
            stroke-dasharray="440" stroke-dashoffset="0" stroke-linecap="round"
            style="transition:stroke-dashoffset 1s linear;"/>
        </svg>
        <div id="qps-d-num" class="qps-ring-num" style="color:#fbbf24">${duration}</div>
        <div class="qps-ring-lbl">SECONDS REMAINING</div>
      </div>
      <div class="qps-stats">
        <div class="qps-stat">
          <div class="qps-stat-lbl">VIOLATION</div>
          <div class="qps-stat-val" style="color:rgba(248,113,113,.8)">${totalV}<span style="font-size:12px;color:rgba(255,255,255,.2)"> / ${maxV}</span></div>
        </div>
        <div class="qps-stat">
          <div class="qps-stat-lbl">TOTAL SUSPENDED</div>
          <div class="qps-stat-val" style="color:rgba(255,255,255,.45);font-size:14px;padding-top:4px">${Math.floor(delayServed/60)}m ${delayServed%60}s</div>
        </div>
      </div>
      <div class="qps-strip ${willAutoNext?'qps-strip-red':'qps-strip-amber'}">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        ${warnText}
      </div>
      <p id="qps-d-status" class="qps-cd-status">Quiz resumes in ${duration} seconds…</p>
    </div>`;
  document.body.appendChild(el);
  _ov = el;
};

const tickDelayOv = (remaining: number, total: number) => {
  const num  = document.getElementById('qps-d-num');
  const st   = document.getElementById('qps-d-status');
  const ring = document.getElementById('qps-d-ring') as unknown as SVGCircleElement | null;
  if (num) { num.textContent = String(remaining); num.style.color = remaining <= 5 ? '#f87171' : '#fbbf24'; if (remaining <= 5 && remaining > 0) { num.style.animation='qps-pop .4s ease'; setTimeout(()=>{ if(num) num.style.animation=''; },400); } }
  if (st)  st.textContent = remaining <= 0 ? 'Resuming quiz access…' : `Quiz resumes in ${remaining} second${remaining!==1?'s':''}…`;
  if (ring) { ring.style.strokeDashoffset = String(440 - (remaining/total)*440); if (remaining <= 5) ring.style.stroke='#f87171'; }
};

// ── AUTOSUBMIT OVERLAY ────────────────────────────────────────────────────────
const showAutoSubmitOv = (
  countdown: number, totalV: number, maxV: number, delayServed: number, type: string
) => {
  removeOv();
  injectStyles();
  const el = document.createElement('div');
  el.className = 'qps-ov qps-ov-red';
  el.id = 'qps-as-ov';
  el.innerHTML = `
    <div class="qps-card qps-c-red">
      <div class="qps-ico qps-ico-red">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
        </svg>
      </div>
      <div class="qps-bdg qps-bdg-red"><span class="qps-dot"></span>AUTO-SUBMITTING</div>
      <h2 class="qps-title">Maximum Violations</h2>
      <p class="qps-sub">Your quiz will be automatically submitted. All answers have been saved.</p>
      <div class="qps-ring-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="10"/>
          <circle id="qps-as-ring" cx="80" cy="80" r="70" fill="none" stroke="#f87171" stroke-width="10"
            stroke-dasharray="440" stroke-dashoffset="0" stroke-linecap="round"
            style="transition:stroke-dashoffset 1s linear;"/>
        </svg>
        <div id="qps-as-num" class="qps-ring-num" style="color:#f87171">${countdown}</div>
        <div class="qps-ring-lbl">SUBMITTING IN</div>
      </div>
      <div class="qps-stats">
        <div class="qps-stat">
          <div class="qps-stat-lbl">VIOLATIONS</div>
          <div class="qps-stat-val" style="color:rgba(248,113,113,.8)">${totalV}<span style="font-size:11px;color:rgba(255,255,255,.2)"> / ${maxV}</span></div>
        </div>
        <div class="qps-stat">
          <div class="qps-stat-lbl">DELAY SERVED</div>
          <div class="qps-stat-val" style="color:rgba(255,255,255,.4);font-size:15px">${Math.floor(delayServed/60)}m ${delayServed%60}s</div>
        </div>
      </div>
      <div class="qps-strip qps-strip-red">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/></svg>
        Reason: ${type.replace(/-/g,' ')}
      </div>
      <p id="qps-as-status" class="qps-cd-status">Submitting in ${countdown} seconds…</p>
    </div>`;
  document.body.appendChild(el);
  _ov = el;
};

const tickAutoSubmitOv = (remaining: number, total: number) => {
  const num  = document.getElementById('qps-as-num');
  const st   = document.getElementById('qps-as-status');
  const ring = document.getElementById('qps-as-ring') as unknown as SVGCircleElement | null;
  if (num) { num.textContent = String(remaining); if (remaining<=3){num.style.animation='qps-pop .35s ease';setTimeout(()=>{if(num)num.style.animation='';},350);} }
  if (st)  st.textContent = remaining<=0?'Submitting now…':`Submitting in ${remaining} second${remaining!==1?'s':''}…`;
  if (ring) ring.style.strokeDashoffset = String(440 - (remaining/total)*440);
};

// ── CRITICAL WARNING OVERLAY ──────────────────────────────────────────────────
const showCriticalWarnOv = (
  remaining: number, totalV: number, maxV: number, onReturn: () => void
) => {
  removeOv();
  injectStyles();
  const el = document.createElement('div');
  el.className = 'qps-ov qps-ov-red';
  el.innerHTML = `
    <div class="qps-card qps-c-red">
      <div class="qps-ico qps-ico-red">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86"/>
          <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <div class="qps-bdg qps-bdg-red"><span class="qps-dot"></span>CRITICAL WARNING</div>
      <h2 class="qps-title">Final Warning</h2>
      <p class="qps-sub">Do not switch tabs, exit fullscreen, or use restricted shortcuts.</p>
      <div style="width:100%;padding:18px 20px;margin-bottom:14px;background:rgba(248,113,113,.06);border:1px solid rgba(248,113,113,.2);border-radius:14px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;">
        <div style="text-align:left">
          <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.25);margin-bottom:4px">WARNINGS LEFT</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,.4)">before auto-submit</div>
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:56px;font-weight:800;color:rgba(248,113,113,.9);line-height:1">${remaining}</div>
      </div>
      <div class="qps-strip qps-strip-red">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
        Violations: ${totalV} / ${maxV}
      </div>
      <button id="qps-return-btn" class="qps-btn qps-btn-green">I Understand — Return to Quiz</button>
    </div>`;
  document.body.appendChild(el);
  _ov = el;
  el.querySelector('#qps-return-btn')?.addEventListener('click', () => { removeOv(); onReturn(); });
  // Auto-dismiss after 10s
  setTimeout(() => { if (_ov === el) removeOv(); }, 10000);
};


// ── Canvas screenshot prevention (Pornhub/Netflix style) ─────────────────────
// Injects a transparent canvas overlay that intercepts print/screenshot attempts
// by rendering a solid black frame when triggered, then clearing instantly.
// This makes screenshots capture black instead of exam content.
let _ssCanvas: HTMLCanvasElement | null = null;

const injectCanvasOverlay = () => {
  if (_ssCanvas || document.getElementById('qps-ss-canvas')) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'qps-ss-canvas';
  canvas.style.cssText = [
    'position:fixed', 'top:0', 'left:0',
    'width:100vw', 'height:100vh',
    'pointer-events:none',        // let clicks through
    'z-index:2147483647',         // max z-index
    'opacity:0',                  // normally invisible
    'transition:opacity 0s',
  ].join(';');
  document.body.appendChild(canvas);
  _ssCanvas = canvas;

  // Resize canvas to fill screen
  const resize = () => {
    canvas.width  = window.innerWidth  * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
  };
  resize();
  window.addEventListener('resize', resize);

  // On keydown PrintScreen: flash black for 100ms so screenshot captures black
  const blackOut = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    canvas.style.opacity = '1';
    setTimeout(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.opacity = '0';
    }, 100);
  };

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // PrintScreen
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') blackOut();
    // Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
    if (e.metaKey && e.shiftKey && ['3','4','5'].includes(e.key)) blackOut();
    // Windows Snipping: Win+Shift+S (metaKey on Windows = Win key)
    if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') blackOut();
  }, { capture: true });

  // Also intercept the clipboard on keyup (clear after PrintScreen is released)
  window.addEventListener('keyup', (e: KeyboardEvent) => {
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      // Overwrite clipboard with blank
      navigator.clipboard?.write?.([
        new ClipboardItem({ 'image/png': new Blob([''], { type: 'image/png' }) })
      ]).catch(() => {});
      navigator.clipboard?.writeText?.('').catch(() => {});
    }
  }, { capture: true });
};

const removeCanvasOverlay = () => {
  if (_ssCanvas?.parentNode) _ssCanvas.parentNode.removeChild(_ssCanvas);
  _ssCanvas = null;
  const el = document.getElementById('qps-ss-canvas');
  el?.parentNode?.removeChild(el);
};







































































































































// ══ MAIN HOOK ═════════════════════════════════════════════════════════════════
export function useQuizProtection(cfg: QuizProtectionConfig) {
  // Mutable state in refs (no re-renders needed)
  const st = useRef({
    totalViolations:   0,
    totalDelayServed:  0,
    curDelayDuration:  0,
    delayRemaining:    0,
    isDelayActive:     false,
    autoSubmitDone:    false,
    isProcessing:      false,
    fsActive:          false,
    wakeLock:          null as any,
  });
  const delayIv  = useRef<ReturnType<typeof setInterval>|null>(null);
  const asIv     = useRef<ReturnType<typeof setInterval>|null>(null);
  const fsIv     = useRef<ReturnType<typeof setInterval>|null>(null);
  const focusIv  = useRef<ReturnType<typeof setInterval>|null>(null);
  const cleanups = useRef<Array<()=>void>>([]);
  const cfgRef   = useRef(cfg);   // always-fresh config reference
  cfgRef.current = cfg;

  // ── helpers that read cfgRef (always fresh) ──────────────────────────────
  const calcDelay = () => {
    const c = cfgRef.current;
    let d = Number(c.delaySeconds);
    if (st.current.totalViolations > 1) {
      d = Math.round(d * Math.pow(Number(c.delayMultiplier), st.current.totalViolations - 1));
          console.log("This is an unknown d", d)

    }

    return d;

  };

  const endDelay = useCallback(() => {
    removeOv();
    const c = cfgRef.current;
    const s = st.current;
    s.isDelayActive = false;
    s.delayRemaining = 0;
    if (delayIv.current) { clearInterval(delayIv.current); delayIv.current = null; }
    s.totalDelayServed += s.curDelayDuration;
    saveViolationDelay(c.quizId, 0).catch(()=>{});

    showToast('Quiz access restored');
    
    const remaining = c.maxViolations - s.totalViolations;
    if (c.violationAction === 'DELAY_AND_AUTOSUBMIT' && remaining === 1) {
      showCriticalWarnOv(remaining, s.totalViolations, c.maxViolations, () => {
        window.focus(); if (c.enableFullscreenLock) setTimeout(enterFS, 300);
      });
    } else {
      window.focus();
      if (c.enableFullscreenLock) setTimeout(enterFS, 300);
    }
  }, []);

  const startDelay = useCallback((type: string, willAutoNext: boolean) => {
    const c   = cfgRef.current;
    const dur = calcDelay();
    st.current.curDelayDuration = dur;
    st.current.delayRemaining   = dur;
    st.current.isDelayActive    = true;

    showDelayOv(type, dur, st.current.totalViolations, c.maxViolations,
      willAutoNext, c.violationAction, st.current.totalDelayServed);
    beep(440, 0.5);

    let t = dur;
    delayIv.current = setInterval(() => {
      t--;
      st.current.delayRemaining = t;
      tickDelayOv(t, dur);
      saveViolationDelay(c.quizId, t).catch(()=>{});
      if (t <= 5 && t > 0) beep(880, 0.2, 0.2);
      if (t <= 0) endDelay();
    }, 1000);
  }, [endDelay]);

  const initiateAutoSubmit = useCallback((type: string) => {
    const c = cfgRef.current;
    if (st.current.autoSubmitDone) return;
    st.current.autoSubmitDone = true;
    if (delayIv.current) { clearInterval(delayIv.current); delayIv.current = null; }

    const max = c.autoSubmitCountdownSeconds;
    let cd = max;
    showAutoSubmitOv(cd, st.current.totalViolations, c.maxViolations, st.current.totalDelayServed, type);
    beep(440, 0.5);

    asIv.current = setInterval(() => {
      cd--;
      tickAutoSubmitOv(cd, max);
      if (cd <= 3 && cd > 0) beep(880, 0.2, 0.2);
      if (cd <= 0) {
        if (asIv.current) { clearInterval(asIv.current); asIv.current = null; }
        cfgRef.current.onAutoSubmit();
      }
    }, 1000);
  }, []);

  const handleViolation = useCallback((type: string) => {
    const c = cfgRef.current;
    const s = st.current;
    if (s.isProcessing || s.autoSubmitDone || s.isDelayActive) return;
    if (c.violationAction === 'NONE') return;

    s.isProcessing = true;
    s.totalViolations++;
    saveViolationCount(c.quizId, s.totalViolations).catch(()=>{});

    const remaining = c.maxViolations - s.totalViolations;

    // Max violations reached → auto-submit
    if (s.totalViolations >= c.maxViolations &&
      (c.violationAction === 'AUTOSUBMIT_ONLY' || c.violationAction === 'DELAY_AND_AUTOSUBMIT')) {
      initiateAutoSubmit(type);
      setTimeout(() => { s.isProcessing = false; }, 500);
      return;
    }

    switch (c.violationAction) {
      case 'DELAY_ONLY':
        showToast('Screenshots and tab-switching are not allowed');
        startDelay(type, false);
        break;

      case 'AUTOSUBMIT_ONLY':
        if (remaining === 1) {
          showCriticalWarnOv(remaining, s.totalViolations, c.maxViolations, () => {
            window.focus(); if (c.enableFullscreenLock) enterFS();
          });
        } else {
          showToast(`Warning: ${remaining} violation(s) remaining before auto-submit`);
        }
        break;

      case 'DELAY_AND_AUTOSUBMIT':
        showToast(`Access suspended. ${remaining} violation(s) remaining`);
        startDelay(type, remaining === 1);
        break;
    }

    setTimeout(() => { s.isProcessing = false; }, 500);
  }, [startDelay, initiateAutoSubmit]);

  // ══ RESTORE VIOLATION STATE when quizConfig loads ═══════════════════════════
  // This fires separately from the main listener setup.
  // The main effect runs once ([] deps) on mount when quizId might be empty.
  // This effect fires when _pendingViolationDelay or _savedViolationCount become
  // non-zero — i.e. after loadAll() completes and sets quizConfig with real values.
  // Mirrors Angular: quizProtection.loadDelayFromBackend(qid) + loadViolationCountFromBackend(qid)
  const pendingDelayVal = (cfg as any)._pendingViolationDelay ?? 0;
  const savedCountVal   = (cfg as any)._savedViolationCount   ?? 0;

//   console.log('[useQuizProtection] Config received:', {
//   _pendingViolationDelay: (cfg as any)._pendingViolationDelay,
//   _savedViolationCount: (cfg as any)._savedViolationCount,
//   quizId: cfg.quizId,
//   violationAction: cfg.violationAction,
// });

  useEffect(() => {
    console.log('[QuizProtection] Restoration effect triggered with:', {
    pendingDelayVal,
    savedCountVal,
    quizId: cfg.quizId,
    isDelayActive: st.current.isDelayActive,
    autoSubmitDone: st.current.autoSubmitDone,
  });
    if (!cfg.quizId || cfg.violationAction === 'NONE') return;
    const s = st.current;

    // Restore violation count first
    if (savedCountVal > 0 && s.totalViolations === 0) {
      s.totalViolations = savedCountVal;
      console.log('[QuizProtection] Restored violation count:', savedCountVal);
    }

    // Restore pending violation delay
    if (pendingDelayVal > 0 && !s.isDelayActive && !s.autoSubmitDone) {
      console.log('[QuizProtection] Restoring pending delay:', pendingDelayVal, 'seconds');
      console.log("heheheheheheheheheeheheheheheeh");
      s.curDelayDuration = pendingDelayVal;
      s.delayRemaining   = pendingDelayVal;
      s.isDelayActive    = true;

      showDelayOv('locked', pendingDelayVal, s.totalViolations,
        cfg.maxViolations, false, cfg.violationAction, s.totalDelayServed);
      beep(440, 0.5);

      let t = pendingDelayVal;
      if (delayIv.current) clearInterval(delayIv.current);
      delayIv.current = setInterval(() => {
        t--;
        s.delayRemaining = t;
        tickDelayOv(t, pendingDelayVal);
        saveViolationDelay(cfg.quizId, t).catch(() => {});
        if (t <= 5 && t > 0) beep(880, 0.2, 0.2);
        if (t <= 0) {
          endDelay();
        }
      }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDelayVal, savedCountVal, cfg.quizId, cfg.violationAction]);












































  
    // ══ SETUP ALL LISTENERS (runs once on mount) ══════════════════════════════
  useEffect(() => {
    injectStyles();
    injectCanvasOverlay();  // screenshot prevention (canvas blackout)
    const s   = st.current;
    const add = (fn: ()=>void) => cleanups.current.push(fn);
    // Note: violation count and delay restore are handled in a separate effect
    // that fires when quizConfig is actually loaded (not on dummy-config mount)

    // ── Screenshot blocking ──
    if (cfg.enableScreenshotBlocking) {
      const ssDown = (e: KeyboardEvent) => {
        let blocked = false;
        if (e.key === 'PrintScreen') blocked = true;
        if (e.metaKey && e.shiftKey && ['3','4','5'].includes(e.key)) blocked = true;
        if (e.metaKey && e.shiftKey && e.key.toLowerCase()==='s') blocked = true;
        if (e.altKey && e.key === 'PrintScreen') blocked = true;
        if (blocked) { e.preventDefault(); e.stopImmediatePropagation(); navigator.clipboard?.writeText('').catch(()=>{}); handleViolation('screenshot-attempt'); }
      };
      const ssUp = (e: KeyboardEvent) => { if (e.key==='PrintScreen') { navigator.clipboard?.writeText('').catch(()=>{}); handleViolation('screenshot-attempt'); } };
      document.addEventListener('keydown', ssDown, true);
      window.addEventListener('keyup', ssUp, true);
      add(() => { document.removeEventListener('keydown', ssDown, true); window.removeEventListener('keyup', ssUp, true); });
    }

    // ── DevTools blocking ──
    if (cfg.enableDevToolsBlocking) {
      const dt = (e: KeyboardEvent) => {
        let blocked = false;
        if (e.key==='F12') blocked=true;
        if ((e.ctrlKey||e.metaKey)&&e.shiftKey&&['i','c','j'].includes(e.key.toLowerCase())) blocked=true;
        if ((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='u') blocked=true;
        if (e.metaKey&&e.altKey&&['i','j','c'].includes(e.key.toLowerCase())) blocked=true;
        if (blocked) { e.preventDefault(); e.stopImmediatePropagation(); handleViolation('devtools-block'); }
      };
      document.addEventListener('keydown', dt, true);
      add(() => document.removeEventListener('keydown', dt, true));
    }

    // ── Context menu ──
    const ctx = (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
    document.addEventListener('contextmenu', ctx, true);
    add(() => document.removeEventListener('contextmenu', ctx, true));

    // ── New tab/window blocking ──
    const tabK = (e: KeyboardEvent) => {
      if ((e.ctrlKey||e.metaKey) && ['n','t','w'].includes(e.key.toLowerCase())) {
        e.preventDefault(); e.stopImmediatePropagation(); handleViolation('new-tab-block');
      }
    };
    const tabC = (e: MouseEvent) => {
      if (e.button===1 || ((e.ctrlKey||e.metaKey)&&e.button===0)) {
        e.preventDefault(); e.stopImmediatePropagation(); handleViolation('new-tab-block');
      }
    };
    document.addEventListener('keydown', tabK, true);
    document.addEventListener('click', tabC, true);
    add(() => { document.removeEventListener('keydown', tabK, true); document.removeEventListener('click', tabC, true); });

    // ── Visibility change (tab switch) ──
    // This is the PRIMARY violation trigger — mirrors Angular's monitorPageVisibility
    const vis = () => {
      if (document.hidden) {
        if (!s.autoSubmitDone && !s.isDelayActive) handleViolation('visibility-hidden');
        // Blur screen while hidden (like Angular's enableBlurOnHidden)
        if (cfg.violationAction !== 'NONE') {
          document.body.style.filter = 'blur(20px)';
          document.body.style.transition = 'filter 0.3s ease';
        }
      } else {
        document.body.style.filter = '';
        window.focus();
        if (s.fsActive && !isFS() && !s.isDelayActive) setTimeout(enterFS, 300);
      }
    };
    document.addEventListener('visibilitychange', vis);
    add(() => document.removeEventListener('visibilitychange', vis));

    // ── Window blur ──
    const blur = () => {
      if (!s.autoSubmitDone && !s.isDelayActive) handleViolation('focus-lost');
      setTimeout(() => { window.focus(); if (s.fsActive && !isFS()) enterFS(); }, 100);
    };
    window.addEventListener('blur', blur);
    add(() => window.removeEventListener('blur', blur));

    // ── Before unload ──
    const unload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', unload);
    add(() => window.removeEventListener('beforeunload', unload));

    // ── Fullscreen lock ──
    if (cfg.enableFullscreenLock) {
      enterFS();
      const fsChange = () => {
        if (!isFS() && s.fsActive && !s.autoSubmitDone && !s.isDelayActive) {
          handleViolation('fullscreen-exit');
          window.focus();
          setTimeout(enterFS, 300);
        }
      };
      ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange'].forEach(ev => {
        document.addEventListener(ev, fsChange);
        add(() => document.removeEventListener(ev, fsChange));
      });
      fsIv.current = setInterval(() => { if (s.fsActive&&!isFS()&&!s.autoSubmitDone&&!s.isDelayActive) enterFS(); }, 2000);
      s.fsActive = true;
    }

    // ── Mobile: prevent zoom & pinch ──
    const vp = document.querySelector('meta[name=viewport]') as HTMLMetaElement|null;
    const origVP = vp?.content ?? '';
    if (vp) vp.content='width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no,viewport-fit=cover';
    let lastTouch = 0;
    const dtap = (e: TouchEvent) => { const now=Date.now(); if(now-lastTouch<=300) e.preventDefault(); lastTouch=now; };
    const pinch = (e: TouchEvent) => { if(e.touches.length>1) e.preventDefault(); };
    document.addEventListener('touchend', dtap, { passive:false });
    document.addEventListener('touchmove', pinch, { passive:false });
    add(() => {
      document.removeEventListener('touchend', dtap);
      document.removeEventListener('touchmove', pinch);
      if (vp && origVP) vp.content = origVP;
    });

    // ── user-select lock ──
    const origSel = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    (document.body.style as any).webkitUserSelect = 'none';
    add(() => { document.body.style.userSelect = origSel; (document.body.style as any).webkitUserSelect = origSel; });

    // ── Focus enforcement ──
    window.focus();
    focusIv.current = setInterval(() => {
      if (!document.hasFocus() || document.hidden) {
        window.focus();
        if (s.fsActive && !isFS()) enterFS();
      }
    }, 1000);

    // ── Wake lock ──
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((wl: any) => { s.wakeLock = wl; }).catch(()=>{});
    }

    return () => {
      // Cleanup all listeners
      cleanups.current.forEach(fn => { try { fn(); } catch {} });
      cleanups.current = [];
      if (delayIv.current) clearInterval(delayIv.current);
      if (asIv.current)    clearInterval(asIv.current);
      if (fsIv.current)    clearInterval(fsIv.current);
      if (focusIv.current) clearInterval(focusIv.current);
      if (s.fsActive)      exitFS();
      s.wakeLock?.release?.();
      removeOv();
      removeCanvasOverlay();
      document.body.style.filter = '';
      document.body.style.userSelect = '';
    };
  }, []); // intentionally empty — config read via cfgRef
}
