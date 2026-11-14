'use client';

import { useEffect, useState } from 'react';
import { useRequireRole } from '@/lib/auth';
import { getDashboardHealth } from '@/lib/api';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Download,
  RefreshCw,
  Shield,
  Target,
} from 'lucide-react';
import Link from 'next/link';

const DATE_RANGES = [7, 14, 30, 90];

function percentage(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function MetricCard({ icon, label, value, detail }) {
  return (
    <article className="analytics-card">
      <div className="analytics-card-heading">
        <span className="analytics-icon">{icon}</span>
        <span>{label}</span>
      </div>
      <strong className="analytics-value">{value}</strong>
      <p className="analytics-detail">{detail}</p>
    </article>
  );
}

function exportCsv(data) {
  const rows = [
    ['Metric', 'Value'],
    ['Window (days)', data.window_days],
    ['Total queries', data.queries.total],
    ['Answered queries', data.queries.answered],
    ['Abstained queries', data.queries.abstained],
    ['Blocked queries', data.queries.blocked],
    ['Abstain rate', percentage(data.queries.abstain_rate)],
    ['Average confidence', percentage(data.quality.avg_confidence)],
    ['Average grounding', percentage(data.quality.avg_grounding)],
    ['Stale source rate', percentage(data.quality.stale_source_rate)],
    ['Low-confidence answers', data.quality.low_confidence_answers],
    ['P50 latency (ms)', data.latency_ms.p50],
    ['P95 latency (ms)', data.latency_ms.p95],
    ['Documents', data.knowledge.documents],
    ['Indexed chunks', data.knowledge.chunks],
    ['Stale documents', data.knowledge.stale_documents],
    ['Open knowledge gaps', data.knowledge.open_knowledge_gaps],
    ['Prompt-injection events', data.security.injection_events],
    ['Flagged chunks', data.security.flagged_chunks_indexed],
    ...Object.entries(data.components || {}).map(([name, value]) => [`Component: ${name}`, value]),
    ...Object.entries(data.knowledge.connectors || {}).map(([name, value]) => [`Connector: ${name}`, value]),
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `agentvault-analytics-${data.window_days}d.csv`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function AnalyticsPage() {
  const { loading: authLoading, hasRole } = useRequireRole('manager', 'admin');
  const [days, setDays] = useState(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState(null);
  const [loadedRequestKey, setLoadedRequestKey] = useState(null);
  const [requestError, setRequestError] = useState({ key: null, message: '' });
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestKey = `${days}:${refreshKey}`;
  const loading = !authLoading && hasRole && loadedRequestKey !== requestKey;
  const error = requestError.key === requestKey ? requestError.message : '';

  useEffect(() => {
    if (authLoading || !hasRole) return undefined;
    let active = true;
    getDashboardHealth(days)
      .then((result) => {
        if (!active) return;
        setData(result);
        setLastUpdated(new Date());
        setRequestError({ key: requestKey, message: '' });
      })
      .catch((err) => {
        if (active) setRequestError({ key: requestKey, message: err.message || 'Analytics could not be loaded.' });
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey);
      });
    return () => { active = false; };
  }, [authLoading, hasRole, days, requestKey]);

  if (authLoading) {
    return <div className="analytics-state"><span className="analytics-spinner" />Loading analytics…</div>;
  }

  if (!hasRole) {
    return (
      <div className="analytics-state">
        <span className="analytics-lock">🔒</span>
        <h2>Access denied</h2>
        <p>Manager or administrator access is required to view analytics.</p>
        <Link href="/chat" className="btn btn-primary">Back to chat</Link>
      </div>
    );
  }

  const queries = data?.queries || {};
  const quality = data?.quality || {};
  const latency = data?.latency_ms || {};
  const knowledge = data?.knowledge || {};
  const security = data?.security || {};
  const connectors = Object.entries(knowledge.connectors || {});
  const components = Object.entries(data?.components || {});

  return (
    <main className="analytics-page">
      <header className="analytics-header">
        <div>
          <span className="analytics-eyebrow">WORKSPACE INSIGHTS</span>
          <h1>Analytics</h1>
          <p>Live usage, answer quality, knowledge coverage, and system health.</p>
          {lastUpdated && (
            <small className="analytics-updated">
              Updated {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              {loading ? ' · Refreshing…' : ''}
            </small>
          )}
        </div>
        <div className="analytics-actions">
          <div className="analytics-ranges" aria-label="Analytics time range">
            {DATE_RANGES.map((range) => (
              <button
                key={range}
                type="button"
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
            <RefreshCw size={16} className={loading ? 'analytics-refreshing' : ''} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => data && exportCsv(data)}
            disabled={!data || loading}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </header>

      {error && (
        <div className="analytics-error" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRefreshKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="analytics-state"><span className="analytics-spinner" />Loading workspace metrics…</div>
      ) : !data ? (
        <div className="analytics-state">Analytics are unavailable until the API responds.</div>
      ) : (
        <>
          {queries.total === 0 && (
            <div className="analytics-notice">
              No questions were recorded in the last {data.window_days} days. Ask questions in the chat to start building usage and answer-quality metrics.
            </div>
          )}

          <section aria-labelledby="usage-title">
            <div className="analytics-section-heading">
              <div><h2 id="usage-title">Usage & answer quality</h2><p>Query and evidence metrics for the selected period.</p></div>
            </div>
            <div className="analytics-grid">
              <MetricCard icon={<BarChart3 size={18} />} label="Total questions" value={queries.total ?? 0} detail={`${queries.answered ?? 0} answered · ${queries.abstained ?? 0} abstained · ${queries.blocked ?? 0} blocked`} />
              <MetricCard icon={<Target size={18} />} label="Average confidence" value={percentage(quality.avg_confidence)} detail={`${quality.low_confidence_answers ?? 0} low-confidence answers`} />
              <MetricCard icon={<Activity size={18} />} label="Evidence grounding" value={percentage(quality.avg_grounding)} detail="Average share of answer claims supported by evidence" />
              <MetricCard icon={<AlertTriangle size={18} />} label="Abstain rate" value={percentage(queries.abstain_rate)} detail="Questions the system could not answer confidently" />
              <MetricCard icon={<Clock size={18} />} label="P95 response time" value={`${latency.p95 ?? 0} ms`} detail={`Median response: ${latency.p50 ?? 0} ms`} />
              <MetricCard icon={<Activity size={18} />} label="Stale-source answers" value={percentage(quality.stale_source_rate)} detail="Answered queries that relied on a stale source" />
            </div>
          </section>

          <section aria-labelledby="knowledge-title">
            <div className="analytics-section-heading">
              <div><h2 id="knowledge-title">Knowledge base</h2><p>Documents and follow-up work currently in the workspace.</p></div>
              <Link href="/documents" className="analytics-link">Open library →</Link>
            </div>
            <div className="analytics-grid">
              <MetricCard icon={<Database size={18} />} label="Documents" value={knowledge.documents ?? 0} detail={`${knowledge.chunks ?? 0} indexed text chunks`} />
              <MetricCard icon={<Clock size={18} />} label="Stale documents" value={knowledge.stale_documents ?? 0} detail="Sources past the configured freshness window" />
              <MetricCard icon={<Target size={18} />} label="Open knowledge gaps" value={knowledge.open_knowledge_gaps ?? 0} detail="Unanswered or insufficiently supported topics" />
              <MetricCard icon={<Database size={18} />} label="Data sources" value={connectors.length} detail={`${connectors.filter(([, status]) => status === 'ok').length} reporting healthy`} />
            </div>
          </section>

          <section aria-labelledby="security-title">
            <div className="analytics-section-heading">
              <div><h2 id="security-title">Safety & service health</h2><p>Security events and dependency status.</p></div>
              <Link href="/security" className="analytics-link">Open security →</Link>
            </div>
            <div className="analytics-grid analytics-grid-compact">
              <MetricCard icon={<Shield size={18} />} label="Blocked queries" value={security.blocked_queries ?? 0} detail="Blocked in the selected period" />
              <MetricCard icon={<AlertTriangle size={18} />} label="Injection events" value={security.injection_events ?? 0} detail="Prompt-injection signals detected" />
              <MetricCard icon={<Shield size={18} />} label="Flagged indexed chunks" value={security.flagged_chunks_indexed ?? 0} detail="Chunks flagged by ingestion checks" />
            </div>
            <div className="analytics-status-list" aria-label="Service status">
              {components.map(([name, status]) => {
                const healthy = typeof status === 'boolean' ? status : true;
                return (
                  <div className="analytics-status" key={name}>
                    <span className={`analytics-status-dot ${healthy ? 'is-healthy' : 'is-unhealthy'}`} />
                    <span className="analytics-status-name">{name.replace(/_/g, ' ')}</span>
                    <strong>{typeof status === 'boolean' ? (status ? 'Healthy' : 'Unavailable') : status}</strong>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <style jsx>{`
        .analytics-page { max-width: 1440px; margin: 0 auto; padding: 2rem; color: var(--text-primary); }
        .analytics-header { display:flex; justify-content:space-between; align-items:flex-start; gap:1.5rem; flex-wrap:wrap; margin-bottom:2rem; }
        .analytics-eyebrow { color:var(--accent-primary); font-size:.72rem; font-weight:700; letter-spacing:.12em; }
        .analytics-header h1 { margin:.45rem 0; font-size:2rem; font-weight:800; }
        .analytics-header p,.analytics-section-heading p { margin:0; color:var(--text-secondary); }
        .analytics-updated { display:block; margin-top:.65rem; color:var(--text-muted); }
        .analytics-actions,.analytics-ranges { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
        .analytics-actions :global(svg) { margin-right:.35rem; vertical-align:middle; }
        .analytics-section-heading { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin:2rem 0 1rem; }
        .analytics-section-heading h2 { margin:0 0 .3rem; font-size:1.15rem; }
        .analytics-section-heading p { font-size:.88rem; }
        .analytics-link { color:var(--accent-primary); font-weight:600; text-decoration:none; white-space:nowrap; }
        .analytics-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1rem; }
        .analytics-grid-compact { grid-template-columns:repeat(3,minmax(0,1fr)); }
        .analytics-card { min-width:0; padding:1.2rem; border:1px solid var(--border-glass); border-radius:var(--radius-lg); background:var(--glass-bg); }
        .analytics-card-heading { display:flex; align-items:center; gap:.6rem; color:var(--text-secondary); font-size:.83rem; font-weight:600; }
        .analytics-icon { display:inline-flex; color:var(--accent-primary); }
        .analytics-value { display:block; margin:.9rem 0 .35rem; font-size:1.8rem; line-height:1.1; }
        .analytics-detail { margin:0; color:var(--text-muted); font-size:.78rem; line-height:1.5; }
        .analytics-notice,.analytics-error { display:flex; align-items:center; gap:.7rem; margin:1rem 0; padding:.9rem 1rem; border:1px solid var(--border-glass); border-radius:var(--radius-md); background:var(--glass-bg); color:var(--text-secondary); }
        .analytics-error { border-color:rgba(244,63,94,.35); color:var(--rose-400); }
        .analytics-error span { flex:1; }
        .analytics-status-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:.65rem; margin-top:1rem; }
        .analytics-status { display:flex; align-items:center; gap:.55rem; padding:.8rem .9rem; border:1px solid var(--border-glass); border-radius:var(--radius-md); background:var(--glass-bg); font-size:.8rem; }
        .analytics-status-dot { width:.55rem; height:.55rem; border-radius:50%; background:var(--emerald-400); flex:none; }
        .analytics-status-dot.is-unhealthy { background:var(--rose-400); }
        .analytics-status-name { flex:1; color:var(--text-secondary); text-transform:capitalize; }
        .analytics-status strong { color:var(--text-primary); font-size:.76rem; overflow-wrap:anywhere; }
        .analytics-state { display:flex; min-height:220px; flex-direction:column; align-items:center; justify-content:center; gap:1rem; color:var(--text-secondary); text-align:center; }
        .analytics-state h2,.analytics-state p { margin:0; }
        .analytics-lock { font-size:2.5rem; }
        .analytics-spinner { width:32px; height:32px; border:3px solid var(--border-default); border-top-color:var(--accent-primary); border-radius:50%; animation:spin .8s linear infinite; }
        .analytics-refreshing { animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media (max-width:900px) { .analytics-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media (max-width:600px) {
          .analytics-page { padding:1.25rem; }
          .analytics-header h1 { font-size:1.65rem; }
          .analytics-actions { width:100%; align-items:flex-start; }
          .analytics-ranges { width:100%; }
          .analytics-grid,.analytics-grid-compact { grid-template-columns:1fr; }
          .analytics-section-heading { align-items:flex-start; flex-direction:column; }
        }
      `}</style>
    </main>
  );
}
