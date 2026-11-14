'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireRole } from '@/lib/auth';
import { getEvidenceChanges } from '@/lib/api';

export default function EvidenceChangesPage() {
  const { user, loading: authLoading, hasRole } = useRequireRole('manager', 'admin');
  const [changes, setChanges] = useState([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const loadKey = `${user?.id || ''}:${refreshKey}`;
  const loading = loadedKey !== loadKey;

  useEffect(() => {
    if (!user || !hasRole) return undefined;
    let active = true;
    getEvidenceChanges(100)
      .then((items) => {
        if (active) {
          setChanges(items);
          setError('');
          setLoadedKey(loadKey);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Source changes could not be loaded.');
          setLoadedKey(loadKey);
        }
      });
    return () => { active = false; };
  }, [user, hasRole, loadKey]);

  if (authLoading) return null;
  if (!hasRole) {
    return <div className="empty-state" style={{ minHeight: '60vh' }}><h3>Manager access required</h3></div>;
  }

  const impactedTotal = changes.reduce((total, item) => total + item.impacted_answers, 0);

  return (
    <div className="change-radar-page animate-fade-in">
      <Link href="/dashboard" className="radar-back">← Back to overview</Link>

      <header className="radar-header">
        <div>
          <span className="radar-eyebrow">KNOWLEDGE HEALTH · CHANGE RADAR</span>
          <h1>Answers that may need a second look</h1>
          <p>When synced source content changes, ESAKIP compares its revision history with past cited evidence. Review those answers against the latest source.</p>
        </div>
        <div className="radar-metrics">
          <div><strong>{loading ? '—' : changes.length}</strong><span>source changes</span></div>
          <div><strong>{loading ? '—' : impactedTotal}</strong><span>prior cited answers</span></div>
        </div>
      </header>

      {error && (
        <div className="radar-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRefreshKey((key) => key + 1)}>Retry</button>
        </div>
      )}

      <div className="radar-list" aria-live="polite">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <div className="radar-skeleton" key={index} />)
        ) : changes.length === 0 && !error ? (
          <section className="radar-empty glass-card-static">
            <span className="radar-empty-icon">↻</span>
            <h2>No changed sources to review</h2>
            <p>New and updated content from this point forward will be versioned. When a changed source was cited in earlier answers, those answers will appear here.</p>
            <Link href="/connectors" className="btn btn-secondary btn-sm">Review data sources</Link>
          </section>
        ) : (
          changes.map((item) => (
            <article className="radar-card glass-card-static" key={`${item.document_id}-${item.version}`}>
              <div className="radar-card-main">
                <div className="radar-card-meta">
                  <span className="radar-source-type">{item.source_type}</span>
                  <span className="radar-date">Indexed {new Date(item.changed_at).toLocaleString()}</span>
                </div>
                <h2>{item.title}</h2>
                <p>Content changed after version {item.previous_version} was indexed. Current revision: {item.version}.</p>
                <Link href={`/documents/${item.document_id}`} className="radar-document-link">Open current source <span>→</span></Link>
              </div>
              <div className={`radar-impact ${item.impacted_answers > 0 ? 'has-impact' : ''}`}>
                <strong>{item.impacted_answers}</strong>
                <span>{item.impacted_answers === 1 ? 'prior answer cited this source' : 'prior answers cited this source'}</span>
                {item.impacted_answers > 0 && <small>Compare those answers with the current source before relying on them.</small>}
              </div>
            </article>
          ))
        )}
      </div>

      <p className="radar-footnote">Impact counts include answers that cited the changed source; they do not imply those answers are incorrect. Historical version tracking starts when a source is first indexed after this feature is enabled.</p>

      <style jsx>{`
        .change-radar-page { max-width:1100px; margin:0 auto; padding-bottom:28px; }
        .radar-back { color:var(--text-muted); font-size:.78rem; }
        .radar-header { display:flex; justify-content:space-between; align-items:flex-end; gap:28px; margin:26px 0 24px; }
        .radar-eyebrow { color:var(--text-accent); font-size:.62rem; font-weight:750; letter-spacing:.14em; }
        .radar-header h1 { margin-top:8px; color:var(--text-primary); font-size:clamp(1.6rem, 3vw, 2.15rem); letter-spacing:-.04em; }
        .radar-header p { max-width:680px; margin-top:8px; color:var(--text-secondary); font-size:.83rem; line-height:1.7; }
        .radar-metrics { display:flex; gap:10px; flex:none; }
        .radar-metrics div { min-width:105px; padding:13px 15px; border:1px solid var(--border-glass); border-radius:14px; background:var(--bg-glass); }
        .radar-metrics strong, .radar-metrics span { display:block; }
        .radar-metrics strong { color:var(--text-primary); font-size:1.3rem; }
        .radar-metrics span { margin-top:3px; color:var(--text-muted); font-size:.62rem; }
        .radar-list { display:flex; flex-direction:column; gap:12px; }
        .radar-card { display:grid; grid-template-columns:minmax(0,1fr) minmax(190px,260px); gap:22px; padding:20px; }
        .radar-card-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
        .radar-source-type { padding:4px 8px; border:1px solid var(--border-glass); border-radius:999px; color:var(--text-accent); font-size:.61rem; text-transform:capitalize; }
        .radar-date { color:var(--text-muted); font-size:.66rem; }
        .radar-card-main h2 { margin-top:10px; color:var(--text-primary); font-size:1rem; }
        .radar-card-main p { margin-top:5px; color:var(--text-secondary); font-size:.74rem; line-height:1.6; }
        .radar-document-link { display:inline-block; margin-top:11px; color:var(--text-accent); font-size:.72rem; font-weight:650; }
        .radar-document-link span { margin-left:3px; }
        .radar-impact { display:flex; flex-direction:column; justify-content:center; padding:14px 16px; border:1px solid var(--border-glass); border-radius:13px; background:rgba(255,255,255,.02); }
        .radar-impact.has-impact { border-color:rgba(245,158,11,.25); background:rgba(245,158,11,.055); }
        .radar-impact strong { color:var(--text-primary); font-size:1.5rem; }
        .radar-impact span { color:var(--text-secondary); font-size:.7rem; }
        .radar-impact small { margin-top:7px; color:var(--amber-400); font-size:.64rem; line-height:1.5; }
        .radar-empty { padding:42px 24px; text-align:center; }
        .radar-empty-icon { color:var(--text-accent); font-size:1.8rem; }
        .radar-empty h2 { margin-top:10px; color:var(--text-primary); font-size:1rem; }
        .radar-empty p { max-width:540px; margin:8px auto 16px; color:var(--text-secondary); font-size:.75rem; line-height:1.6; }
        .radar-skeleton { height:145px; border:1px solid var(--border-glass); border-radius:18px; background:var(--bg-glass); animation:pulse 1.5s ease-in-out infinite; }
        .radar-error { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:14px; padding:12px 14px; border:1px solid rgba(244,63,94,.25); border-radius:12px; color:var(--rose-400); font-size:.75rem; }
        .radar-footnote { margin-top:14px; color:var(--text-muted); font-size:.65rem; line-height:1.6; }
        @keyframes pulse { 50% { opacity:.5; } }
        @media (max-width:760px) { .radar-header { align-items:flex-start; flex-direction:column; } .radar-metrics { width:100%; } .radar-metrics div { flex:1; } .radar-card { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
