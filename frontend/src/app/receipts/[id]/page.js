'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth';
import { getReceipt, verifyReceipt } from '@/lib/api';
import Link from 'next/link';

function JsonViewer({ data, depth = 0 }) {
  if (data === null || data === undefined) return <span className="json-null">null</span>;
  if (typeof data === 'boolean') return <span className="json-boolean">{data.toString()}</span>;
  if (typeof data === 'number') return <span className="json-number">{data}</span>;
  if (typeof data === 'string') {
    if (data.length > 200) {
      return <span className="json-string">&quot;{data.slice(0, 200)}…&quot;</span>;
    }
    return <span className="json-string">&quot;{data}&quot;</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span>[]</span>;
    return (
      <span>
        {'[\n'}
        {data.map((item, i) => (
          <span key={i}>
            {'  '.repeat(depth + 1)}
            <JsonViewer data={item} depth={depth + 1} />
            {i < data.length - 1 ? ',\n' : '\n'}
          </span>
        ))}
        {'  '.repeat(depth)}{']'}
      </span>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span>{'{}'}</span>;
    return (
      <span>
        {'{\n'}
        {keys.map((key, i) => (
          <span key={key}>
            {'  '.repeat(depth + 1)}
            <span className="json-key">&quot;{key}&quot;</span>: <JsonViewer data={data[key]} depth={depth + 1} />
            {i < keys.length - 1 ? ',\n' : '\n'}
          </span>
        ))}
        {'  '.repeat(depth)}{'}'}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

export default function ReceiptDetailPage() {
  const params = useParams();
  const { user, loading: authLoading } = useRequireAuth();
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!user || !params.id) return;
    getReceipt(params.id)
      .then(setReceipt)
      .catch((err) => {
        setReceipt(null);
        setLoadError(err.message || 'This receipt could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [user, params.id]);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await verifyReceipt(params.id);
      setVerification(result);
    } catch (err) {
      setVerification({ valid: false, error: err.message });
    } finally {
      setVerifying(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="skeleton skeleton-title" style={{ marginBottom: 24 }} />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">🧾</div>
        <h3>{loadError ? 'Receipt unavailable' : 'Receipt not found'}</h3>
        {loadError && <p>{loadError}</p>}
        <Link href="/receipts" className="btn btn-secondary" style={{ marginTop: 16 }}>← Back to Receipts</Link>
      </div>
    );
  }

  const payload = receipt.payload || {};
  const plan = payload.plan || {};
  const retrieval = payload.retrieval || {};
  const candidates = retrieval.candidates || [];
  const dropped = retrieval.dropped || [];
  const contextBlocks = payload.context?.blocks || [];
  const contextByChunk = new Map(contextBlocks.map((block) => [block.chunk_id, block.n]));
  const citedBlocks = new Set((payload.outcome?.cited_blocks || []).map(Number));
  const verificationInfo = payload.verification || {};
  const distinctSources = new Set(candidates.map((candidate) => candidate.doc_id)).size;

  return (
    <div className="receipt-detail-page animate-fade-in">
      <div style={{ marginBottom: 20 }}>
        <Link href="/receipts" className="receipt-back-link">← Evidence ledger</Link>
      </div>

      <div className="page-header">
        <span className="receipt-kicker">EVIDENCE RECEIPT · {new Date(receipt.created_at).toLocaleString()}</span>
        <h1>How this answer was made</h1>
        <p className="receipt-question">{receipt.query}</p>
      </div>

      {/* Summary */}
      <div className="stats-grid stagger" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div><span className={`badge badge-${receipt.status}`}>{receipt.status}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Confidence</div>
          <div className="stat-value">{Math.round(receipt.confidence * 100)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Grounding</div>
          <div className="stat-value">{Math.round(receipt.grounding * 100)}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Latency</div>
          <div className="stat-value">{receipt.latency_ms}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ms</span></div>
        </div>
      </div>

      <section className="trace-panel glass-card-static" aria-labelledby="trace-title">
        <div className="trace-panel-heading">
          <div>
            <span className="receipt-kicker">THE ANSWER TRAIL</span>
            <h2 id="trace-title">What Agentvault did</h2>
          </div>
          <span className={`trace-outcome trace-${receipt.status}`}>{receipt.status}</span>
        </div>
        <p className="trace-intro">Follow the path from your question to the evidence used in the response. A retrieved source is not automatically cited; citations are tied to the claims the verifier kept.</p>
        <ol className="trace-stages">
          <li>
            <span className="trace-stage-number">01</span>
            <div className="trace-stage-content">
              <div className="trace-stage-title"><h3>Understand the question</h3><span>PLAN</span></div>
              <p>{plan.rationale || 'The question was checked and prepared for knowledge search.'}</p>
              {plan.sub_queries?.length > 0 && (
                <ul className="trace-query-list">{plan.sub_queries.map((query, index) => <li key={`${query}-${index}`}>{query}</li>)}</ul>
              )}
              {payload.user && <small>Access context: {payload.user.role} · clearance {payload.user.clearance}</small>}
            </div>
          </li>
          <li>
            <span className="trace-stage-number">02</span>
            <div className="trace-stage-content">
              <div className="trace-stage-title"><h3>Find and grade evidence</h3><span>RETRIEVAL</span></div>
              <p>{candidates.length} evidence chunk{candidates.length === 1 ? '' : 's'} from {distinctSources} source document{distinctSources === 1 ? '' : 's'} passed evidence grading. {dropped.length} candidate{dropped.length === 1 ? '' : 's'} were excluded during grading.</p>
              {dropped.length > 0 && (
                <details className="trace-dropped">
                  <summary>Why {dropped.length} candidate{dropped.length === 1 ? '' : 's'} were excluded</summary>
                  <ul>{dropped.slice(0, 5).map((item, index) => <li key={`${item.chunk_id || item.doc_id || 'drop'}-${index}`}>{item.reason?.replaceAll('_', ' ') || 'Not included'}{item.relevance !== undefined ? ` · relevance ${Math.round(item.relevance * 100)}%` : ''}</li>)}</ul>
                  {dropped.length > 5 && <small>Showing the first 5 exclusions.</small>}
                </details>
              )}
            </div>
          </li>
          <li>
            <span className="trace-stage-number">03</span>
            <div className="trace-stage-content">
              <div className="trace-stage-title"><h3>Check claims against context</h3><span>VERIFICATION</span></div>
              <p>{verificationInfo.claims_supported ?? 0} of {verificationInfo.claims_total ?? 0} factual claim{verificationInfo.claims_total === 1 ? '' : 's'} supported; {verificationInfo.removed_claims?.length || 0} unsupported statement{verificationInfo.removed_claims?.length === 1 ? '' : 's'} removed.</p>
              {verificationInfo.nli_used && <small>Semantic entailment checks were also used.</small>}
            </div>
          </li>
          <li>
            <span className="trace-stage-number">04</span>
            <div className="trace-stage-content">
              <div className="trace-stage-title"><h3>Keep a verifiable record</h3><span>RECEIPT</span></div>
              <p>The evidence and checks are captured in this signed receipt. Verify its signature below to confirm its integrity.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="sources-panel glass-card-static" aria-labelledby="sources-title">
        <div className="sources-heading">
          <div><span className="receipt-kicker">SOURCE TRACE</span><h2 id="sources-title">Evidence considered</h2></div>
          <span>{candidates.length} chunks · {distinctSources} documents</span>
        </div>
        {candidates.length === 0 ? (
          <p className="sources-empty">{receipt.status === 'blocked' ? 'Search did not run because the request was blocked by a security rule.' : 'No evidence passed the retrieval and grading checks for this question.'}</p>
        ) : (
          <div className="source-list">
            {candidates.slice(0, 12).map((candidate) => {
              const contextNumber = contextByChunk.get(candidate.chunk_id);
              const wasCited = contextNumber !== undefined && citedBlocks.has(Number(contextNumber));
              const evidenceState = wasCited ? 'Cited in verified answer' : contextNumber !== undefined ? 'In context, not cited' : 'Graded, not used in context';
              return (
                <article className="source-row" key={candidate.chunk_id}>
                  <span className={`source-state-dot ${wasCited ? 'source-cited' : ''}`} />
                  <div className="source-row-main">
                    <div className="source-row-title"><strong>{candidate.title || 'Untitled source'}</strong><span className={`badge badge-${candidate.stale ? 'pending' : 'ok'}`}>{candidate.stale ? 'Stale' : 'Fresh'}</span></div>
                    <p>{evidenceState} · {candidate.source_type || 'document'}{candidate.stale ? ' · source may need an update' : ''}</p>
                  </div>
                  <div className="source-relevance"><strong>{Math.round((candidate.score || 0) * 100)}%</strong><small>evidence score</small></div>
                </article>
              );
            })}
            {candidates.length > 12 && <p className="sources-footnote">Showing 12 of {candidates.length} graded evidence chunks. The complete record is in the receipt payload below.</p>}
          </div>
        )}
      </section>

      {/* Verification */}
      <div className="glass-card-static" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <span className="receipt-kicker">TAMPER CHECK</span>
            <h3 style={{ marginTop: 4, fontSize: '1rem', fontWeight: 600 }}>Receipt integrity</h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleVerify} disabled={verifying}>
            {verifying ? 'Checking…' : 'Verify receipt'}
          </button>
        </div>

        {verification && (
          <div className={`animate-slide-down`} style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: verification.valid ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
            border: `1px solid ${verification.valid ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
            color: verification.valid ? 'var(--emerald-400)' : 'var(--rose-400)',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}>
            {verification.valid ? 'Signature valid. The receipt payload matches its signed record.' : verification.error ? `Could not verify this receipt: ${verification.error}` : 'Signature invalid. The receipt may have changed since it was created.'}
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div className="receipt-kicker" style={{ marginBottom: 6 }}>
            Signed fingerprint
          </div>
          <code style={{ fontSize: '0.75rem', color: 'var(--violet-400)', wordBreak: 'break-all', lineHeight: 1.6 }}>
            {receipt.signature}
          </code>
        </div>
      </div>

      {/* Payload */}
      <div className="glass-card-static">
        <details className="raw-payload">
          <summary><span><strong>Technical receipt payload</strong><small>For auditors and developers · JSON format</small></span><span className="payload-chevron">＋</span></summary>
          <pre className="json-viewer"><JsonViewer data={receipt.payload} /></pre>
        </details>
      </div>

      {/* Metadata */}
      <div className="receipt-metadata">
        Receipt ID: <code style={{ color: 'var(--violet-400)' }}>{receipt.id}</code> · Created: {new Date(receipt.created_at).toLocaleString()}
      </div>

      <style jsx>{`
        .receipt-detail-page { max-width:1000px; margin:0 auto; }
        .receipt-back-link { color:var(--text-muted); font-size:.78rem; }
        .receipt-kicker { color:var(--text-muted); font-size:.61rem; font-weight:750; letter-spacing:.13em; }
        .receipt-question { margin-top:10px; padding:14px 16px; border-left:2px solid var(--violet-500); border-radius:0 12px 12px 0; background:rgba(101,190,181,.055); color:var(--text-secondary)!important; font-size:.92rem!important; line-height:1.6; }
        .trace-panel, .sources-panel { margin-bottom:18px; padding:clamp(18px, 3vw, 26px); }
        .trace-panel-heading, .sources-heading { display:flex; justify-content:space-between; align-items:center; gap:14px; }
        .trace-panel-heading h2, .sources-heading h2 { margin-top:4px; color:var(--text-primary); font-size:1.12rem; letter-spacing:-.025em; }
        .trace-outcome { padding:5px 10px; border-radius:var(--radius-full); font-size:.65rem; font-weight:750; text-transform:uppercase; }
        .trace-answered { color:var(--emerald-400); background:rgba(16,185,129,.1); }
        .trace-abstained { color:var(--amber-400); background:rgba(245,158,11,.1); }
        .trace-blocked { color:var(--rose-400); background:rgba(244,63,94,.1); }
        .trace-intro { max-width:720px; margin:9px 0 7px; color:var(--text-secondary); font-size:.78rem; line-height:1.65; }
        .trace-stages { list-style:none; margin-top:8px; }
        .trace-stages li { display:grid; grid-template-columns:30px minmax(0,1fr); gap:13px; padding:15px 0; border-top:1px solid var(--border-glass); }
        .trace-stage-number { display:grid; place-items:center; width:27px; height:27px; border:1px solid var(--border-default); border-radius:50%; color:var(--text-accent); font-size:.63rem; font-weight:750; }
        .trace-stage-title { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
        .trace-stage-title h3 { color:var(--text-primary); font-size:.84rem; font-weight:650; }
        .trace-stage-title span { color:var(--text-muted); font-size:.56rem; font-weight:750; letter-spacing:.1em; }
        .trace-stage-content > p { margin-top:4px; color:var(--text-secondary); font-size:.75rem; line-height:1.6; }
        .trace-stage-content > small { display:block; margin-top:6px; color:var(--text-muted); font-size:.68rem; }
        .trace-query-list { display:flex; flex-wrap:wrap; gap:6px; margin-top:9px; list-style:none; }
        .trace-query-list li { padding:5px 8px; border:1px solid var(--border-glass); border-radius:8px; background:rgba(11,17,27,.35); color:var(--text-secondary); font-size:.67rem; }
        .trace-dropped { margin-top:9px; color:var(--text-muted); font-size:.7rem; }
        .trace-dropped summary { width:fit-content; cursor:pointer; }
        .trace-dropped ul { margin:7px 0 0 17px; color:var(--text-secondary); line-height:1.8; }
        .trace-dropped small { display:block; margin-top:4px; color:var(--text-muted); }
        .sources-heading > span { color:var(--text-muted); font-size:.7rem; }
        .source-list { margin-top:14px; }
        .source-row { display:flex; align-items:center; gap:12px; padding:13px 0; border-top:1px solid var(--border-glass); }
        .source-state-dot { width:8px; height:8px; flex:none; border-radius:50%; background:var(--text-muted); }
        .source-cited { background:var(--emerald-400); box-shadow:0 0 10px rgba(52,211,153,.3); }
        .source-row-main { flex:1; min-width:0; }
        .source-row-title { display:flex; align-items:center; gap:8px; }
        .source-row-title strong { overflow:hidden; color:var(--text-primary); font-size:.78rem; text-overflow:ellipsis; white-space:nowrap; }
        .source-row-title .badge { padding:2px 7px; font-size:.54rem; }
        .source-row-main p { margin-top:3px; color:var(--text-muted); font-size:.67rem; }
        .source-relevance { min-width:88px; text-align:right; }
        .source-relevance strong, .source-relevance small { display:block; }
        .source-relevance strong { color:var(--text-primary); font-size:.8rem; }
        .source-relevance small { color:var(--text-muted); font-size:.58rem; }
        .sources-empty, .sources-footnote { margin-top:12px; color:var(--text-muted); font-size:.75rem; }
        .sources-footnote { padding-top:10px; border-top:1px solid var(--border-glass); }
        .raw-payload summary { display:flex; justify-content:space-between; align-items:center; gap:12px; cursor:pointer; list-style:none; }
        .raw-payload summary::-webkit-details-marker { display:none; }
        .raw-payload summary strong, .raw-payload summary small { display:block; }
        .raw-payload summary strong { color:var(--text-primary); font-size:.82rem; }
        .raw-payload summary small { margin-top:2px; color:var(--text-muted); font-size:.68rem; }
        .payload-chevron { color:var(--text-accent); font-size:1.1rem; }
        .raw-payload[open] .payload-chevron { transform:rotate(45deg); }
        .raw-payload .json-viewer { margin-top:14px; }
        .receipt-metadata { margin-top:14px; color:var(--text-muted); font-size:.68rem; text-align:right; overflow-wrap:anywhere; }
        @media (max-width:640px) { .trace-panel-heading, .sources-heading { align-items:flex-start; } .source-relevance { min-width:66px; } .receipt-question { font-size:.82rem!important; } }
      `}</style>
    </div>
  );
}
