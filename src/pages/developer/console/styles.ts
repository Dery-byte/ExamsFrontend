// Styles for the developer console. Scoped under .dd-shell; tokens switch with the OS colour scheme.
// Layout: sidebar ≥1024px · top bar + tab strip 640–1023px · top bar + bottom nav <640px.

export const CSS = `
.dd-shell {
  --dd-bg: #f5f7fa; --dd-surface: #ffffff; --dd-surface-2: #f8fafc; --dd-border: #e3e8ef; --dd-border-strong: #cdd5df;
  --dd-text: #0f172a; --dd-text-2: #334155; --dd-muted: #64748b; --dd-faint: #94a3b8;
  --dd-accent: #0284c7; --dd-accent-strong: #0369a1; --dd-accent-soft: #e0f2fe; --dd-accent-text: #0369a1; --dd-on-accent: #ffffff;
  --dd-ok: #047857; --dd-ok-soft: #ecfdf5; --dd-ok-line: #a7f3d0;
  --dd-warn: #b45309; --dd-warn-soft: #fffbeb; --dd-warn-line: #fde68a;
  --dd-bad: #b91c1c; --dd-bad-soft: #fef2f2; --dd-bad-line: #fecaca;
  --dd-violet: #6d28d9; --dd-violet-soft: #f3e8ff;
  --dd-chrome: #0b1220; --dd-chrome-2: #131c2e; --dd-chrome-text: #cbd5e1; --dd-chrome-muted: #7c8aa0;
  --dd-shadow: 0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06);
  --dd-shadow-lg: 0 4px 6px -2px rgba(15,23,42,.05), 0 12px 24px -6px rgba(15,23,42,.10);
  --dd-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --dd-side-w: 248px; --dd-top-h: 56px; --dd-bnav-h: 62px;
  min-height: 100vh; background: var(--dd-bg); color: var(--dd-text); font-size: 14px; line-height: 1.5;
  font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased; color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  .dd-shell {
    --dd-bg: #0a0f17; --dd-surface: #111823; --dd-surface-2: #161f2c; --dd-border: #222d3d; --dd-border-strong: #324055;
    --dd-text: #e6edf5; --dd-text-2: #c3cedb; --dd-muted: #8b9bb0; --dd-faint: #64748b;
    --dd-accent: #38bdf8; --dd-accent-strong: #7dd3fc; --dd-accent-soft: rgba(56,189,248,.12); --dd-accent-text: #7dd3fc; --dd-on-accent: #04121f;
    --dd-ok: #34d399; --dd-ok-soft: rgba(52,211,153,.10); --dd-ok-line: rgba(52,211,153,.30);
    --dd-warn: #fbbf24; --dd-warn-soft: rgba(251,191,36,.10); --dd-warn-line: rgba(251,191,36,.30);
    --dd-bad: #f87171; --dd-bad-soft: rgba(248,113,113,.10); --dd-bad-line: rgba(248,113,113,.30);
    --dd-violet: #c4b5fd; --dd-violet-soft: rgba(167,139,250,.14);
    --dd-chrome: #070b12; --dd-chrome-2: #0f1622;
    --dd-shadow: 0 1px 2px rgba(0,0,0,.4); --dd-shadow-lg: 0 12px 28px -8px rgba(0,0,0,.6);
    color-scheme: dark;
  }
}
body:has(.dd-shell) { margin: 0; background: #f5f7fa; }
@media (prefers-color-scheme: dark) { body:has(.dd-shell) { background: #0a0f17; } }
.dd-shell *, .dd-shell *::before, .dd-shell *::after { box-sizing: border-box; }
.dd-shell h1, .dd-shell h2, .dd-shell h3, .dd-shell p, .dd-shell dl, .dd-shell dd { font-family: inherit; }
.dd-shell button, .dd-shell input, .dd-shell select { font: inherit; color: inherit; }
.dd-shell :focus-visible { outline: 2px solid var(--dd-accent); outline-offset: 2px; border-radius: 6px; }
.dd-shell code { font-family: var(--dd-mono); font-size: .88em; background: var(--dd-surface-2); border: 1px solid var(--dd-border); padding: 1px 5px; border-radius: 5px; }
.dd-mono { font-family: var(--dd-mono); font-size: 12.5px; }
.dd-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.dd-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.dd-spin { animation: dd-spin 1s linear infinite; }
@keyframes dd-spin { to { transform: rotate(360deg); } }

/* ── Shell ─────────────────────────────────────────────── */
.dd-side { display: none; }
.dd-top { position: sticky; top: 0; z-index: 30; height: var(--dd-top-h); display: flex; align-items: center; gap: 12px;
  padding: 0 16px; background: var(--dd-chrome); color: var(--dd-chrome-text); }
.dd-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.dd-brand-mark { flex: none; width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center;
  background: linear-gradient(135deg, #0ea5e9, #6366f1); color: #fff; }
.dd-brand-text { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.dd-brand-text strong { color: #fff; font-size: 14px; font-weight: 700; }
.dd-brand-text small { color: var(--dd-chrome-muted); font-size: 11.5px; }
.dd-top-spacer { flex: 1; }
.dd-top-status { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--dd-chrome-text);
  padding: 5px 10px; border-radius: 999px; background: var(--dd-chrome-2); border: 1px solid #1f2a3c; white-space: nowrap; }
.dd-iconbtn { flex: none; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 9px; cursor: pointer;
  background: transparent; border: 1px solid #253247; color: var(--dd-chrome-text); }
.dd-iconbtn:hover { background: var(--dd-chrome-2); color: #fff; }

.dd-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--dd-faint); }
.dd-dot.dd-tone-ok { background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.18); }
.dd-dot.dd-tone-warn { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245,158,11,.2); }
.dd-dot.dd-tone-bad { background: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.22); }

.dd-mnav { position: sticky; top: var(--dd-top-h); z-index: 20; display: flex; gap: 2px; padding: 0 12px; overflow-x: auto;
  background: var(--dd-surface); border-bottom: 1px solid var(--dd-border); scrollbar-width: none; }
.dd-mnav::-webkit-scrollbar { display: none; }
.dd-nav-item { position: relative; display: flex; align-items: center; gap: 8px; border: 0; background: none; cursor: pointer;
  white-space: nowrap; font-weight: 600; font-size: 13.5px; }
.dd-mnav .dd-nav-item { padding: 13px 12px; color: var(--dd-muted); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.dd-mnav .dd-nav-item:hover { color: var(--dd-text); }
.dd-mnav .dd-nav-item[aria-current="page"] { color: var(--dd-accent-text); border-bottom-color: var(--dd-accent); }
.dd-nav-short { display: none; }
.dd-nav-ind { display: inline-flex; align-items: center; }
.dd-count-badge { min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px; font-size: 11px; font-weight: 700;
  display: inline-grid; place-items: center; background: var(--dd-bad); color: #fff; }

.dd-main { width: 100%; max-width: 1200px; margin: 0 auto; padding: 24px 20px 64px; }

@media (min-width: 1024px) {
  .dd-side { display: flex; flex-direction: column; position: fixed; inset: 0 auto 0 0; width: var(--dd-side-w); z-index: 30;
    background: var(--dd-chrome); color: var(--dd-chrome-text); padding: 18px 14px; }
  .dd-side .dd-brand { padding: 4px 8px 22px; }
  .dd-side-label { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--dd-chrome-muted); padding: 0 10px 8px; }
  .dd-side-nav { display: flex; flex-direction: column; gap: 2px; }
  .dd-side-nav .dd-nav-item { width: 100%; padding: 9px 10px; border-radius: 8px; color: var(--dd-chrome-text); text-align: left; }
  .dd-side-nav .dd-nav-item .dd-nav-label { flex: 1; }
  .dd-side-nav .dd-nav-item:hover { background: var(--dd-chrome-2); color: #fff; }
  .dd-side-nav .dd-nav-item[aria-current="page"] { background: rgba(56,189,248,.12); color: #fff; }
  .dd-side-nav .dd-nav-item[aria-current="page"]::before { content: ''; position: absolute; left: -14px; top: 8px; bottom: 8px; width: 3px; border-radius: 0 3px 3px 0; background: #38bdf8; }
  .dd-side-nav .dd-nav-item svg { color: var(--dd-chrome-muted); }
  .dd-side-nav .dd-nav-item[aria-current="page"] svg { color: #38bdf8; }
  .dd-side-foot { margin-top: auto; display: flex; align-items: center; gap: 10px; padding: 12px 8px 2px; border-top: 1px solid #1c2638; }
  .dd-side-foot .dd-avatar { width: 32px; height: 32px; font-size: 12px; background: #1e293b; color: #e2e8f0; }
  .dd-side-user { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
  .dd-side-user strong { font-size: 12.5px; color: #fff; font-weight: 600; }
  .dd-side-user span { font-size: 11.5px; color: var(--dd-chrome-muted); }
  .dd-body { margin-left: var(--dd-side-w); }
  .dd-top, .dd-mnav { display: none; }
  .dd-main { padding: 32px 36px 72px; }
}

@media (max-width: 639.98px) {
  .dd-top { padding: 0 12px; }
  .dd-brand-text small { display: none; }
  .dd-top-status-text { display: none; }
  .dd-top-status { padding: 7px; }
  .dd-mnav { position: fixed; top: auto; bottom: 0; left: 0; right: 0; z-index: 40; padding: 0 4px env(safe-area-inset-bottom);
    border-top: 1px solid var(--dd-border); border-bottom: 0; gap: 0; overflow: visible;
    background: color-mix(in srgb, var(--dd-surface) 92%, transparent); backdrop-filter: saturate(1.6) blur(12px); -webkit-backdrop-filter: saturate(1.6) blur(12px); }
  .dd-mnav .dd-nav-item { flex: 1 1 0; min-width: 0; height: var(--dd-bnav-h); flex-direction: column; justify-content: center; gap: 3px;
    padding: 6px 2px; font-size: 11px; border-bottom: 0; margin: 0; }
  .dd-mnav .dd-nav-item[aria-current="page"]::before { content: ''; position: absolute; top: 0; left: 28%; right: 28%; height: 2px; border-radius: 0 0 2px 2px; background: var(--dd-accent); }
  .dd-mnav .dd-nav-label { display: none; }
  .dd-mnav .dd-nav-short { display: block; }
  .dd-mnav .dd-nav-ind { position: absolute; top: 7px; left: calc(50% + 6px); }
  .dd-mnav .dd-count-badge { min-width: 17px; height: 16px; font-size: 10px; padding: 0 4px; box-shadow: 0 0 0 2px var(--dd-surface); }
  .dd-main { padding: 18px 16px calc(var(--dd-bnav-h) + 32px + env(safe-area-inset-bottom)); }
}

/* ── Panel header ──────────────────────────────────────── */
.dd-phead { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.dd-phead-text { min-width: 0; flex: 1 1 360px; }
.dd-phead h1 { margin: 0; font-size: 24px; line-height: 1.2; font-weight: 700; letter-spacing: -.015em; color: var(--dd-text); }
.dd-phead p { margin: 6px 0 0; color: var(--dd-muted); font-size: 14px; max-width: 68ch; }
.dd-phead-actions { display: flex; gap: 8px; flex-wrap: wrap; }
@media (max-width: 639.98px) { .dd-phead h1 { font-size: 21px; } .dd-phead p { font-size: 13.5px; } }

/* ── Buttons, pills, tags ──────────────────────────────── */
.dd-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 36px; padding: 0 14px; border-radius: 8px;
  border: 1px solid var(--dd-border-strong); background: var(--dd-surface); color: var(--dd-text); font-weight: 600; font-size: 13px;
  cursor: pointer; white-space: nowrap; box-shadow: var(--dd-shadow); transition: background .15s, border-color .15s, color .15s; }
.dd-btn:hover:not(:disabled) { background: var(--dd-surface-2); border-color: var(--dd-faint); }
.dd-btn:disabled { opacity: .55; cursor: not-allowed; }
.dd-btn-sm { height: 30px; padding: 0 10px; font-size: 12.5px; gap: 6px; }
.dd-btn-quiet { border-color: transparent; background: transparent; box-shadow: none; color: var(--dd-muted); }
.dd-btn-quiet:hover:not(:disabled) { background: var(--dd-surface-2); border-color: transparent; color: var(--dd-text); }
.dd-btn-primary { background: var(--dd-accent); border-color: var(--dd-accent); color: var(--dd-on-accent); }
.dd-btn-primary:hover:not(:disabled) { background: var(--dd-accent-strong); border-color: var(--dd-accent-strong); }
.dd-btn-danger { color: var(--dd-bad); border-color: var(--dd-bad-line); }
.dd-btn-danger:hover:not(:disabled) { background: var(--dd-bad-soft); border-color: var(--dd-bad); }
.dd-link { display: inline-flex; align-items: center; gap: 3px; border: 0; background: none; padding: 0; cursor: pointer;
  color: var(--dd-accent-text); font-weight: 600; font-size: inherit; }
.dd-link:hover { text-decoration: underline; }

.dd-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; padding: 2px 9px 2px 7px; border-radius: 999px;
  text-transform: capitalize; border: 1px solid transparent; white-space: nowrap; }
.dd-pill-ok { color: var(--dd-ok); background: var(--dd-ok-soft); border-color: var(--dd-ok-line); }
.dd-pill-warn { color: var(--dd-warn); background: var(--dd-warn-soft); border-color: var(--dd-warn-line); }
.dd-pill-bad { color: var(--dd-bad); background: var(--dd-bad-soft); border-color: var(--dd-bad-line); }
.dd-pill-neutral { color: var(--dd-muted); background: var(--dd-surface-2); border-color: var(--dd-border); }
.dd-tag { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
  letter-spacing: .01em; white-space: nowrap; }
.dd-tag-ok { background: var(--dd-ok-soft); color: var(--dd-ok); }
.dd-tag-warn { background: var(--dd-warn-soft); color: var(--dd-warn); }
.dd-tag-accent { background: var(--dd-accent-soft); color: var(--dd-accent-text); }
.dd-muted-sm { font-size: 12.5px; color: var(--dd-muted); }
.dd-accent-text { color: var(--dd-accent-text); }
.dd-warn-text { color: var(--dd-warn) !important; }

/* ── Cards, callouts, loading ─────────────────────────── */
.dd-card { background: var(--dd-surface); border: 1px solid var(--dd-border); border-radius: 12px; padding: 18px 20px; box-shadow: var(--dd-shadow); min-width: 0; }
.dd-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.dd-card-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 700; color: var(--dd-text); }
.dd-card-title svg { color: var(--dd-muted); }
.dd-card-subtitle { display: flex; align-items: center; gap: 7px; margin: 0 0 4px; font-size: 13.5px; font-weight: 700; }
.dd-card-subtitle svg { color: var(--dd-muted); }
.dd-card-text { margin: 0 0 12px; color: var(--dd-text-2); font-size: 13.5px; }
.dd-divider { height: 1px; background: var(--dd-border); margin: 18px 0 16px; }
.dd-two { display: grid; gap: 16px; margin-top: 16px; }
@media (min-width: 900px) { .dd-two { grid-template-columns: 1fr 1fr; } }
@media (max-width: 639.98px) { .dd-card { padding: 16px; } }

.dd-callout { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 10px; border: 1px solid; margin: 16px 0; font-size: 13.5px; }
.dd-callout > svg { flex: none; margin-top: 1px; }
.dd-callout-warn { background: var(--dd-warn-soft); border-color: var(--dd-warn-line); color: var(--dd-text-2); }
.dd-callout-warn > svg, .dd-callout-warn strong { color: var(--dd-warn); }
.dd-callout-bad { background: var(--dd-bad-soft); border-color: var(--dd-bad-line); color: var(--dd-text-2); }
.dd-callout-bad > svg, .dd-callout-bad strong { color: var(--dd-bad); }

.dd-skeleton { display: grid; gap: 12px; }
.dd-skeleton span { display: block; height: 72px; border-radius: 12px;
  background: linear-gradient(90deg, var(--dd-surface) 0%, var(--dd-surface-2) 50%, var(--dd-surface) 100%); background-size: 200% 100%;
  border: 1px solid var(--dd-border); animation: dd-shimmer 1.4s ease-in-out infinite; }
.dd-skeleton span:first-child { height: 120px; }
@keyframes dd-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
.dd-empty-sm { margin: 0; color: var(--dd-muted); font-size: 13px; }
.dd-note { display: flex; gap: 7px; align-items: flex-start; margin: 14px 0 0; font-size: 12.5px; color: var(--dd-muted); }
.dd-note svg { flex: none; margin-top: 2px; }
.dd-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: var(--dd-muted); }
.dd-section-title { padding: 0; font-size: 15px; font-weight: 700; color: var(--dd-text); }
.dd-section-sub { margin: 2px 0 12px; font-size: 13px; color: var(--dd-muted); }
.dd-subhead { margin: 20px 0 8px; font-size: 12px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--dd-muted); }

/* ── System mode ───────────────────────────────────────── */
.dd-hero { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; padding: 20px 22px; margin-bottom: 28px; border-radius: 14px;
  background: var(--dd-surface); border: 1px solid var(--dd-border); box-shadow: var(--dd-shadow); position: relative; overflow: hidden; }
.dd-hero::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; background: linear-gradient(90deg, #0ea5e9, #6366f1); }
.dd-hero-icon { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; background: var(--dd-accent-soft); color: var(--dd-accent-text); }
.dd-hero-main { min-width: 0; }
.dd-hero-main h2 { margin: 2px 0 4px; font-size: 20px; font-weight: 700; letter-spacing: -.01em; }
.dd-hero-main p { margin: 0; color: var(--dd-text-2); font-size: 13.5px; max-width: 80ch; }
.dd-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.2); }
.dd-facts { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 16px 0 0; padding-top: 16px; border-top: 1px solid var(--dd-border); }
.dd-facts div { min-width: 0; }
.dd-facts dt { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dd-muted); }
.dd-facts dd { margin: 2px 0 0; font-weight: 600; font-size: 14px; color: var(--dd-text); }
@media (max-width: 639.98px) {
  .dd-hero { grid-template-columns: 1fr; padding: 18px 16px; }
  .dd-hero-icon { width: 40px; height: 40px; margin-bottom: 8px; }
  .dd-facts { grid-template-columns: 1fr; gap: 0; }
  .dd-facts div { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--dd-border); }
  .dd-facts div:last-child { border-bottom: 0; padding-bottom: 0; }
  .dd-facts dd { margin: 0; text-align: right; }
}

.dd-fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.dd-fieldset:disabled .dd-mcard { cursor: not-allowed; opacity: .7; }
.dd-mgrid { display: grid; gap: 12px; }
@media (min-width: 720px) { .dd-mgrid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.dd-mcard { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 16px 18px; border-radius: 12px; cursor: pointer;
  background: var(--dd-surface); border: 1px solid var(--dd-border); box-shadow: var(--dd-shadow);
  transition: border-color .15s, box-shadow .15s, background .15s; }
.dd-mcard:hover { border-color: var(--dd-border-strong); }
.dd-mcard:has(input:focus-visible) { outline: 2px solid var(--dd-accent); outline-offset: 2px; }
.dd-mcard.is-selected { border-color: var(--dd-accent); box-shadow: 0 0 0 1px var(--dd-accent), var(--dd-shadow-lg); }
.dd-mcard.is-current:not(.is-selected) { background: var(--dd-surface-2); }
.dd-mcard-head { display: flex; align-items: center; gap: 12px; }
.dd-mcard-icon { flex: none; width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center; background: var(--dd-surface-2);
  color: var(--dd-muted); border: 1px solid var(--dd-border); }
.dd-mcard.is-selected .dd-mcard-icon { background: var(--dd-accent-soft); color: var(--dd-accent-text); border-color: transparent; }
.dd-mcard-title { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dd-mcard-title strong { font-size: 15px; font-weight: 700; }
.dd-radio { flex: none; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--dd-border-strong); background: var(--dd-surface); transition: all .15s; }
.dd-mcard.is-selected .dd-radio { border-color: var(--dd-accent); box-shadow: inset 0 0 0 4px var(--dd-surface), inset 0 0 0 9px var(--dd-accent); }
.dd-mcard-desc { margin: 0; color: var(--dd-text-2); font-size: 13px; line-height: 1.55; }
.dd-chips { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: auto 0 0; padding: 0; }
.dd-chips li { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; color: var(--dd-text-2);
  padding: 3px 9px; border-radius: 6px; background: var(--dd-surface-2); border: 1px solid var(--dd-border); }
.dd-chips svg { color: var(--dd-muted); }
.dd-mcard.is-current:not(.is-selected) .dd-chips li { background: var(--dd-surface); }

.dd-review { margin-top: 24px; padding: 20px 22px; border-radius: 14px; background: var(--dd-surface); border: 1px solid var(--dd-accent);
  box-shadow: 0 0 0 4px var(--dd-accent-soft), var(--dd-shadow-lg); scroll-margin: 120px 0 96px; animation: dd-rise .2s ease-out; }
@keyframes dd-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.dd-review-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 4px 0 0; font-size: 19px; font-weight: 700; }
.dd-review-title svg { color: var(--dd-muted); }
.dd-impact { list-style: none; padding: 0; margin: 16px 0 0; display: grid; gap: 1px; background: var(--dd-border);
  border: 1px solid var(--dd-border); border-radius: 10px; overflow: hidden; }
.dd-impact li { display: grid; grid-template-columns: 150px 1fr; gap: 12px; padding: 11px 14px; background: var(--dd-surface); font-size: 13.5px; color: var(--dd-text-2); }
.dd-impact b { color: var(--dd-text); font-weight: 600; }
.dd-impact-k { font-weight: 600; color: var(--dd-muted); font-size: 12.5px; padding-top: 1px; }
.dd-diff { border: 1px solid var(--dd-border); border-radius: 10px; overflow: hidden; }
.dd-diff-row { display: grid; grid-template-columns: minmax(130px, 1fr) minmax(0, 1fr) minmax(0, 1.2fr); gap: 12px; align-items: center;
  padding: 9px 14px; border-top: 1px solid var(--dd-border); font-size: 13.5px; }
.dd-diff-row:first-child { border-top: 0; }
.dd-diff-th { background: var(--dd-surface-2); font-size: 11.5px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--dd-muted); }
.dd-diff-concept { color: var(--dd-muted); font-size: 13px; }
.dd-diff-from { color: var(--dd-text-2); }
.dd-diff-to { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: var(--dd-text-2); }
.dd-diff-arrow { color: var(--dd-faint); display: none; }
.dd-diff-same { font-size: 11px; color: var(--dd-faint); }
.dd-diff-row.is-changed { background: var(--dd-accent-soft); }
.dd-diff-row.is-changed .dd-diff-from { text-decoration: line-through; text-decoration-color: var(--dd-faint); color: var(--dd-muted); }
.dd-diff-row.is-changed .dd-diff-to { color: var(--dd-accent-text); font-weight: 700; }
.dd-diff-row:not(.is-changed):not(.dd-diff-th) { color: var(--dd-muted); }
.dd-review-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: 18px;
  padding-top: 18px; border-top: 1px solid var(--dd-border); }
.dd-check { display: flex; align-items: flex-start; gap: 10px; flex: 1 1 320px; cursor: pointer; font-size: 13.5px; color: var(--dd-text-2); }
.dd-check input { flex: none; width: 18px; height: 18px; margin: 1px 0 0; accent-color: var(--dd-accent); cursor: pointer; }
.dd-review-actions { display: flex; gap: 8px; flex-wrap: wrap; }
@media (max-width: 639.98px) {
  .dd-review { padding: 18px 16px; margin-left: -4px; margin-right: -4px; }
  .dd-review-title { font-size: 17px; }
  .dd-impact li { grid-template-columns: 1fr; gap: 2px; }
  .dd-diff-th { display: none; }
  .dd-diff-row { grid-template-columns: auto 1fr; gap: 2px 10px; padding: 10px 12px; }
  .dd-diff-row:nth-child(2) { border-top: 0; }
  .dd-diff-concept { grid-column: 1 / -1; font-size: 11.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .dd-diff-arrow { display: inline; }
  .dd-review-actions { width: 100%; flex-direction: column-reverse; }
  .dd-review-actions .dd-btn { width: 100%; height: 44px; }
}

.dd-terms { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); gap: 0 24px; margin: 0; }
.dd-terms div { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px dashed var(--dd-border); min-width: 0; }
.dd-terms dt { color: var(--dd-muted); font-size: 13px; }
.dd-terms dd { margin: 0; font-weight: 600; text-align: right; }
.dd-mgrid + .dd-card, .dd-fieldset + .dd-card { margin-top: 24px; }

/* ── Health ────────────────────────────────────────────── */
.dd-banner { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 16px 20px; border-radius: 12px; border: 1px solid; }
.dd-banner-ok { background: var(--dd-ok-soft); border-color: var(--dd-ok-line); }
.dd-banner-warn { background: var(--dd-warn-soft); border-color: var(--dd-warn-line); }
.dd-banner-bad { background: var(--dd-bad-soft); border-color: var(--dd-bad-line); }
.dd-banner-neutral { background: var(--dd-surface); border-color: var(--dd-border); }
.dd-pulse { position: relative; flex: none; width: 12px; height: 12px; border-radius: 50%; background: var(--dd-faint); }
.dd-pulse.dd-tone-ok { background: #10b981; } .dd-pulse.dd-tone-warn { background: #f59e0b; } .dd-pulse.dd-tone-bad { background: #ef4444; }
.dd-pulse::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: inherit; animation: dd-ping 2s cubic-bezier(0,0,.2,1) infinite; }
@keyframes dd-ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
.dd-banner-main { display: flex; flex-direction: column; min-width: 0; flex: 1 1 220px; }
.dd-banner-main strong { font-size: 16px; font-weight: 700; color: var(--dd-text); }
.dd-banner-main span { font-size: 12.5px; color: var(--dd-muted); }
.dd-banner-meta { display: flex; gap: 22px; margin: 0; flex-wrap: wrap; }
.dd-banner-meta dt { font-size: 11px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; color: var(--dd-muted); }
.dd-banner-meta dd { margin: 0; font-size: 13px; font-weight: 600; color: var(--dd-text); }
@media (max-width: 639.98px) {
  .dd-banner { padding: 14px 16px; }
  .dd-banner-meta { flex-basis: 100%; gap: 16px; padding-top: 10px; border-top: 1px solid rgba(127,127,127,.18); }
}
.dd-problems { margin: 6px 0 0; padding-left: 18px; }
.dd-problems li { margin: 2px 0; }

.dd-metrics { display: grid; gap: 12px; margin-top: 16px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); }
@media (min-width: 1100px) { .dd-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 479.98px) { .dd-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } }
.dd-metric { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 16px 18px; border-radius: 12px; background: var(--dd-surface);
  border: 1px solid var(--dd-border); box-shadow: var(--dd-shadow); position: relative; }
.dd-metric::before { content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 3px; border-radius: 0 3px 3px 0; background: transparent; }
.dd-metric-warn::before { background: #f59e0b; } .dd-metric-bad::before { background: #ef4444; }
.dd-metric-label { display: flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--dd-muted); }
.dd-metric-value { font-size: 22px; font-weight: 700; letter-spacing: -.01em; line-height: 1.2; color: var(--dd-text); font-variant-numeric: tabular-nums; min-height: 27px; display: flex; align-items: center; }
.dd-metric-value .dd-pill { font-size: 12.5px; }
.dd-metric-warn .dd-metric-value { color: var(--dd-warn); } .dd-metric-bad .dd-metric-value { color: var(--dd-bad); }
.dd-metric-foot { font-size: 12.5px; color: var(--dd-muted); min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
@media (max-width: 479.98px) {
  .dd-metric { padding: 13px 14px; }
  .dd-metric-value { font-size: 18px; }
  .dd-metric-foot { font-size: 12px; }
}
.dd-meter { height: 6px; border-radius: 999px; background: var(--dd-surface-2); border: 1px solid var(--dd-border); overflow: hidden; }
.dd-meter-fill { display: block; height: 100%; border-radius: inherit; background: var(--dd-accent); transition: width .4s ease; }
.dd-meter-fill.dd-tone-ok { background: #10b981; } .dd-meter-fill.dd-tone-warn { background: #f59e0b; } .dd-meter-fill.dd-tone-bad { background: #ef4444; }

.dd-jobs { list-style: none; margin: 0; padding: 0; }
.dd-jobs li { display: flex; align-items: center; gap: 8px 14px; flex-wrap: wrap; padding: 10px 0; border-top: 1px solid var(--dd-border); }
.dd-jobs li:first-child { border-top: 0; padding-top: 0; }
.dd-jobs-name { flex: 1 1 160px; min-width: 0; word-break: break-all; color: var(--dd-text); }
.dd-jobs-when { font-size: 12.5px; color: var(--dd-muted); white-space: nowrap; }
.dd-recipients { list-style: none; margin: 0 0 14px; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.dd-recipients li { padding: 3px 9px; border-radius: 6px; background: var(--dd-surface-2); border: 1px solid var(--dd-border); font-size: 12px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
.dd-codeline { display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 12px; border-radius: 8px; background: var(--dd-surface-2); border: 1px solid var(--dd-border); }
.dd-codeline code { flex: 1; background: none; border: 0; padding: 0; font-size: 12.5px; }

/* ── Errors ────────────────────────────────────────────── */
.dd-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.dd-seg { display: inline-flex; padding: 3px; border-radius: 9px; background: var(--dd-surface-2); border: 1px solid var(--dd-border); }
.dd-seg button { height: 30px; padding: 0 14px; border: 0; border-radius: 6px; background: none; cursor: pointer; font-weight: 600; font-size: 13px; color: var(--dd-muted); }
.dd-seg button.on { background: var(--dd-surface); color: var(--dd-text); box-shadow: var(--dd-shadow); }
.dd-search { flex: 1 1 240px; display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 10px 0 12px; border-radius: 9px;
  background: var(--dd-surface); border: 1px solid var(--dd-border-strong); color: var(--dd-faint); min-width: 0; }
.dd-search:focus-within { border-color: var(--dd-accent); box-shadow: 0 0 0 3px var(--dd-accent-soft); }
.dd-search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; color: var(--dd-text); font-size: 13.5px; height: 100%; }
.dd-search input::-webkit-search-cancel-button { display: none; }
.dd-search button { border: 0; background: none; color: var(--dd-muted); cursor: pointer; display: grid; place-items: center; padding: 4px; }
.dd-select { height: 38px; padding: 0 32px 0 12px; border-radius: 9px; border: 1px solid var(--dd-border-strong); background: var(--dd-surface); color: var(--dd-text); font-size: 13.5px; cursor: pointer; }
@media (max-width: 639.98px) {
  .dd-seg { width: 100%; } .dd-seg button { flex: 1; height: 34px; }
  .dd-search { flex-basis: 100%; height: 42px; }
  .dd-select { width: 100%; height: 42px; }
}
.dd-count-line { display: flex; align-items: center; gap: 8px; margin: 0 0 10px; font-size: 12.5px; color: var(--dd-muted); }
.dd-emptystate { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 48px 20px; border-radius: 12px;
  background: var(--dd-surface); border: 1px dashed var(--dd-border-strong); color: var(--dd-muted); }
.dd-emptystate svg { color: var(--dd-ok); margin-bottom: 4px; }
.dd-emptystate strong { color: var(--dd-text); font-size: 15px; }
.dd-errs { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.dd-err { position: relative; padding: 14px 16px 12px 18px; border-radius: 12px; background: var(--dd-surface); border: 1px solid var(--dd-border);
  box-shadow: var(--dd-shadow); overflow: hidden; min-width: 0; }
.dd-err::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #ef4444; }
.dd-err-background::before { background: #8b5cf6; } .dd-err-browser::before { background: #0ea5e9; }
.dd-err.is-resolved::before { background: #10b981; }
.dd-err.is-resolved .dd-err-loc, .dd-err.is-resolved .dd-err-msg { opacity: .7; }
.dd-err-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dd-err-tags { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.dd-src { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 5px; font-size: 11px; font-weight: 700; text-transform: capitalize; letter-spacing: .01em; }
.dd-src-server { background: var(--dd-bad-soft); color: var(--dd-bad); }
.dd-src-background { background: var(--dd-violet-soft); color: var(--dd-violet); }
.dd-src-browser { background: var(--dd-accent-soft); color: var(--dd-accent-text); }
.dd-src-http { background: var(--dd-surface-2); color: var(--dd-text-2); border: 1px solid var(--dd-border); font-family: var(--dd-mono); text-transform: none; }
.dd-err-count { flex: none; font-weight: 700; font-size: 13px; color: var(--dd-bad); font-variant-numeric: tabular-nums; }
.dd-err.is-resolved .dd-err-count { color: var(--dd-muted); }
.dd-err-loc { margin: 8px 0 2px; font-weight: 600; color: var(--dd-text); word-break: break-all; }
.dd-err-msg { margin: 0; font-size: 13.5px; color: var(--dd-text-2); word-break: break-word; }
.dd-err-msg.is-clamped { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.dd-err-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px 12px; flex-wrap: wrap; margin-top: 10px; }
.dd-err-meta { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: var(--dd-muted); min-width: 0; }
.dd-err-actions { display: flex; gap: 6px; margin-left: auto; }
.dd-chev { transition: transform .15s; } .dd-chev.is-open { transform: rotate(180deg); }
.dd-err-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--dd-border); }
.dd-kv { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 8px 16px; margin: 0 0 12px; }
.dd-kv dt { font-size: 11.5px; color: var(--dd-muted); font-weight: 600; }
.dd-kv dd { margin: 0; font-size: 13px; word-break: break-all; }
@media (max-width: 639.98px) {
  .dd-err { padding: 13px 14px 12px 16px; }
  .dd-err-actions { width: 100%; margin-left: 0; }
  .dd-err-actions .dd-btn { flex: 1; height: 36px; }
  .dd-err-actions .dd-btn-quiet { border: 1px solid var(--dd-border); }
}
.dd-stack-wrap { border-radius: 10px; overflow: hidden; border: 1px solid #1e293b; background: #0b1220; }
.dd-stack-bar { display: flex; align-items: center; justify-content: space-between; padding: 4px 6px 4px 12px; background: #111a2b;
  border-bottom: 1px solid #1e293b; font-size: 11.5px; font-weight: 600; color: #94a3b8; }
.dd-stack-bar .dd-btn-quiet { color: #cbd5e1; } .dd-stack-bar .dd-btn-quiet:hover { background: #1e293b; color: #fff; }
.dd-stack { margin: 0; padding: 12px 14px; max-height: 380px; overflow: auto; font-family: var(--dd-mono); font-size: 12px; line-height: 1.6;
  color: #e2e8f0; white-space: pre; tab-size: 2; }

/* ── Developers ────────────────────────────────────────── */
.dd-people { list-style: none; margin: 0; padding: 0; }
.dd-people li { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--dd-border); min-width: 0; }
.dd-people li:first-child { border-top: 0; padding-top: 0; }
.dd-avatar { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 700;
  background: var(--dd-accent-soft); color: var(--dd-accent-text); }
.dd-people-text { display: flex; flex-direction: column; min-width: 0; }
.dd-people-text strong { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; }
.dd-people-text .dd-mono { color: var(--dd-muted); font-size: 12px; }

@media (prefers-reduced-motion: reduce) {
  .dd-shell *, .dd-shell *::before, .dd-shell *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
`;
