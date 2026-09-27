import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Download, Loader2 } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import TranscriptView from '../../components/academic/TranscriptView';
import { downloadTranscriptPdf, getMyTranscript } from '../../api/endpoints';

/** Student: own academic record — GPA per semester, CGPA, class and carry-overs. Published results only. */
export default function Transcript() {
  const [downloading, setDownloading] = useState(false);
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['transcript', 'me'], queryFn: getMyTranscript });

  const download = async () => {
    setDownloading(true);
    try { await downloadTranscriptPdf(); }
    catch { toast.error('Could not generate the transcript'); }
    finally { setDownloading(false); }
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="My Transcript" breadcrumbs={['Academic Performance', 'Transcript']} />
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={26} color="#5156be" style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : isError ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>{(error as any)?.response?.data?.message ?? 'Could not load your transcript.'}</div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={download} disabled={downloading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', border: 'none', borderRadius: 8, background: '#5156be', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: downloading ? 0.7 : 1 }}>
              {downloading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />} Download transcript (PDF)
            </button>
          </div>
          <TranscriptView t={data} />
        </>
      )}
    </div>
  );
}
