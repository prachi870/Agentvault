'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth';
import { listReceipts } from '@/lib/api';
import Link from 'next/link';

export default function ReceiptsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 25;

  useEffect(() => {
    if (!user) return;
    listReceipts(filter || undefined, LIMIT, offset)
      .then((data) => {
        setReceipts(data);
        setError('');
      })
      .catch((err) => {
        setReceipts([]);
        setError(err.message || 'Could not load receipts. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [user, filter, offset, refreshKey]);

  if (authLoading) return null;
  const visibleReceipts = receipts.filter((receipt) => receipt.query.toLowerCase().includes(search.trim().toLowerCase()));
  const verifiedCount = receipts.filter((receipt) => receipt.status === 'answered').length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Evidence ledger</h1>
        <p>Trace every response to its source, quality signals, and tamper-evident context receipt.</p>
      </div>

      <div className="receipt-highlights">
        <div><span className="receipt-highlight-icon">✓</span><span><strong>{verifiedCount}</strong><small>answered on this page</small></span></div>
        <div><span className="receipt-highlight-icon muted-icon">⌑</span><span><strong>{receipts.length}</strong><small>receipts loaded</small></span></div>
        <p>Every receipt can be opened and cryptographically verified.</p>
      </div>

      <div className="receipt-toolbar">
        <label className="receipt-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a question…" aria-label="Search receipt questions" /></label>
        <div className="toolbar-group">
          <select className="select receipt-status-filter" value={filter} onChange={(e) => { setFilter(e.target.value); setOffset(0); }}>
            <option value="">All statuses</option>
            <option value="answered">Answered</option>
            <option value="abstained">Abstained</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>
      {error && <div className="receipt-error" role="alert">{error}<button className="btn btn-ghost btn-sm" onClick={() => setRefreshKey((key) => key + 1)}>Retry</button></div>}

      {/* Table */}
      <div className="data-table-wrapper glass-card-static" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Query</th>
              <th>Status</th>
              <th>Confidence</th>
              <th>Grounding</th>
              <th>Latency</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton skeleton-text" style={{ width: j === 0 ? '90%' : '60%' }} /></td>
                  ))}
                </tr>
              ))
            ) : visibleReceipts.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🧾</div>
                    <h3>{receipts.length ? 'No matching receipts' : 'Your evidence ledger is ready'}</h3>
                    <p>{receipts.length ? 'Try another search or status filter.' : 'As you ask questions, each result will leave a verifiable evidence trail here.'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleReceipts.map((r) => (
                <tr key={r.id} className="clickable-row">
                  <td>
                    <Link href={`/receipts/${r.id}`} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {r.query.length > 60 ? r.query.slice(0, 60) + '…' : r.query}
                    </Link>
                  </td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td style={{ color: r.confidence > 0.7 ? 'var(--emerald-400)' : r.confidence > 0.4 ? 'var(--amber-400)' : 'var(--rose-400)' }}>
                    {Math.round(r.confidence * 100)}%
                  </td>
                  <td>{Math.round(r.grounding * 100)}%</td>
                  <td style={{ color: 'var(--text-muted)' }}>{r.latency_ms}ms</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && receipts.length > 0 && (
        <div className="pagination">
          <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}>
            ← Prev
          </button>
          <span className="page-info">Showing {offset + 1}–{offset + receipts.length}</span>
          <button onClick={() => setOffset(offset + LIMIT)} disabled={receipts.length < LIMIT}>
            Next →
          </button>
        </div>
      )}
      <style jsx>{`
        .receipt-highlights { display:flex; align-items:center; gap:26px; padding:17px 20px; margin-bottom:18px; border:1px solid var(--border-glass); border-radius:var(--radius-lg); background:var(--gradient-card); }
        .receipt-highlights > div { display:flex; align-items:center; gap:10px; }
        .receipt-highlight-icon { width:32px; height:32px; display:grid; place-items:center; border-radius:10px; color:var(--emerald-400); background:rgba(16,185,129,.1); }
        .muted-icon { color:var(--cyan-400); background:rgba(34,211,238,.08); }
        .receipt-highlights strong, .receipt-highlights small { display:block; }
        .receipt-highlights strong { font-size:1.04rem; line-height:1.2; }
        .receipt-highlights small { color:var(--text-muted); font-size:.72rem; }
        .receipt-highlights p { margin-left:auto; color:var(--text-muted); font-size:.78rem; }
        .receipt-toolbar { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:16px; }
        .receipt-search { display:flex; align-items:center; gap:10px; width:min(440px, 100%); min-height:44px; padding:0 13px; border:1px solid var(--border-default); border-radius:var(--radius-md); background:var(--bg-input); color:var(--text-muted); }
        .receipt-search span { font-size:1.4rem; line-height:1; }
        .receipt-search input { width:100%; border:0; outline:0; background:transparent; color:var(--text-primary); font:inherit; font-size:.85rem; }
        .receipt-search input::placeholder { color:var(--text-muted); }
        .receipt-status-filter { width:170px; }
        .receipt-error { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding:10px 14px; border:1px solid rgba(244,63,94,.3); border-radius:var(--radius-md); color:var(--rose-400); background:rgba(244,63,94,.08); }
        @media (max-width:760px) { .receipt-highlights { flex-wrap:wrap; gap:14px; } .receipt-highlights p { width:100%; margin:0; } .receipt-toolbar { align-items:stretch; flex-direction:column; } .receipt-search, .receipt-status-filter { width:100%; } }
      `}</style>
    </div>
  );
}
