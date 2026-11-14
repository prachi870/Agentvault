'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bell, FilePlus2, RefreshCw, RotateCw } from 'lucide-react';
import { useRequireAuth } from '@/lib/auth';
import { getKnowledgeUpdates } from '@/lib/api';

const DATE_RANGES = [7, 30, 90];

export default function KnowledgeUpdatesPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [updates, setUpdates] = useState([]);
  const [days, setDays] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const loadKey = `${user?.id || ''}:${days}:${refreshKey}`;
  const loading = Boolean(user) && loadedKey !== loadKey;

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    getKnowledgeUpdates(days)
      .then((items) => {
        if (!active) return;
        setUpdates(items);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.message || 'Knowledge updates could not be loaded.');
      })
      .finally(() => {
        if (active) setLoadedKey(loadKey);
      });
    return () => { active = false; };
  }, [user, days, loadKey]);

  if (authLoading || !user) return null;

  const addedCount = updates.filter((item) => item.change_type === 'added').length;
  const updatedCount = updates.length - addedCount;

  return (
    <main className="updates-page">
      <header className="updates-header">
        <div>
          <span className="updates-eyebrow">YOUR KNOWLEDGE FEED</span>
          <h1>Knowledge updates</h1>
          <p>Recent source additions and revisions you are allowed to access.</p>
        </div>
        <div className="updates-actions">
          <div className="updates-ranges" aria-label="Update time range">
            {DATE_RANGES.map((range) => (
              <button
                type="button"
                key={range}
                className={`btn btn-sm ${days === range ? 'btn-primary' : 'btn-ghost'}`}
                aria-pressed={days === range}
                onClick={() => setDays(range)}
              >
                {range}d
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'updates-spinning' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <section className="updates-summary" aria-label="Update summary">
        <div><strong>{loading ? '—' : updates.length}</strong><span>updates in this period</span></div>
        <div><strong>{loading ? '—' : addedCount}</strong><span>new sources</span></div>
        <div><strong>{loading ? '—' : updatedCount}</strong><span>revised sources</span></div>
      </section>

      {error && (
        <div className="updates-error" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRefreshKey((key) => key + 1)}>Retry</button>
        </div>
      )}

      <div className="updates-list" aria-live="polite">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => <div className="updates-skeleton" key={index} />)
        ) : updates.length === 0 && !error ? (
          <section className="updates-empty glass-card-static">
            <Bell size={24} />
            <h2>No recent knowledge updates</h2>
            <p>New sources and indexed content revisions you can access will appear here. This feed is limited to the last {days} days; older source history is not backfilled.</p>
            <Link href="/documents" className="btn btn-secondary btn-sm">Open knowledge library</Link>
          </section>
        ) : (
          updates.map((item) => (
            <article className="updates-card glass-card-static" key={`${item.document_id}-${item.version}`}>
              <div className={`updates-type ${item.change_type}`}>
                {item.change_type === 'added' ? <FilePlus2 size={16} /> : <RotateCw size={16} />}
                {item.change_type === 'added' ? 'New source' : `Updated · v${item.version}`}
              </div>
              <div className="updates-content">
                <div className="updates-meta">
                  <span>{item.source_type}</span>
                  <span className={`badge badge-${item.classification}`}>{item.classification}</span>
                  <time dateTime={item.changed_at}>{new Date(item.changed_at).toLocaleString()}</time>
                </div>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                <Link href={`/documents/${item.document_id}`} className="updates-source-link">
                  Open source <ArrowUpRight size={14} />
                </Link>
              </div>
              {item.impacted_answers > 0 && (
                <div className="updates-impact">
                  <strong>{item.impacted_answers}</strong>
                  <span>earlier answers cited the previous version</span>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <p className="updates-footnote">Only sources you can currently access are shown. History starts when a source is first indexed or revised with version tracking enabled. A revision or cited-answer count does not mean an earlier answer was incorrect.</p>

      <style jsx>{`
        .updates-page { max-width:1100px; margin:0 auto; padding-bottom:28px; }
        .updates-header { display:flex; justify-content:space-between; align-items:flex-end; gap:24px; flex-wrap:wrap; margin:8px 0 22px; }
        .updates-eyebrow { color:var(--text-accent); font-size:.65rem; font-weight:750; letter-spacing:.13em; }
        .updates-header h1 { margin-top:8px; color:var(--text-primary); font-size:clamp(1.6rem, 3vw, 2.15rem); letter-spacing:-.04em; }
        .updates-header p { margin-top:8px; color:var(--text-secondary); font-size:.82rem; line-height:1.6; }
        .updates-actions,.updates-ranges { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
        .updates-actions :global(svg) { margin-right:5px; vertical-align:middle; }
        .updates-spinning { animation:spin .8s linear infinite; }
        .updates-summary { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin:0 0 18px; }
        .updates-summary div { padding:13px 15px; border:1px solid var(--border-glass); border-radius:14px; background:var(--bg-glass); }
        .updates-summary strong,.updates-summary span { display:block; }
        .updates-summary strong { color:var(--text-primary); font-size:1.25rem; }
        .updates-summary span { margin-top:3px; color:var(--text-muted); font-size:.65rem; }
        .updates-list { display:flex; flex-direction:column; gap:11px; }
        .updates-card { display:grid; grid-template-columns:130px minmax(0,1fr) minmax(150px,210px); align-items:start; gap:18px; padding:19px; }
        .updates-type { display:inline-flex; align-items:center; gap:6px; color:var(--text-accent); font-size:.68rem; font-weight:700; }
        .updates-type.added { color:var(--emerald-400); }
        .updates-content { min-width:0; }
        .updates-meta { display:flex; align-items:center; gap:9px; flex-wrap:wrap; color:var(--text-muted); font-size:.65rem; }
        .updates-meta > span:first-child { text-transform:capitalize; }
        .updates-meta time { margin-left:auto; }
        .updates-content h2 { margin-top:8px; color:var(--text-primary); font-size:.98rem; }
        .updates-content p { margin-top:6px; color:var(--text-secondary); font-size:.75rem; line-height:1.6; }
        .updates-source-link { display:inline-flex; align-items:center; gap:4px; margin-top:10px; color:var(--text-accent); font-size:.7rem; font-weight:650; }
        .updates-impact { display:flex; flex-direction:column; align-self:stretch; justify-content:center; padding:12px; border:1px solid rgba(245,158,11,.25); border-radius:12px; background:rgba(245,158,11,.055); }
        .updates-impact strong { color:var(--text-primary); font-size:1.35rem; }
        .updates-impact span { color:var(--text-secondary); font-size:.65rem; line-height:1.5; }
        .updates-empty { padding:40px 22px; text-align:center; }
        .updates-empty :global(svg) { color:var(--text-accent); }
        .updates-empty h2 { margin-top:10px; color:var(--text-primary); font-size:1rem; }
        .updates-empty p { max-width:520px; margin:8px auto 16px; color:var(--text-secondary); font-size:.74rem; line-height:1.6; }
        .updates-skeleton { height:130px; border:1px solid var(--border-glass); border-radius:16px; background:var(--bg-glass); animation:pulse 1.5s ease-in-out infinite; }
        .updates-error { display:flex; justify-content:space-between; align-items:center; gap:14px; margin-bottom:14px; padding:12px 14px; border:1px solid rgba(244,63,94,.25); border-radius:12px; color:var(--rose-400); font-size:.75rem; }
        .updates-footnote { margin-top:13px; color:var(--text-muted); font-size:.65rem; line-height:1.6; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 50% { opacity:.5; } }
        @media (max-width:760px) {
          .updates-header { align-items:flex-start; flex-direction:column; }
          .updates-card { grid-template-columns:1fr; }
          .updates-impact { max-width:240px; }
        }
        @media (max-width:480px) { .updates-summary { grid-template-columns:1fr; } }
      `}</style>
    </main>
  );
}
