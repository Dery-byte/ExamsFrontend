import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Save, RotateCcw, Undo2, Loader2, CheckCircle2, AlertTriangle, Wand2, Info, LayoutDashboard, BookOpen,
} from 'lucide-react';
import { getThemeSettings, saveThemeSettings, resetThemeSettings, getInstitution, institutionLogoUrl } from '../../../api/endpoints';
import {
  THEME_PRESETS, DEFAULT_THEME, themeVars, themeChecks, isHex, autoAccent, applyTheme, sameTheme, type ThemeSettings,
} from '../../../utils/theme';
import type { Institution } from '../../../hooks/useInstitution';
import { PanelHeader, PanelLoading, PanelError, apiMessage } from './ui';

type Draft = Pick<ThemeSettings, 'brand' | 'sidebar' | 'accent' | 'preset'>;

const fromServer = (t: any): Draft => ({
  brand: isHex(t?.brand) ? t.brand : DEFAULT_THEME.brand,
  sidebar: isHex(t?.sidebar) ? t.sidebar : DEFAULT_THEME.sidebar,
  accent: isHex(t?.accent) ? t.accent : null,
  preset: t?.preset ?? null,
});

/** The developer picks the institution's colours; every shade and text colour is derived and checked. */
export default function BrandingPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['dev-theme'], queryFn: getThemeSettings });
  const inst = useQuery<Institution>({ queryKey: ['institution'], queryFn: getInstitution });
  const saved = useMemo(() => (q.data ? fromServer(q.data) : null), [q.data]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<'save' | 'reset' | null>(null);

  useEffect(() => { if (saved) setDraft(saved); }, [saved]);

  if (q.isLoading || !draft) {
    return <section><Header /> {q.isError ? <PanelError message="Could not load the theme." onRetry={() => q.refetch()} /> : <PanelLoading label="Loading theme" />}</section>;
  }

  const dirty = !!saved && !sameTheme(draft, saved);
  const set = (patch: Partial<Draft>) => setDraft(d => ({ ...(d as Draft), preset: null, ...patch }));
  const checks = themeChecks(draft);
  const failing = checks.filter(c => !c.ok).length;

  const done = (result: any, message: string) => {
    qc.setQueryData(['dev-theme'], result);
    const next = fromServer(result);
    applyTheme({ ...next, version: result.version });   // this browser keeps the new colours too
    qc.invalidateQueries({ queryKey: ['institution'] });
    toast.success(message);
  };

  const save = async () => {
    setBusy('save');
    try { done(await saveThemeSettings(draft), 'Theme saved. Everyone sees it on their next page load.'); }
    catch (err) { toast.error(apiMessage(err, 'Could not save the theme')); }
    finally { setBusy(null); }
  };

  const reset = async () => {
    if (!window.confirm('Go back to the built-in indigo theme for everyone?')) return;
    setBusy('reset');
    try { done(await resetThemeSettings(), 'Theme reset to the default colours.'); }
    catch (err) { toast.error(apiMessage(err, 'Could not reset the theme')); }
    finally { setBusy(null); }
  };

  return (
    <section>
      <Header actions={<>
        {dirty && <button className="dd-btn dd-btn-quiet" onClick={() => saved && setDraft(saved)} disabled={!!busy}><Undo2 size={15} /> Undo changes</button>}
        {q.data?.customised && <button className="dd-btn" onClick={reset} disabled={!!busy}>
          {busy === 'reset' ? <Loader2 size={15} className="dd-spin" /> : <RotateCcw size={15} />} Reset to default</button>}
        <button className="dd-btn dd-btn-primary" onClick={save} disabled={!dirty || !!busy}>
          {busy === 'save' ? <Loader2 size={15} className="dd-spin" /> : <Save size={15} />} Save theme</button>
      </>} />

      <div className="db-grid">
        <div className="db-controls">
          <div className="dd-card">
            <div className="dd-card-head"><h2 className="dd-card-title">Start from a palette</h2></div>
            <div className="db-presets" role="list">
              {THEME_PRESETS.map(p => {
                const on = sameTheme(draft, p);
                return (
                  <button key={p.key} type="button" role="listitem" aria-pressed={on} className={`db-preset${on ? ' on' : ''}`}
                    onClick={() => setDraft({ brand: p.brand, sidebar: p.sidebar, accent: p.accent, preset: p.key })}>
                    <span className="db-swatches" aria-hidden>
                      <span style={{ background: p.sidebar }} /><span style={{ background: p.brand }} /><span style={{ background: p.accent ?? autoAccent(p.brand) }} />
                    </span>
                    <span className="db-preset-name">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="dd-card">
            <div className="dd-card-head"><h2 className="dd-card-title">Colours</h2></div>
            <ColorField id="db-brand" label="Brand" hint="Buttons, links, highlights and the selected answer in exams."
              value={draft.brand} onChange={brand => set({ brand })} />
            <ColorField id="db-sidebar" label="Sidebar" hint="The menu down the left of every signed-in page. Menu text switches to white or near-black to stay readable."
              value={draft.sidebar} onChange={sidebar => set({ sidebar })} />
            <ColorField id="db-accent" label="Accent" hint="Second colour for badges, charts and banners."
              value={draft.accent ?? autoAccent(draft.brand)} disabled={draft.accent === null}
              onChange={accent => set({ accent })}
              extra={
                <label className="dd-check db-auto">
                  <input type="checkbox" checked={draft.accent === null}
                    onChange={e => set({ accent: e.target.checked ? null : autoAccent(draft.brand) })} />
                  <span>Work it out from the brand colour</span>
                </label>
              } />
          </div>

          <LogoColors institution={inst.data} onPick={(role, hex) => set({ [role]: hex } as Partial<Draft>)} />

          <div className="dd-card">
            <div className="dd-card-head">
              <h2 className="dd-card-title">Readability</h2>
              <span className={`dd-tag ${failing ? 'dd-tag-warn' : 'dd-tag-ok'}`}>{failing ? `${failing} to look at` : 'All clear'}</span>
            </div>
            <ul className="db-checks">
              {checks.map(c => (
                <li key={c.label} className={c.ok ? 'ok' : 'warn'}>
                  {c.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                  <div>
                    <strong>{c.label}</strong> <span className="dd-mono">{c.ratio.toFixed(1)}:1</span>
                    {!c.ok && <p>{c.note}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <p className="dd-note"><Info size={14} /> Question and answer text in exams never uses the brand colour, so it stays readable in light and dark mode whatever you choose.</p>
          </div>
        </div>

        <div className="db-previews">
          <Preview draft={draft} name={inst.data?.shortName ?? 'Portal'} />
        </div>
      </div>
      <style>{CSS}</style>
    </section>
  );
}

function Header({ actions }: { actions?: React.ReactNode }) {
  return (
    <PanelHeader
      title="Branding"
      description="The institution's colours on every page, PDF and email. Pick three colours; lighter and darker shades and readable text colours are worked out for you."
      actions={actions}
    />
  );
}

function ColorField({ id, label, hint, value, onChange, disabled, extra }: {
  id: string; label: string; hint: string; value: string; onChange: (hex: string) => void; disabled?: boolean; extra?: React.ReactNode;
}) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const commit = (v: string) => {
    const hex = (v.startsWith('#') ? v : `#${v}`).toLowerCase();
    if (isHex(hex)) onChange(hex); else setText(value);
  };
  return (
    <div className={`db-field${disabled ? ' off' : ''}`}>
      <div className="db-field-row">
        <input type="color" aria-label={`${label} colour picker`} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} />
        <div className="db-field-text">
          <label htmlFor={id}>{label}</label>
          <input id={id} className="dd-select db-hex" value={text} disabled={disabled} spellCheck={false} maxLength={7}
            onChange={e => { setText(e.target.value); if (isHex(e.target.value)) onChange(e.target.value.toLowerCase()); }}
            onBlur={e => commit(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commit((e.target as HTMLInputElement).value); }} />
        </div>
      </div>
      <p className="db-hint">{hint}</p>
      {extra}
    </div>
  );
}

// ── Colours taken from the uploaded logo ────────────────────────────────

function extractColors(img: HTMLImageElement): string[] {
  const N = 64;
  const canvas = document.createElement('canvas');
  canvas.width = N; canvas.height = N;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, N, N);
  const { data } = ctx.getImageData(0, 0, N, N);   // throws if the server didn't allow cross-origin reads
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; s: number }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 510;
    if (l > 0.92 || l < 0.06) continue;   // background white / black outlines
    const s = max === min ? 0 : (max - min) / (l > 0.5 ? 510 - max - min : max + min);
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, s };
    e.n++; e.r += r; e.g += g; e.b += b;
    buckets.set(key, e);
  }
  const ranked = [...buckets.values()].sort((a, b) => b.n * (0.35 + b.s) - a.n * (0.35 + a.s));
  const out: [number, number, number][] = [];
  for (const e of ranked) {
    const c: [number, number, number] = [e.r / e.n, e.g / e.n, e.b / e.n];
    if (out.every(o => Math.hypot(o[0] - c[0], o[1] - c[1], o[2] - c[2]) > 64)) out.push(c);
    if (out.length === 6) break;
  }
  return out.map(c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''));
}

function LogoColors({ institution, onPick }: { institution?: Institution; onPick: (role: 'brand' | 'sidebar' | 'accent', hex: string) => void }) {
  const [colors, setColors] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const url = institution?.hasLogo ? institutionLogoUrl(institution.logoVersion) : null;

  useEffect(() => {
    if (!url) return;
    setColors(null); setFailed(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { try { setColors(extractColors(img)); } catch { setFailed(true); } };
    img.onerror = () => setFailed(true);
    img.src = url;
  }, [url]);

  return (
    <div className="dd-card">
      <div className="dd-card-head"><h2 className="dd-card-title"><Wand2 size={15} /> Colours from the logo</h2></div>
      {!url ? (
        <p className="dd-card-text">Once the Super Admin uploads the institution's logo (Institution settings), its main colours appear here to pick from.</p>
      ) : failed ? (
        <p className="dd-card-text">The logo's colours couldn't be read in this browser. Use the colour pickers instead.</p>
      ) : !colors ? (
        <PanelLoading label="Reading the logo" />
      ) : colors.length === 0 ? (
        <p className="dd-card-text">The logo is black and white only, so there are no colours to suggest.</p>
      ) : (
        <div className="db-logo">
          <img src={url} alt="" className="db-logo-img" />
          <ul className="db-suggest">
            {colors.map(c => (
              <li key={c}>
                <span className="db-chip" style={{ background: c }} title={c} />
                <span className="dd-mono">{c}</span>
                <span className="db-use">
                  <button type="button" className="dd-btn dd-btn-sm" onClick={() => onPick('brand', c)}>Brand</button>
                  <button type="button" className="dd-btn dd-btn-sm" onClick={() => onPick('sidebar', c)}>Sidebar</button>
                  <button type="button" className="dd-btn dd-btn-sm" onClick={() => onPick('accent', c)}>Accent</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Live preview, scoped to this box ────────────────────────────────────

function Preview({ draft, name }: { draft: Draft; name: string }) {
  const vars = themeVars(draft) as unknown as CSSProperties;
  return (
    <div className="db-preview" style={vars}>
      <div className="dd-card db-pcard">
        <div className="dd-card-head"><h2 className="dd-card-title"><LayoutDashboard size={15} /> Staff and student pages</h2></div>
        <div className="pv-app" aria-hidden>
          <div className="pv-side">
            <div className="pv-brand"><span className="pv-mark">{name.charAt(0).toUpperCase()}</span><span>{name}</span></div>
            <span className="pv-label">Main</span>
            <span className="pv-item on">Dashboard</span>
            <span className="pv-item">Courses</span>
            <span className="pv-item">Results</span>
            <span className="pv-item">Reports</span>
          </div>
          <div className="pv-main">
            <div className="pv-banner">Welcome back</div>
            <div className="pv-card">
              <strong>Mid-semester quiz</strong>
              <span className="pv-tags"><span className="pv-badge">Published</span><span className="pv-chip">Theory</span></span>
              <p>Results are ready to review. <span className="pv-link">Open the marking sheet</span></p>
              <div className="pv-btns"><span className="pv-btn">Review</span><span className="pv-btn-o">Download</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="dd-card db-pcard">
        <div className="dd-card-head"><h2 className="dd-card-title"><BookOpen size={15} /> Exam screen, light and dark</h2></div>
        <div className="pv-exams" aria-hidden>
          {(['light', 'dark'] as const).map(mode => (
            <div key={mode} className={`pv-exam ${mode}`}>
              <div className="pv-q"><span className="pv-qno">Q3</span><span>Which layer of the OSI model handles routing between networks?</span></div>
              <span className="pv-opt">A. Data link</span>
              <span className="pv-opt sel">B. Network</span>
              <span className="pv-opt">C. Transport</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const CSS = `
.db-grid { display: grid; gap: 16px; }
@media (min-width: 1180px) { .db-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); align-items: start; } .db-previews { position: sticky; top: 24px; } }
.db-controls, .db-preview { display: grid; gap: 16px; min-width: 0; }
.db-presets { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; }
.db-preset { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px; border: 1px solid var(--dd-border);
  background: var(--dd-surface); cursor: pointer; text-align: left; transition: border-color .15s, box-shadow .15s; min-height: 44px; }
.db-preset:hover { border-color: var(--dd-border-strong); }
.db-preset.on { border-color: var(--dd-accent); box-shadow: 0 0 0 3px var(--dd-accent-soft); }
.db-swatches { display: flex; height: 22px; border-radius: 6px; overflow: hidden; border: 1px solid var(--dd-border); }
.db-swatches span { flex: 1; }
.db-preset-name { font-size: 12.5px; font-weight: 600; color: var(--dd-text-2); }
.db-field { padding: 12px 0; border-top: 1px solid var(--dd-border); }
.db-field:first-of-type { border-top: 0; padding-top: 0; }
.db-field.off .db-field-row { opacity: .55; }
.db-field-row { display: flex; align-items: center; gap: 12px; }
.db-field-row input[type=color] { flex: none; width: 48px; height: 44px; padding: 3px; border-radius: 10px; border: 1px solid var(--dd-border-strong);
  background: var(--dd-surface); cursor: pointer; }
.db-field-row input[type=color]:disabled { cursor: not-allowed; }
.db-field-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
.db-field-text label { font-size: 13px; font-weight: 700; color: var(--dd-text); }
.db-hex { width: 120px; font-family: var(--dd-mono); padding: 0 10px; cursor: text; text-transform: lowercase; }
.db-hint { margin: 6px 0 0; font-size: 12.5px; color: var(--dd-muted); }
.db-auto { margin-top: 8px; flex: none; }
.db-checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.db-checks li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--dd-text-2); }
.db-checks li > svg { flex: none; margin-top: 2px; }
.db-checks li.ok > svg { color: var(--dd-ok); }
.db-checks li.warn > svg { color: var(--dd-warn); }
.db-checks p { margin: 2px 0 0; color: var(--dd-muted); font-size: 12.5px; }
.db-checks .dd-mono { color: var(--dd-muted); margin-left: 4px; }
.db-logo { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.db-logo-img { width: 72px; height: 72px; object-fit: contain; border-radius: 10px; border: 1px solid var(--dd-border); background: #fff; padding: 6px; }
.db-suggest { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; flex: 1 1 260px; min-width: 0; }
.db-suggest li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.db-chip { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--dd-border); flex: none; }
.db-use { display: inline-flex; gap: 4px; margin-left: auto; flex-wrap: wrap; }

/* Preview: plain colours on purpose, only the theme variables come from the draft */
.db-pcard { padding-bottom: 20px; }
.pv-app { display: flex; min-height: 230px; border-radius: 10px; overflow: hidden; border: 1px solid var(--dd-border); background: #f4f6f9;
  font-size: 12px; color: #334155; }
.pv-side { width: 38%; max-width: 170px; background: var(--sidebar-bg); color: rgba(var(--sidebar-fg-rgb), .65); padding: 12px 8px;
  display: flex; flex-direction: column; gap: 3px; }
.pv-brand { display: flex; align-items: center; gap: 8px; color: var(--sidebar-fg); font-weight: 800; font-size: 13px; padding: 0 4px 10px;
  border-bottom: 1px solid rgba(var(--sidebar-fg-rgb), .08); margin-bottom: 6px; overflow: hidden; white-space: nowrap; }
.pv-mark { flex: none; width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: var(--brand); color: var(--brand-contrast); }
.pv-label { font-size: 9.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: rgba(var(--sidebar-fg-rgb), .4); padding: 4px 6px; }
.pv-item { padding: 7px 8px; border-radius: 7px; }
.pv-item.on { background: var(--brand); color: var(--brand-contrast); font-weight: 700; }
.pv-main { flex: 1; min-width: 0; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.pv-banner { padding: 12px; border-radius: 9px; background: linear-gradient(135deg, var(--brand), var(--accent)); color: var(--brand-contrast); font-weight: 800; font-size: 13px; }
.pv-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 9px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.pv-card strong { color: #1e293b; font-size: 13px; }
.pv-card p { margin: 0; color: #64748b; }
.pv-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: var(--brand-soft); color: var(--brand-text); border: 1px solid var(--brand-border); font-weight: 700; font-size: 10.5px; }
.pv-chip { display: inline-block; padding: 2px 8px; border-radius: 999px; background: var(--accent-soft); color: var(--accent-text); font-weight: 700; font-size: 10.5px; }
.pv-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.pv-link { color: var(--brand-text); font-weight: 700; text-decoration: underline; }
.pv-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.pv-btn { padding: 6px 12px; border-radius: 7px; background: var(--brand); color: var(--brand-contrast); font-weight: 700; }
.pv-btn-o { padding: 5px 11px; border-radius: 7px; border: 1px solid var(--brand); color: var(--brand-text); font-weight: 700; background: #fff; }
.pv-exams { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 10px; }
.pv-exam { border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 7px; font-size: 12px; }
.pv-exam.light { background: #fff; border: 1px solid #e5e9f2; color: #1e293b; }
.pv-exam.dark { background: #22262b; border: 1px solid #31363e; color: #f1f5f9; }
.pv-q { display: flex; gap: 8px; font-weight: 600; line-height: 1.5; }
.pv-qno { flex: none; height: fit-content; padding: 1px 7px; border-radius: 4px; font-weight: 700; font-size: 10.5px; background: rgba(var(--brand-rgb), .12); }
.pv-exam.light .pv-qno { color: var(--brand-text); }
.pv-exam.dark .pv-qno { color: var(--brand-light); }
.pv-opt { padding: 7px 10px; border-radius: 5px; border: 1px solid; }
.pv-exam.light .pv-opt { border-color: #e5e9f2; }
.pv-exam.dark .pv-opt { border-color: #31363e; }
.pv-exam .pv-opt.sel { background: var(--brand); border-color: var(--brand); color: var(--brand-contrast); font-weight: 600; }
`;
