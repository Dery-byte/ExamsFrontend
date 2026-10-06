/** Styles for the Super Admin Fees pages (dark shell, violet accents — same family as Configuration). */
export const FEE_ADMIN_CSS = `
.fe { color: #fff; padding-bottom: 40px; container: fe / inline-size; }
.fe-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.fe-title { display: flex; align-items: center; gap: 14px; min-width: 0; }
.fe-logo { width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0; background: linear-gradient(135deg,#7c3aed,#4f46e5); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 30px rgba(124,58,237,0.4); }
.fe-h1 { margin: 0; font-size: 26px; font-weight: 800; background: linear-gradient(135deg,#a78bfa,#818cf8); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.fe-sub { margin: 2px 0 0; font-size: 13px; color: rgba(255,255,255,0.45); }
.fe-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.fe-input, .fe-select { height: 38px; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; color: #fff; padding: 0 12px; font: inherit; font-size: 13px; transition: border-color .15s, box-shadow .15s; }
.fe-input::placeholder { color: rgba(255,255,255,0.3); }
.fe-select option { background: #1a1a35; color: #fff; }
.fe-input:focus, .fe-select:focus, .fe-textarea:focus { outline: none; border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,0.25); }
.fe-input[type="date"] { color-scheme: dark; }
.fe-textarea { width: 100%; box-sizing: border-box; min-height: 70px; resize: vertical; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; color: #fff; padding: 10px 12px; font: inherit; font-size: 13px; }

.fe-btn { height: 38px; padding: 0 16px; border-radius: 10px; border: none; background: linear-gradient(135deg,#7c3aed,#4f46e5); color: #fff; font-weight: 700; font-size: 13px; display: inline-flex; gap: 8px; align-items: center; justify-content: center; cursor: pointer; white-space: nowrap; box-shadow: 0 6px 20px rgba(124,58,237,0.35); transition: transform .15s, box-shadow .15s, opacity .15s; }
.fe-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(124,58,237,0.45); }
.fe-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.fe-btn.sm, .fe-ghost.sm { height: 32px; padding: 0 12px; font-size: 12px; border-radius: 8px; }
.fe-ghost { height: 38px; padding: 0 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); font-weight: 600; font-size: 13px; display: inline-flex; gap: 8px; align-items: center; justify-content: center; cursor: pointer; white-space: nowrap; transition: background .15s, border-color .15s; }
.fe-ghost:hover:not(:disabled) { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.2); }
.fe-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.fe-icon-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: background .15s, color .15s; }
.fe-icon-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; }
.fe-icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.fe-icon-btn.danger { color: #f87171; border-color: rgba(239,68,68,0.25); background: rgba(239,68,68,0.08); }
.fe-icon-btn.danger:hover:not(:disabled) { background: rgba(239,68,68,0.18); color: #fca5a5; }
.fe-link { background: none; border: none; padding: 0; color: #a78bfa; font: inherit; font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }

.fe-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
.fe-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; border: 1px solid; }
.fe-chip.ok { color: #34d399; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); }
.fe-chip.warn { color: #fbbf24; background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.3); }
.fe-chip.off { color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
.fe-chip a { color: inherit; }

.fe-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-bottom: 20px; }
.fe-kpi { position: relative; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid rgba(139,92,246,0.15); border-radius: 16px; padding: 18px 20px; }
.fe-kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,0.45); font-weight: 700; padding-right: 44px; }
.fe-kpi-value { font-size: 24px; font-weight: 800; margin-top: 8px; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; overflow-wrap: anywhere; }
.fe-kpi-foot { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 8px; }
.fe-kpi-ico { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.fe-bar { height: 6px; border-radius: 6px; background: rgba(255,255,255,0.08); overflow: hidden; }
.fe-bar > span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg,#10b981,#34d399); transition: width .4s ease; }

.fe-tabs { display: inline-flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; margin-bottom: 16px; }
.fe-tab { padding: 8px 16px; border-radius: 9px; border: none; background: transparent; color: rgba(255,255,255,0.6); font-weight: 700; font-size: 13px; cursor: pointer; display: inline-flex; gap: 8px; align-items: center; }
.fe-tab:hover { color: #fff; }
.fe-tab.active { background: linear-gradient(135deg,rgba(124,58,237,0.35),rgba(79,70,229,0.25)); color: #fff; box-shadow: inset 0 0 0 1px rgba(139,92,246,0.4); }

.fe-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
.fe-search { position: relative; flex: 1 1 240px; min-width: 0; }
.fe-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: rgba(255,255,255,0.35); pointer-events: none; }
.fe-search .fe-input { width: 100%; padding-left: 36px; }
.fe-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.7); cursor: pointer; user-select: none; }
.fe-toggle input { accent-color: #8b5cf6; width: 15px; height: 15px; }

.fe-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(139,92,246,0.15); border-radius: 16px; overflow: hidden; margin-bottom: 16px; }
.fe-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; }
.fe-prog { display: flex; align-items: center; gap: 12px; min-width: 0; }
.fe-prog-ico { width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0; background: rgba(14,165,233,0.12); border: 1px solid rgba(14,165,233,0.25); color: #38bdf8; display: flex; align-items: center; justify-content: center; }
.fe-prog-name { font-weight: 700; font-size: 15px; }
.fe-prog-meta { font-size: 12px; color: rgba(255,255,255,0.45); margin-top: 2px; }
.fe-code { font-weight: 800; color: #38bdf8; }
.fe-tag { font-size: 10px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
.fe-tag.off { color: #f87171; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); }
.fe-tag.done { color: #34d399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); }
.fe-tag.part { color: #fbbf24; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.3); }

.fe-table-wrap { overflow-x: auto; }
.fe-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
.fe-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: rgba(255,255,255,0.4); font-weight: 700; padding: 10px 18px; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: nowrap; }
.fe-table td { padding: 12px 18px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
.fe-table tbody tr:last-child td { border-bottom: none; }
.fe-table tbody tr:hover td { background: rgba(255,255,255,0.02); }
.fe-num { text-align: right !important; font-variant-numeric: tabular-nums; white-space: nowrap; }
.fe-strong { font-weight: 700; }
.fe-muted { color: rgba(255,255,255,0.45); }
.fe-small { font-size: 11.5px; }
.fe-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; letter-spacing: .02em; }
.fe-unset { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 8px; border: 1px dashed rgba(255,255,255,0.18); color: rgba(255,255,255,0.45); font-size: 12px; }
.fe-items-preview { display: flex; flex-wrap: wrap; gap: 4px; max-width: 320px; }
.fe-mini { font-size: 11px; padding: 2px 8px; border-radius: 6px; background: rgba(139,92,246,0.12); color: #c4b5fd; white-space: nowrap; }
.fe-row-actions { display: flex; gap: 6px; justify-content: flex-end; }
.fe-collected { min-width: 130px; }
.fe-collected .fe-bar { margin-top: 6px; height: 4px; }

.fe-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; letter-spacing: .03em; padding: 3px 9px; border-radius: 999px; border: 1px solid; white-space: nowrap; text-transform: uppercase; }
.fe-pill.SUCCESS { color: #34d399; background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.3); }
.fe-pill.PENDING { color: #fbbf24; background: rgba(251,191,36,0.1); border-color: rgba(251,191,36,0.3); }
.fe-pill.FAILED { color: #f87171; background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); }
.fe-pill.ABANDONED, .fe-pill.VOIDED { color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.15); }

.fe-empty { text-align: center; padding: 48px 20px; color: rgba(255,255,255,0.45); }
.fe-empty h3 { margin: 12px 0 6px; color: #fff; font-size: 16px; }
.fe-empty p { margin: 0 auto; max-width: 440px; font-size: 13px; line-height: 1.55; }
.fe-pager { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 18px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 12.5px; color: rgba(255,255,255,0.5); flex-wrap: wrap; }

.fe-overlay { position: fixed; inset: 0; height: 100vh; height: 100dvh; box-sizing: border-box; overscroll-behavior: contain; font-family: Inter, sans-serif; background: rgba(5,5,15,0.72); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: center; justify-content: center; padding: 16px; animation: fe-fade .15s ease-out; }
.fe-modal { width: 100%; max-width: 640px; max-height: 100%; display: flex; flex-direction: column; background: linear-gradient(180deg,#191934,#131329); border: 1px solid rgba(139,92,246,0.28); border-radius: 18px; box-shadow: 0 30px 80px rgba(0,0,0,0.6); color: #fff; animation: fe-pop .18s ease-out; }
.fe-modal.narrow { max-width: 480px; }
.fe-modal-head { padding: 18px 22px 16px; border-bottom: 1px solid rgba(255,255,255,0.07); display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.fe-modal-head h2 { margin: 0; font-size: 17px; font-weight: 800; }
.fe-modal-head p { margin: 4px 0 0; font-size: 12.5px; color: rgba(255,255,255,0.5); }
.fe-modal-body { padding: 18px 22px; overflow-y: auto; overscroll-behavior: contain; flex: 1 1 auto; min-height: 0; }
.fe-modal-foot { padding: 14px 22px; border-top: 1px solid rgba(255,255,255,0.07); display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.fe-label { display: block; font-size: 12px; font-weight: 700; color: rgba(255,255,255,0.7); margin-bottom: 6px; }
.fe-hint { font-size: 11.5px; color: rgba(255,255,255,0.4); margin-top: 6px; line-height: 1.45; }
.fe-field { margin-bottom: 16px; }
.fe-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.fe-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; padding: 4px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
.fe-seg button { border: none; background: transparent; color: rgba(255,255,255,0.6); padding: 10px 12px; border-radius: 9px; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; }
.fe-seg button small { font-weight: 500; font-size: 11.5px; color: rgba(255,255,255,0.4); }
.fe-seg button.active { background: linear-gradient(135deg,rgba(124,58,237,0.35),rgba(79,70,229,0.25)); color: #fff; box-shadow: inset 0 0 0 1px rgba(139,92,246,0.45); }
.fe-seg button.active small { color: rgba(255,255,255,0.65); }

.fe-money { position: relative; }
.fe-money > span { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-weight: 700; color: rgba(255,255,255,0.45); font-size: 12px; pointer-events: none; }
.fe-money .fe-input { width: 100%; padding-left: 46px; font-variant-numeric: tabular-nums; }
.fe-money.lg .fe-input { height: 48px; font-size: 20px; font-weight: 800; }

.fe-items { display: flex; flex-direction: column; gap: 8px; }
.fe-item { display: grid; grid-template-columns: 28px minmax(0,1fr) 150px 32px; gap: 8px; align-items: center; }
.fe-order { display: flex; flex-direction: column; }
.fe-order button { background: none; border: none; color: rgba(255,255,255,0.35); cursor: pointer; padding: 0; height: 15px; display: flex; align-items: center; justify-content: center; }
.fe-order button:hover:not(:disabled) { color: #fff; }
.fe-order button:disabled { opacity: .25; cursor: default; }
.fe-suggest { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.fe-suggest button { border: 1px dashed rgba(139,92,246,0.4); background: rgba(139,92,246,0.06); color: #c4b5fd; font: inherit; font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 999px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.fe-suggest button:hover { background: rgba(139,92,246,0.16); }
.fe-total { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; background: rgba(124,58,237,0.12); border: 1px solid rgba(139,92,246,0.3); margin-top: 14px; font-weight: 800; }
.fe-total strong { font-size: 18px; font-variant-numeric: tabular-nums; }
.fe-checks { display: flex; flex-wrap: wrap; gap: 8px; }
.fe-check { display: inline-flex; gap: 8px; align-items: center; padding: 7px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); cursor: pointer; font-size: 13px; color: rgba(255,255,255,0.75); user-select: none; }
.fe-check input { accent-color: #8b5cf6; }
.fe-check.on { border-color: rgba(139,92,246,0.7); background: rgba(139,92,246,0.15); color: #fff; }
.fe-note { display: flex; gap: 10px; padding: 10px 12px; border-radius: 10px; font-size: 12.5px; line-height: 1.5; margin-bottom: 16px; }
.fe-note.warn { background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.25); color: #fcd34d; }
.fe-note.info { background: rgba(56,189,248,0.07); border: 1px solid rgba(56,189,248,0.22); color: #7dd3fc; }
.fe-note svg { flex-shrink: 0; margin-top: 1px; }

.fe-results { margin-top: 6px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; max-height: 240px; overflow-y: auto; }
.fe-result { width: 100%; text-align: left; display: flex; justify-content: space-between; gap: 12px; padding: 10px 12px; border: none; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); color: #fff; font: inherit; cursor: pointer; }
.fe-result:last-child { border-bottom: none; }
.fe-result:hover, .fe-result:focus { background: rgba(139,92,246,0.12); outline: none; }
.fe-picked { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(139,92,246,0.35); background: rgba(139,92,246,0.08); }

.fe-skel { background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.08), rgba(255,255,255,0.03)); background-size: 200% 100%; animation: fe-shimmer 1.4s infinite linear; border-radius: 14px; }
.fe-spin { animation: fe-spin 1s linear infinite; }
@keyframes fe-spin { to { transform: rotate(360deg); } }
@keyframes fe-fade { from { opacity: 0; } }
@keyframes fe-pop { from { opacity: 0; transform: translateY(8px) scale(.98); } }
@keyframes fe-shimmer { to { background-position: -200% 0; } }

.fe-select.prog { max-width: 220px; }
.fe-table.pay { min-width: 900px; }
.fe-table.hold { min-width: 640px; }
.fe-switch-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 22px; margin-bottom: 14px; overflow: visible; }
.fe-switch-text { display: flex; align-items: center; gap: 14px; min-width: 0; }
.fe-switch-ico { width: 42px; height: 42px; border-radius: 12px; background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.25); display: flex; align-items: center; justify-content: center; color: #fbbf24; flex-shrink: 0; }
.fe-foot-actions { display: flex; gap: 8px; }
.fe-modal-foot > span:empty { display: none; }
.fe-modal-foot > span:empty + .fe-foot-actions { margin-left: auto; }

/* Tables become cards once the content area is too narrow for every column (sized by the page, not the window,
   so the desktop sidebar is accounted for). Browsers without container queries keep the scrolling table. */
@container fe (max-width: 760px) {
  .fe-stack.sched { min-width: 0; }
  .fe-stack.sched thead { display: none; }
  .fe-stack.sched, .fe-stack.sched tbody { display: block; }
  .fe-stack.sched tbody { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); gap: 10px; padding: 12px; }
  .fe-stack.sched tr { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 12px 14px; padding: 14px; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; background: rgba(255,255,255,0.02); }
  .fe-stack.sched td { display: block; padding: 0; border: none !important; background: none !important; text-align: left !important; min-width: 0; }
  .fe-stack.sched td[data-label]::before { content: attr(data-label); display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
  .fe-stack.sched .fe-c-title { order: -2; align-self: center; font-size: 15px; }
  .fe-stack.sched .fe-c-actions { order: -1; align-self: center; }
  .fe-stack.sched .fe-c-full { grid-column: 1 / -1; }
  .fe-stack.sched .fe-collected { min-width: 0; }
  .fe-stack.sched .fe-items-preview { max-width: none; }
}
@container fe (max-width: 900px) {
  .fe-stack.pay { min-width: 0; }
  .fe-stack.pay thead { display: none; }
  .fe-stack.pay, .fe-stack.pay tbody { display: block; }
  .fe-stack.pay tbody { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 10px; padding: 12px; }
  .fe-stack.pay tr { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px 14px; padding: 14px; border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; background: rgba(255,255,255,0.02); align-content: start; }
  .fe-stack.pay td { display: block; padding: 0; border: none !important; background: none !important; min-width: 0; white-space: normal !important; }
  .fe-stack.pay td[data-label]::before { content: attr(data-label); display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 3px; }
  .fe-stack.pay .fe-c-title { order: 1; }
  .fe-stack.pay .fe-c-amount { order: 2; text-align: right !important; }
  .fe-stack.pay .fe-c-amount .fe-strong { white-space: nowrap; font-size: 15px; }
  .fe-stack.pay .fe-c-status { order: 3; }
  .fe-stack.pay .fe-c-date { order: 4; text-align: right; }
  .fe-stack.pay .fe-c-date > div { display: inline; }
  .fe-stack.pay .fe-c-date > div + div::before { content: ' · '; }
  .fe-stack.pay .fe-c-prog { order: 5; }
  .fe-stack.pay .fe-c-method { order: 6; text-align: right; }
  .fe-stack.pay .fe-c-ref { order: 7; grid-column: 1 / -1; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06) !important; overflow-wrap: anywhere; }
  .fe-stack.pay .fe-c-actions { order: 8; grid-column: 1 / -1; }
  .fe-stack.pay .fe-c-actions .fe-row-actions { justify-content: flex-start; }
  .fe-stack.pay .fe-c-actions:not(:has(button)) { display: none; }
}
@container fe (max-width: 640px) {
  .fe-stack.hold { min-width: 0; }
  .fe-stack.hold thead { display: none; }
  .fe-stack.hold, .fe-stack.hold tbody { display: block; }
  .fe-stack.hold tr { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 10px 14px; padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .fe-stack.hold tr:last-child { border-bottom: none; }
  .fe-stack.hold td { display: block; padding: 0; border: none !important; background: none !important; min-width: 0; }
  .fe-stack.hold td[data-label]::before { content: attr(data-label); display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 3px; }
  .fe-stack.hold .fe-c-title { grid-column: 1 / -1; }
  .fe-stack.hold .fe-c-actions { grid-column: 1 / -1; }
  .fe-stack.hold .fe-c-actions .fe-row-actions { justify-content: flex-start; }
}
@container fe (max-width: 560px) {
  .fe-switch-row { align-items: flex-start; padding: 16px; gap: 12px; }
  .fe-switch-ico { width: 38px; height: 38px; border-radius: 10px; }
  .fe-head { margin-bottom: 14px; }
  .fe-logo { width: 42px; height: 42px; border-radius: 12px; }
  .fe-h1 { font-size: 21px; }
  .fe-actions { width: 100%; }
  .fe-actions .fe-select { flex: 1 1 0; min-width: 0; }
  .fe-chips { gap: 6px; margin-bottom: 14px; }
  .fe-chip { font-size: 11.5px; padding: 5px 10px; }
  .fe-kpis { gap: 10px; margin-bottom: 16px; }
  .fe-kpi { padding: 14px 16px; border-radius: 14px; }
  .fe-kpi-value { font-size: 21px; }
  .fe-tabs { display: flex; width: 100%; box-sizing: border-box; }
  .fe-tab { flex: 1; justify-content: center; padding: 9px 10px; }
  .fe-toolbar .fe-search { flex-basis: 100%; }
  .fe-toolbar .fe-select { flex: 1 1 140px; min-width: 0; max-width: none; }
  .fe-toolbar .fe-btn { flex: 1 1 auto; }
  .fe-card-head { padding: 12px 14px; }
  .fe-pager { padding: 12px 14px; }
  .fe-pager > span { flex-basis: 100%; text-align: center; }
  .fe-pager > div { margin: 0 auto; }
}

/* Dialogs live on <body>, so these follow the window */
@media (max-width: 640px) {
  .fe-overlay { align-items: flex-end; padding: 0; }
  .fe-modal, .fe-modal.narrow { max-width: none; max-height: 92vh; max-height: 92dvh; border-radius: 20px 20px 0 0; border-bottom: none; animation: fe-sheet .22s ease-out; }
  .fe-modal::before { content: ''; display: block; width: 38px; height: 4px; border-radius: 4px; background: rgba(255,255,255,0.2); margin: 8px auto 0; flex-shrink: 0; }
  .fe-modal-head { padding-top: 12px; }
  .fe-modal-foot { padding-bottom: calc(14px + env(safe-area-inset-bottom)); }
  .fe-modal-head, .fe-modal-body, .fe-modal-foot { padding-left: 16px; padding-right: 16px; }
  .fe-modal-foot > :not(.fe-foot-actions) { flex-basis: 100%; }
  .fe-foot-actions { flex: 1 1 100%; }
  .fe-foot-actions > button { flex: 1 1 0; min-width: 0; }
  .fe-grid2 { grid-template-columns: 1fr; gap: 0; }
  .fe-item { grid-template-columns: minmax(0,1fr) 116px 36px; }
  .fe-item .fe-order { display: none; }
  .fe-check { padding: 9px 12px; }
  /* 16px stops iOS Safari zooming into a field when it gets focus */
  .fe-input, .fe-select, .fe-textarea { font-size: 16px; }
}
@media (max-width: 400px) {
  .fe-seg { grid-template-columns: 1fr; }
  .fe-switch-ico { display: none; }
}
/* Bigger hit areas on touch screens */
@media (pointer: coarse) {
  .fe-icon-btn { width: 40px; height: 40px; }
  .fe-btn.sm, .fe-ghost.sm { height: 38px; padding: 0 14px; }
  .fe-input, .fe-select, .fe-btn, .fe-ghost { height: 44px; }
  .fe-money.lg .fe-input { height: 52px; }
  .fe-order button { height: 20px; width: 28px; }
  .fe-item { grid-template-columns: 28px minmax(0,1fr) 150px 40px; }
}
@media (pointer: coarse) and (max-width: 640px) {
  .fe-item { grid-template-columns: minmax(0,1fr) 116px 40px; }
}
@media (prefers-reduced-motion: reduce) {
  .fe *:not(.fe-spin), .fe-overlay, .fe-modal { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
@keyframes fe-sheet { from { transform: translateY(100%); } }
`;
