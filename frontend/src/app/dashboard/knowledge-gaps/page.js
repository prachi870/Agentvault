'use client';

import { useState, useEffect } from 'react';
import { useRequireRole } from '@/lib/auth';
import { getKnowledgeGaps, updateKnowledgeGapFollowUp } from '@/lib/api';
import Link from 'next/link';

export default function KnowledgeGapsPage() {
  const { user, loading: authLoading, hasRole } = useRequireRole('manager', 'admin');
  const [gaps, setGaps] = useState([]);
  const [filter, setFilter] = useState('open');
  const [loadedKey, setLoadedKey] = useState('');
  const [savingGap, setSavingGap] = useState(null);
  const [error, setError] = useState('');
  const loadKey = `${user?.id || ''}:${filter}`;
  const loading = loadedKey !== loadKey;

  useEffect(() => {
    if (!user || !hasRole) return;
    let active = true;
    getKnowledgeGaps(filter, 100)
      .then((data) => {
        if (active) {
          setGaps(data);
          setError('');
          setLoadedKey(loadKey);
        }
      })
      .catch((err) => {
        if (active) {
          setGaps([]);
          setError(err.message || 'Knowledge gaps could not be loaded.');
          setLoadedKey(loadKey);
        }
      });
    return () => { active = false; };
  }, [user, hasRole, filter, loadKey]);

  const handleSaveFollowUp = async (gap, event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSavingGap(gap.id);
    try {
      const updated = await updateKnowledgeGapFollowUp(gap.id, {
        assigned_to: formData.get('assigned_to') || null,
        next_step: formData.get('next_step') || null,
        status: formData.get('follow_up_status'),
      });
      setGaps((prev) => (
        filter === 'open' && updated.status === 'resolved'
          ? prev.filter((item) => item.id !== gap.id)
          : prev.map((item) => (item.id === gap.id ? updated : item))
      ));
      setError('');
    } catch (err) {
      setError(err.message || 'Follow-up could not be saved.');
    } finally {
      setSavingGap(null);
    }
  };

  if (authLoading) return null;

  if (!hasRole) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">🔒</div>
        <h3>Access Denied</h3>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 16 }}>
        <Link href="/dashboard" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>← Back to Dashboard</Link>
      </div>

      <div className="page-header">
        <h1>Knowledge Gaps</h1>
        <p>Queries where Agentvault abstained or had low confidence — aggregated by topic</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-group">
          <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 140 }}>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {gaps.length} gap{gaps.length !== 1 ? 's' : ''}
        </span>
      </div>

      {error && <div className="gap-error" role="alert">{error}</div>}

      <div className="data-table-wrapper glass-card-static" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Sample Query</th>
              <th>Reason</th>
              <th>Occurrences</th>
              <th>Status</th>
              <th>First Seen</th>
              <th>Last Seen</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j}><div className="skeleton skeleton-text" /></td>
                  ))}
                </tr>
              ))
            ) : gaps.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🧩</div>
                    <h3>{error ? 'Knowledge gaps unavailable' : 'No knowledge gaps'}</h3>
                    <p>{filter === 'open' ? 'Great! No unresolved gaps.' : 'No gaps match this filter.'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              gaps.map((g) => (
                <tr key={g.id}>
                  <td style={{ maxWidth: 300, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {g.sample_query.length > 80 ? g.sample_query.slice(0, 80) + '…' : g.sample_query}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{g.reason}</td>
                  <td>
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: g.occurrences > 5 ? 'rgba(244,63,94,0.12)' : 'rgba(139,92,246,0.12)',
                      color: g.occurrences > 5 ? 'var(--rose-400)' : 'var(--violet-400)',
                      fontWeight: 600,
                      fontSize: '0.8rem',
                    }}>
                      {g.occurrences}
                    </span>
                  </td>
                  <td><span className={`badge badge-${g.follow_up?.status === 'in_progress' ? 'pending' : g.status}`}>{g.follow_up?.status === 'in_progress' ? 'in progress' : g.status}</span></td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(g.first_seen).toLocaleDateString()}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{new Date(g.last_seen).toLocaleDateString()}</td>
                  <td>
                    <details className="gap-follow-up">
                      <summary>{g.follow_up ? 'Edit follow-up' : 'Plan follow-up'}</summary>
                      <form onSubmit={(event) => handleSaveFollowUp(g, event)}>
                        <label>
                          Owner
                          <input name="assigned_to" defaultValue={g.follow_up?.assigned_to || ''} maxLength={255} placeholder="Person or team" />
                        </label>
                        <label>
                          Next step
                          <textarea name="next_step" defaultValue={g.follow_up?.next_step || ''} maxLength={4000} rows={3} placeholder="What source needs to be added or corrected?" />
                        </label>
                        <label>
                          Work status
                          <select name="follow_up_status" defaultValue={g.follow_up?.status || g.status}>
                            <option value="open">Open</option>
                            <option value="in_progress">In progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </label>
                        <button className="btn btn-sm btn-secondary" type="submit" disabled={savingGap === g.id}>
                          {savingGap === g.id ? 'Saving…' : 'Save plan'}
                        </button>
                        {g.follow_up?.verification_receipt_id && <small className="gap-verified">A later answer resolved this gap.</small>}
                      </form>
                    </details>
                    {g.last_receipt_id && (
                      <Link href={`/receipts/${g.last_receipt_id}`} className="btn btn-sm btn-ghost" title="View last receipt">
                        🧾
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .gap-error { margin-bottom:14px; padding:11px 14px; border:1px solid rgba(244,63,94,.25); border-radius:12px; color:var(--rose-400); font-size:.75rem; }
        .gap-follow-up { min-width:190px; }
        .gap-follow-up summary { width:fit-content; color:var(--text-accent); font-size:.7rem; font-weight:650; cursor:pointer; }
        .gap-follow-up form { display:flex; flex-direction:column; gap:9px; min-width:235px; margin-top:10px; padding:12px; border:1px solid var(--border-glass); border-radius:12px; background:var(--bg-elevated); }
        .gap-follow-up label { display:flex; flex-direction:column; gap:4px; color:var(--text-muted); font-size:.64rem; }
        .gap-follow-up input, .gap-follow-up textarea, .gap-follow-up select { width:100%; padding:7px 8px; border:1px solid var(--border-default); border-radius:8px; background:var(--bg-input); color:var(--text-primary); font:inherit; font-size:.7rem; }
        .gap-follow-up textarea { resize:vertical; }
        .gap-verified { color:var(--emerald-400); font-size:.62rem; }
      `}</style>
    </div>
  );
}
