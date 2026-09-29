import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, ShieldX, Search, Loader2 } from 'lucide-react';
import { verifyDocument } from '../../api/endpoints';
import { tx } from '../../utils/terms';

type Result = {
  status: 'VALID' | 'REVOKED' | 'NOT_FOUND' | 'DISABLED';
  code?: string; type?: string; studentName?: string; studentId?: string; program?: string;
  summary?: string; institution?: string; issuedAt?: string; revokedReason?: string;
};

const TYPE_LABEL: Record<string, string> = {
  TRANSCRIPT: 'Academic transcript', REPORT_CARD: 'Report card', CUMULATIVE_REPORT: 'Cumulative report card',
};

/** Public page: anyone holding a printed transcript or report card can check its code. */
export default function VerifyDocument() {
  const { code: codeParam } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(codeParam ?? '');
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!codeParam) { setResult(null); return; }
    setCode(codeParam);
    setLoading(true); setError(''); setResult(null);
    verifyDocument(codeParam)
      .then(setResult)
      .catch((e: any) => setError(e?.response?.status === 429
        ? (e.response.data?.message ?? 'Too many checks. Try again in a few minutes.')
        : 'Could not check the code right now. Try again later.'))
      .finally(() => setLoading(false));
  }, [codeParam]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (clean) navigate(`/verify/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="vd-wrap">
      <div className="vd-card">
        <h1>Verify a document</h1>
        <p className="vd-sub">{tx("Enter the verification code printed at the bottom of a transcript or report card.")}</p>
        <form onSubmit={submit} className="vd-form">
          <label htmlFor="vd-code" className="vd-sr">Verification code</label>
          <input id="vd-code" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH-JKMN" autoComplete="off" spellCheck={false} maxLength={20} />
          <button type="submit" disabled={loading || !code.trim()}>
            {loading ? <Loader2 size={16} className="vd-spin" /> : <Search size={16} />} Check
          </button>
        </form>

        {error && <div className="vd-box vd-warn" role="alert"><ShieldAlert size={20} /><div>{error}</div></div>}

        {result?.status === 'VALID' && (
          <div className="vd-box vd-ok" role="status">
            <ShieldCheck size={22} />
            <div style={{ flex: 1 }}>
              <strong>Genuine document</strong>
              <p>This code matches a document issued by {result.institution ?? 'the institution'}.</p>
              <dl>
                <dt>Document</dt><dd>{TYPE_LABEL[result.type ?? ''] ?? result.type}</dd>
                <dt>Name</dt><dd>{result.studentName}</dd>
                <dt>ID</dt><dd>{result.studentId}</dd>
                {result.program && <><dt>{tx("Programme")}</dt><dd>{result.program}</dd></>}
                {result.summary && <><dt>Details</dt><dd>{result.summary}</dd></>}
                <dt>Issued</dt><dd>{result.issuedAt ? new Date(result.issuedAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }) : '-'}</dd>
                <dt>Code</dt><dd style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{result.code}</dd>
              </dl>
              <p className="vd-note">Check that these details match the paper you were given.</p>
            </div>
          </div>
        )}
        {result?.status === 'REVOKED' && (
          <div className="vd-box vd-bad" role="status">
            <ShieldX size={22} />
            <div>
              <strong>This document has been withdrawn</strong>
              <p>It was issued for {result.studentName} ({result.studentId}) but is no longer valid.{result.revokedReason ? ` Reason: ${result.revokedReason}` : ''}</p>
            </div>
          </div>
        )}
        {result?.status === 'NOT_FOUND' && (
          <div className="vd-box vd-bad" role="status">
            <ShieldX size={22} />
            <div><strong>No document has this code</strong><p>Check the code for typing mistakes. A code that isn't found may mean the document isn't genuine.</p></div>
          </div>
        )}
        {result?.status === 'DISABLED' && (
          <div className="vd-box vd-warn" role="status">
            <ShieldAlert size={22} />
            <div><strong>Online verification is switched off</strong><p>Contact the institution's examinations office to confirm this document.</p></div>
          </div>
        )}

        <Link to="/login" className="vd-back">Go to sign in</Link>
      </div>
      <style>{`
        .vd-wrap { min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; padding: 48px 16px; background: #f4f5fb; }
        .vd-card { width: 100%; max-width: 560px; background: #fff; border-radius: 16px; padding: 28px 24px; box-shadow: 0 12px 40px rgba(15,23,42,0.08); }
        .vd-card h1 { margin: 0 0 6px; font-size: 22px; color: #1e293b; }
        .vd-sub { margin: 0 0 18px; color: #64748b; font-size: 14px; }
        .vd-form { display: flex; gap: 8px; }
        .vd-form input { flex: 1; min-width: 0; height: 44px; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0 12px; font-size: 16px; font-family: monospace; letter-spacing: 1px; }
        .vd-form input:focus { outline: none; border-color: #5156be; }
        .vd-form button { height: 44px; padding: 0 16px; border: none; border-radius: 10px; background: #5156be; color: #fff; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer; }
        .vd-form button:disabled { opacity: 0.6; cursor: default; }
        .vd-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
        .vd-box { display: flex; gap: 12px; margin-top: 18px; padding: 14px; border-radius: 12px; font-size: 14px; }
        .vd-box p { margin: 4px 0 0; }
        .vd-ok { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
        .vd-bad { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .vd-warn { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
        .vd-box dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 12px 0 0; color: #1e293b; }
        .vd-box dt { font-weight: 700; color: #475569; }
        .vd-box dd { margin: 0; word-break: break-word; }
        .vd-note { font-size: 12.5px; color: #047857; margin-top: 10px !important; }
        .vd-back { display: inline-block; margin-top: 20px; font-size: 13px; color: #5156be; font-weight: 600; }
        .vd-spin { animation: vd-spin 1s linear infinite; }
        @keyframes vd-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
