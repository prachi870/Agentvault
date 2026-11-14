'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/auth';
import { addSampleLibrary, listDocuments, deleteDocument } from '@/lib/api';
import Link from 'next/link';
import UploadModal from '@/components/UploadModal';

export default function DocumentsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [sampleNotice, setSampleNotice] = useState('');
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    if (!user) return;
    listDocuments(LIMIT, offset)
      .then((data) => {
        setDocs(data);
        setError('');
      })
      .catch((err) => {
        setDocs([]);
        setError(err.message || 'Could not load documents. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [user, offset, refreshKey]);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this document? This will also remove all its chunks from the vector store.')) return;
    setDeleting(id);
    try {
      await deleteDocument(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.message || 'Could not delete this document.');
    } finally {
      setDeleting(null);
    }
  };

  const handleLoadSamples = async () => {
    setLoadingSamples(true);
    setError('');
    setSampleNotice('');
    try {
      const result = await addSampleLibrary();
      setSampleNotice(
        result.added
          ? `Added ${result.added} fictional sample documents.`
          : 'The sample library is already loaded; no duplicates were added.'
      );
      setOffset(0);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Could not add the sample library.');
    } finally {
      setLoadingSamples(false);
    }
  };

  const canManage = user?.role === 'manager' || user?.role === 'admin';
  const visibleDocs = docs.filter((doc) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || `${doc.title} ${doc.source_type}`.toLowerCase().includes(term);
    return matchesSearch && (classificationFilter === 'all' || doc.classification === classificationFilter);
  });

  if (authLoading) return null;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Knowledge library</h1>
        <p>Explore the sources that ground your team’s answers, with access rules visible at a glance.</p>
      </div>

      <div className="document-toolbar">
        <div className="document-filters">
          <label className="document-search">
            <span aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or source" aria-label="Search documents" />
          </label>
          <select className="select document-classification" value={classificationFilter} onChange={(event) => setClassificationFilter(event.target.value)} aria-label="Filter by classification">
            <option value="all">All classifications</option>
            <option value="public">Public</option>
            <option value="internal">Internal</option>
            <option value="confidential">Confidential</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
        <div className="document-actions">
          <span>{visibleDocs.length} of {docs.length} shown</span>
          {canManage && (
            <button className="btn btn-secondary" onClick={handleLoadSamples} disabled={loadingSamples}>
              {loadingSamples ? '⏳ Adding samples…' : '＋ Load sample library'}
            </button>
          )}
          {canManage && <button className="btn btn-primary" onClick={() => setShowUpload(true)}>＋ Add documents</button>}
        </div>
      </div>

      {error && <div className="error-banner" role="alert">{error}<button className="btn btn-ghost btn-sm" onClick={() => setRefreshKey((key) => key + 1)}>Retry</button></div>}
      {sampleNotice && <div className="sample-notice" role="status">{sampleNotice} Includes fictional leave, travel, security, and support guidance; it is safe to load again.</div>}

      <div className="document-table-scroll data-table-wrapper glass-card-static" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Source</th>
              <th>Classification</th>
              <th>Roles</th>
              <th>Chunks</th>
              <th>Flagged</th>
              <th>Status</th>
              <th>Indexed</th>
              {canManage && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: canManage ? 9 : 8 }).map((_, j) => (
                    <td key={j}><div className="skeleton skeleton-text" /></td>
                  ))}
                </tr>
              ))
            ) : visibleDocs.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 9 : 8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📄</div>
                    <h3>{docs.length ? 'No matching documents' : 'Your knowledge library is empty'}</h3>
                    <p>{docs.length ? 'Try another search or classification.' : 'Add source files or connect a repository to give Agentvault trusted material to search.'}</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleDocs.map((doc) => (
                <tr key={doc.id} className="clickable-row">
                  <td>
                    <Link href={`/documents/${doc.id}`} style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                      {doc.title.length > 50 ? doc.title.slice(0, 50) + '…' : doc.title}
                    </Link>
                  </td>
                  <td>
                    <span className="badge badge-new">{doc.source_type}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${doc.classification}`}>{doc.classification}</span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: 120 }}>
                    {doc.allowed_roles?.join(', ') || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>{doc.chunk_count}</td>
                  <td style={{ textAlign: 'center' }}>
                    {doc.flagged_chunks > 0 ? (
                      <span style={{ color: 'var(--amber-400)', fontWeight: 600 }}>{doc.flagged_chunks}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>0</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${doc.status === 'indexed' ? 'ok' : doc.status}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(doc.indexed_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ color: 'var(--rose-400)' }}
                        onClick={() => handleDelete(doc.id)}
                        disabled={deleting === doc.id}
                        title="Delete document"
                      >
                        {deleting === doc.id ? '⏳' : '🗑'}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && docs.length > 0 && (
        <div className="pagination">
          <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0}>← Prev</button>
          <span className="page-info">Showing {offset + 1}–{offset + docs.length}</span>
          <button onClick={() => setOffset(offset + LIMIT)} disabled={docs.length < LIMIT}>Next →</button>
        </div>
      )}

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={(doc) => {
            setDocs((prev) => [doc, ...prev]);
          }}
        />
      )}
      <style jsx>{`
        .document-toolbar { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:18px; }
        .document-filters { display:flex; gap:10px; flex:1; min-width:0; }
        .document-search { display:flex; align-items:center; gap:10px; width:min(420px, 100%); min-height:44px; padding:0 13px; border:1px solid var(--border-default); border-radius:var(--radius-md); background:var(--bg-input); color:var(--text-muted); }
        .document-search span { font-size:1.4rem; line-height:1; }
        .document-search input { width:100%; border:0; outline:0; background:transparent; color:var(--text-primary); font:inherit; font-size:.85rem; }
        .document-search input::placeholder { color:var(--text-muted); }
        .document-classification { width:190px; color-scheme:dark; color:var(--text-primary); }
        .document-classification option { background:#10232c; color:#e5eff0; }
        .document-actions { display:flex; align-items:center; gap:10px; flex-wrap:wrap; color:var(--text-muted); font-size:.78rem; white-space:nowrap; }
        .error-banner { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px; padding:10px 14px; border:1px solid rgba(244,63,94,.3); border-radius:var(--radius-md); color:var(--rose-400); background:rgba(244,63,94,.08); }
        .sample-notice { margin-bottom:16px; padding:10px 14px; border:1px solid rgba(16,185,129,.25); border-radius:var(--radius-md); color:var(--emerald-400); background:rgba(16,185,129,.07); font-size:.82rem; }
        .document-table-scroll { width:100%; overflow-x:auto; overscroll-behavior-x:contain; }
        .document-table-scroll :global(.data-table) { width:100%; min-width:1080px; border-collapse:separate; border-spacing:0; }
        .document-table-scroll :global(.data-table th) { padding:14px 12px; color:var(--text-muted); font-size:.68rem; font-weight:700; letter-spacing:.045em; text-align:left; text-transform:uppercase; white-space:nowrap; }
        .document-table-scroll :global(.data-table td) { padding:13px 12px; border-top:1px solid var(--border-glass); color:var(--text-secondary); font-size:.78rem; vertical-align:top; }
        .document-table-scroll :global(.data-table td:first-child), .document-table-scroll :global(.data-table th:first-child) { padding-left:18px; }
        .document-table-scroll :global(.data-table td:nth-child(4)) { min-width:170px; max-width:230px; line-height:1.55; overflow-wrap:anywhere; }
        .document-table-scroll :global(.data-table td:nth-child(8)) { white-space:nowrap; }
        .document-table-scroll :global(.data-table tbody tr:hover td) { background:rgba(255,255,255,.025); }
        @media (max-width:760px) { .document-toolbar, .document-filters { align-items:stretch; flex-direction:column; } .document-search, .document-classification { width:100%; } .document-actions { justify-content:space-between; } }
      `}</style>
    </div>
  );
}
