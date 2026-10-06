/** Styles for the student Fees page and dashboard card (light portal theme). */
export const STUDENT_FEE_CSS = `
.sf { --sf-ink: #2a3142; --sf-muted: #74788d; --sf-line: #eef0f4; --sf-paid: #0f9d6e; --sf-warn: #c47f0b; --sf-bad: #d63a55; padding-bottom: 12px; }
.sf-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 20px; align-items: start; }
.sf-col { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.sf-card { background: #fff; border: 1px solid #e9ecf2; border-radius: 16px; box-shadow: 0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.04); overflow: hidden; }
.sf-card-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--sf-line); }
.sf-card-head h3 { margin: 0; font-size: 15px; font-weight: 800; color: var(--sf-ink); display: flex; align-items: center; gap: 8px; }
.sf-card-body { padding: 18px 20px; }

.sf-hero { position: relative; overflow: hidden; border-radius: 18px; color: #fff; padding: 24px; background: radial-gradient(120% 140% at 100% 0%, #9b8fe0 0%, #7a6fbe 45%, #5a4fa3 100%); box-shadow: 0 18px 40px rgba(90,79,163,0.28); }
.sf-hero::before, .sf-hero::after { content: ''; position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); pointer-events: none; }
.sf-hero::before { width: 240px; height: 240px; top: -110px; right: -70px; }
.sf-hero::after { width: 120px; height: 120px; bottom: -50px; right: 140px; background: rgba(255,255,255,0.05); }
.sf-hero > * { position: relative; z-index: 1; }
.sf-hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.sf-hero-class { font-size: 13px; opacity: 0.85; font-weight: 600; }
.sf-session { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; padding: 5px 10px; border-radius: 999px; background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.22); }
.sf-balance-label { margin-top: 18px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; opacity: 0.8; }
.sf-balance { font-size: 38px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; margin-top: 4px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.sf-hero-stats { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; margin-top: 20px; }
.sf-hero-stat { background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.16); border-radius: 12px; padding: 10px 12px; min-width: 0; }
.sf-hero-stat span { display: block; font-size: 11px; font-weight: 700; opacity: 0.75; text-transform: uppercase; letter-spacing: .06em; }
.sf-hero-stat strong { display: block; font-size: 15px; margin-top: 3px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sf-progress { margin-top: 18px; }
.sf-progress-track { height: 8px; border-radius: 8px; background: rgba(255,255,255,0.22); overflow: hidden; }
.sf-progress-track > span { display: block; height: 100%; border-radius: inherit; background: #fff; transition: width .6s ease; }
.sf-progress-meta { display: flex; justify-content: space-between; font-size: 12px; margin-top: 6px; opacity: 0.85; font-weight: 600; }
.sf-hero-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 20px; }
.sf-pay-btn { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 22px; border: none; border-radius: 12px; background: #fff; color: #4b3fa0; font: inherit; font-weight: 800; font-size: 14px; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.15); transition: transform .15s, box-shadow .15s; }
.sf-pay-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(0,0,0,0.2); }
.sf-pay-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.sf-paid-badge { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 12px; background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); font-weight: 800; font-size: 14px; }
.sf-hero-note { font-size: 12.5px; opacity: 0.85; }

.sf-lines { width: 100%; border-collapse: collapse; font-size: 14px; }
.sf-lines td { padding: 12px 0; border-bottom: 1px dashed #e6e8ef; color: var(--sf-ink); }
.sf-lines td:last-child { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; padding-left: 12px; }
.sf-lines tr.total td { border-bottom: none; border-top: 2px solid var(--sf-ink); font-weight: 800; font-size: 15px; padding-top: 14px; }
.sf-items { list-style: none; margin: 0; padding: 4px 0; }
.sf-items li { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 20px; border-bottom: 1px dashed #e6e8ef; }
.sf-item-main { min-width: 0; flex: 1; }
.sf-item-main b { display: block; font-size: 14px; color: var(--sf-ink); }
.sf-item-main small { display: block; font-size: 12px; color: var(--sf-muted); margin-top: 2px; font-variant-numeric: tabular-nums; }
.sf-item-bar { height: 4px; border-radius: 4px; background: #eef0f6; overflow: hidden; margin-top: 6px; max-width: 200px; }
.sf-item-bar > span { display: block; height: 100%; background: linear-gradient(90deg, #7a6fbe, #9b8fe0); border-radius: inherit; }
.sf-item-side { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
.sf-item-left { text-align: right; }
.sf-item-left b { display: block; font-size: 14px; color: var(--sf-ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
.sf-item-left small { font-size: 11px; color: var(--sf-muted); }
.sf-item-pay { height: 32px; padding: 0 14px; border-radius: 9px; border: 1.5px solid #d9d4f3; background: #f7f5fe; color: #4b3fa0; font: inherit; font-size: 12.5px; font-weight: 800; cursor: pointer; transition: background .15s, border-color .15s; }
.sf-item-pay:hover { background: #7a6fbe; border-color: #7a6fbe; color: #fff; }
.sf-items-total { display: flex; justify-content: space-between; padding: 14px 20px; font-weight: 800; font-size: 15px; color: var(--sf-ink); border-top: 2px solid var(--sf-ink); margin: 0 20px; padding-left: 0; padding-right: 0; font-variant-numeric: tabular-nums; }
.sf-items-hint { display: flex; gap: 6px; align-items: flex-start; padding: 0 20px 16px; font-size: 12px; color: var(--sf-muted); line-height: 1.45; }
.sf-items-hint svg { flex-shrink: 0; margin-top: 2px; }
.sf-h-for { color: #5a4fa3 !important; font-weight: 600; }
.sf-pick { margin: -2px 0 12px; padding: 10px; border-radius: 12px; background: #f9f8fe; border: 1px solid #ece9fa; }
.sf-pick-row { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 9px; cursor: pointer; font-size: 14px; color: #2a3142; }
.sf-pick-row:hover { background: #f1eefc; }
.sf-pick-row.on { background: #ebe7fb; }
.sf-pick-row input { accent-color: #7a6fbe; width: 16px; height: 16px; margin: 0; flex-shrink: 0; }
.sf-pick-name { flex: 1; min-width: 0; }
.sf-pick-name small { color: #74788d; font-size: 12px; }
.sf-pick-row b { font-variant-numeric: tabular-nums; white-space: nowrap; }
.sf-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 10px; background: #c9c3ef; vertical-align: middle; }
.sf-callout { display: flex; gap: 10px; padding: 12px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; }
.sf-callout svg { flex-shrink: 0; margin-top: 1px; }
.sf-callout.info { background: #f3f1fc; color: #4b3fa0; border: 1px solid #e2ddf7; }
.sf-callout.warn { background: #fff7e8; color: #8a5a00; border: 1px solid #fde4b2; }
.sf-callout.ok { background: #eafaf3; color: #0b6b4b; border: 1px solid #c4eedb; }
.sf-callout.bad { background: #fdeef1; color: #a3243c; border: 1px solid #f8cdd6; }

.sf-banner { display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px; border-radius: 14px; margin-bottom: 20px; animation: sf-in .25s ease-out; }
.sf-banner h4 { margin: 0; font-size: 15px; font-weight: 800; }
.sf-banner p { margin: 3px 0 0; font-size: 13px; line-height: 1.5; }
.sf-banner .sf-banner-ico { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sf-banner.ok { background: #eafaf3; border: 1px solid #c4eedb; color: #0b6b4b; } .sf-banner.ok .sf-banner-ico { background: #0f9d6e; color: #fff; }
.sf-banner.wait { background: #f3f1fc; border: 1px solid #e2ddf7; color: #4b3fa0; } .sf-banner.wait .sf-banner-ico { background: #7a6fbe; color: #fff; }
.sf-banner.warn { background: #fff7e8; border: 1px solid #fde4b2; color: #8a5a00; } .sf-banner.warn .sf-banner-ico { background: #f1b44c; color: #fff; }
.sf-banner.bad { background: #fdeef1; border: 1px solid #f8cdd6; color: #a3243c; } .sf-banner.bad .sf-banner-ico { background: #ec4561; color: #fff; }
.sf-banner-close { margin-left: auto; background: none; border: none; color: inherit; opacity: .6; cursor: pointer; padding: 4px; }

.sf-methods { display: grid; gap: 10px; }
.sf-method { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #eceef4; border-radius: 12px; }
.sf-method-ico { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sf-method b { display: block; font-size: 14px; color: var(--sf-ink); }
.sf-method small { font-size: 12px; color: var(--sf-muted); }
.sf-secure { display: flex; align-items: center; gap: 6px; margin-top: 12px; font-size: 12px; color: var(--sf-muted); }

.sf-history { list-style: none; margin: 0; padding: 0; }
.sf-history li { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--sf-line); }
.sf-history li:last-child { border-bottom: none; }
.sf-h-ico { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sf-h-main { flex: 1; min-width: 0; }
.sf-h-main b { display: block; font-size: 14px; color: var(--sf-ink); font-variant-numeric: tabular-nums; }
.sf-h-main small { display: block; font-size: 12px; color: var(--sf-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sf-status { display: inline-flex; align-items: center; font-size: 10.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; }
.sf-status.SUCCESS { background: #eafaf3; color: #0b6b4b; }
.sf-status.PENDING { background: #fff7e8; color: #8a5a00; }
.sf-status.FAILED { background: #fdeef1; color: #a3243c; }
.sf-status.ABANDONED { background: #f1f3f7; color: #6b7280; }
.sf-link-btn { background: none; border: none; color: #5a4fa3; font: inherit; font-weight: 700; font-size: 12.5px; cursor: pointer; padding: 4px 6px; border-radius: 6px; display: inline-flex; gap: 4px; align-items: center; }
.sf-link-btn:hover { background: #f3f1fc; }

.sf-empty { text-align: center; padding: 48px 24px; }
.sf-empty-ico { width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 14px; display: flex; align-items: center; justify-content: center; background: #f3f1fc; color: #7a6fbe; }
.sf-empty h3 { margin: 0 0 6px; font-size: 17px; color: var(--sf-ink); }
.sf-empty p { margin: 0 auto; max-width: 420px; font-size: 13.5px; color: var(--sf-muted); line-height: 1.55; }

.sf-overlay { position: fixed; inset: 0; z-index: 2000; background: rgba(17,24,39,0.55); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 16px; animation: sf-fade .15s; }
.sf-modal { width: 100%; max-width: 460px; max-height: calc(100vh - 32px); overflow-y: auto; background: #fff; border-radius: 18px; box-shadow: 0 30px 70px rgba(17,24,39,0.3); animation: sf-in .2s ease-out; }
.sf-modal.wide { max-width: 620px; }
.sf-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 20px 22px 0; }
.sf-modal-head h2 { margin: 0; font-size: 18px; font-weight: 800; color: #2a3142; }
.sf-modal-head p { margin: 4px 0 0; font-size: 13px; color: #74788d; }
.sf-modal-body { padding: 18px 22px; }
.sf-modal-foot { display: flex; gap: 10px; justify-content: flex-end; padding: 0 22px 20px; flex-wrap: wrap; }
.sf-x { width: 34px; height: 34px; border-radius: 10px; border: 1px solid #eceef4; background: #fff; color: #74788d; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sf-x:hover { background: #f6f7fb; color: #2a3142; }
.sf-option { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1.5px solid #eceef4; border-radius: 14px; cursor: pointer; margin-bottom: 10px; transition: border-color .15s, background .15s; }
.sf-option:hover { border-color: #cfc9ef; }
.sf-option.on { border-color: #7a6fbe; background: #f7f5fe; }
.sf-option input[type=radio] { accent-color: #7a6fbe; width: 17px; height: 17px; margin: 0; }
.sf-option b { display: block; font-size: 14px; color: #2a3142; }
.sf-option small { font-size: 12px; color: #74788d; }
.sf-amount { position: relative; margin-top: 10px; }
.sf-amount span { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-weight: 800; color: #74788d; font-size: 13px; }
.sf-amount input { width: 100%; box-sizing: border-box; height: 50px; border: 1.5px solid #e2e5ee; border-radius: 12px; padding: 0 14px 0 54px; font: inherit; font-size: 20px; font-weight: 800; color: #2a3142; font-variant-numeric: tabular-nums; }
.sf-amount input:focus { outline: none; border-color: #7a6fbe; box-shadow: 0 0 0 4px rgba(122,111,190,0.15); }
.sf-amount input.bad { border-color: #ec4561; }
.sf-err { color: #d63a55; font-size: 12.5px; margin-top: 6px; font-weight: 600; }
.sf-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 20px; border: none; border-radius: 12px; background: linear-gradient(135deg, #7a6fbe, #5a4fa3); color: #fff; font: inherit; font-weight: 800; font-size: 14px; cursor: pointer; box-shadow: 0 8px 18px rgba(90,79,163,0.3); }
.sf-btn:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
.sf-btn.full { width: 100%; }
.sf-btn-ghost { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 44px; padding: 0 18px; border-radius: 12px; border: 1.5px solid #e2e5ee; background: #fff; color: #2a3142; font: inherit; font-weight: 700; font-size: 14px; cursor: pointer; }
.sf-btn-ghost:hover { background: #f6f7fb; }

.sf-receipt { color: #1f2433; background: #fff; border: 1px solid #eceef4; border-radius: 14px; padding: 26px; position: relative; overflow: hidden; }
.sf-receipt-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 16px; border-bottom: 2px solid #1f2433; }
.sf-receipt-brand { display: flex; gap: 12px; align-items: center; min-width: 0; }
.sf-receipt-brand img { width: 52px; height: 52px; object-fit: contain; }
.sf-receipt-brand h3 { margin: 0; font-size: 16px; font-weight: 800; }
.sf-receipt-brand p { margin: 2px 0 0; font-size: 12px; color: #6b7280; }
.sf-receipt-title { text-align: right; }
.sf-receipt-title b { display: block; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; }
.sf-receipt-title span { font-size: 12px; color: #6b7280; }
.sf-receipt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin: 18px 0; font-size: 13px; }
.sf-receipt-grid dt { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; }
.sf-receipt-grid dd { margin: 2px 0 0; font-weight: 700; overflow-wrap: anywhere; }
.sf-receipt-amount { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-radius: 12px; background: #f6f7fb; font-weight: 800; }
.sf-receipt-amount strong { font-size: 22px; font-variant-numeric: tabular-nums; }
.sf-stamp { position: absolute; right: 26px; top: 100px; transform: rotate(-14deg); border: 3px solid rgba(15,157,110,0.55); color: rgba(15,157,110,0.75); font-weight: 900; font-size: 22px; letter-spacing: .18em; padding: 4px 14px; border-radius: 8px; pointer-events: none; }
.sf-receipt-foot { margin-top: 16px; font-size: 11.5px; color: #6b7280; line-height: 1.5; }

.sf-dash { display: flex; align-items: center; gap: 18px; padding: 18px 22px; flex-wrap: wrap; }
.sf-dash-ico { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.sf-dash-main { flex: 1 1 220px; min-width: 0; }
.sf-dash-main small { display: block; font-size: 11px; font-weight: 800; letter-spacing: .07em; text-transform: uppercase; color: #74788d; }
.sf-dash-main b { display: block; font-size: 22px; font-weight: 800; color: #2a3142; margin-top: 2px; font-variant-numeric: tabular-nums; }
.sf-dash-main .sf-progress-track { background: #eef0f6; height: 6px; margin-top: 8px; max-width: 320px; }
.sf-dash-main .sf-progress-track > span { background: linear-gradient(90deg, #7a6fbe, #9b8fe0); }

.sf-skel { background: linear-gradient(90deg, #f1f3f7, #e8ebf1, #f1f3f7); background-size: 200% 100%; animation: sf-shimmer 1.4s linear infinite; border-radius: 16px; }
.sf-spin { animation: sf-spin 1s linear infinite; }
@keyframes sf-spin { to { transform: rotate(360deg); } }
@keyframes sf-fade { from { opacity: 0; } }
@keyframes sf-in { from { opacity: 0; transform: translateY(6px); } }
@keyframes sf-shimmer { to { background-position: -200% 0; } }

@media (max-width: 992px) { .sf-grid { grid-template-columns: 1fr; } }
@media (max-width: 576px) {
  .sf-items li { padding: 12px 16px; }
  .sf-items-total { margin: 0 16px; }
  .sf-hero { padding: 20px 18px; }
  .sf-balance { font-size: 30px; }
  .sf-hero-stats { grid-template-columns: 1fr 1fr; }
  .sf-hero-stats .sf-hero-stat:last-child { grid-column: span 2; }
  .sf-pay-btn { width: 100%; justify-content: center; }
  .sf-receipt { padding: 18px; }
  .sf-receipt-grid { grid-template-columns: 1fr; }
  .sf-modal-foot .sf-btn, .sf-modal-foot .sf-btn-ghost { flex: 1; }
}

@media print {
  body * { visibility: hidden !important; }
  .sf-receipt, .sf-receipt * { visibility: visible !important; }
  .sf-receipt { position: absolute; left: 0; top: 0; width: 100%; border: none; box-shadow: none; padding: 0; }
  .sf-overlay { position: static; background: none; backdrop-filter: none; }
  .sf-modal { box-shadow: none; max-height: none; overflow: visible; }
}
`;
