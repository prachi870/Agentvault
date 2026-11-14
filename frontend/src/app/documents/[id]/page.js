'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth';
import { getDocument, updateDocumentAccess, deleteDocument } from '@/lib/api';
import Link from 'next/link';

export default function DocumentDetailPage() {
  const params = useParams();
  const { user, loading: authLoading } = useRequireAuth();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [classification, setClassification] = useState('');
  const [allowedRoles, setAllowedRoles] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!user || !params.id) return;
    getDocument(params.id)
      .then((d) => {
        setDoc(d);
        setClassification(d.classification);
        setAllowedRoles(d.allowed_roles?.join(', ') || '');
      })
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [user, params.id]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = {};
      if (classification !== doc.classification) body.classification = classification;
      const roles = allowedRoles.split(',').map((r) => r.trim()).filter(Boolean);
      const rolesChanged = JSON.stringify(roles) !== JSON.stringify(doc.allowed_roles);
      if (rolesChanged) body.allowed_roles = roles;

      if (Object.keys(body).length === 0) {
        setEditing(false);
        return;
      }
      const updated = await updateDocumentAccess(params.id, body);
      setDoc(updated);
      setEditing(false);
      setMessage({ type: 'success', text: 'Access updated successfully (Qdrant payloads updated in-place)' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this document and all its chunks?')) return;
    try {
      await deleteDocument(params.id);
      window.location.href = '/documents';
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const isAdmin = user?.role === 'admin';

  if (authLoading || loading) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="skeleton skeleton-title" style={{ marginBottom: 24 }} />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">📄</div>
        <h3>Document not found</h3>
        <Link href="/documents" className="btn btn-secondary" style={{ marginTop: 16 }}>← Back</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Link href="/documents" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>← Back to Documents</Link>
      </div>

      <div className="page-header">
        <h1>{doc.title}</h1>
      </div>

      {message && (
        <div className="animate-slide-down" style={{
          padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 20,
          background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
          color: message.type === 'success' ? 'var(--emerald-400)' : 'var(--rose-400)',
          fontSize: '0.8125rem',
        }}>
          {message.text}
        </div>
      )}

      {/* Metadata */}
      <div className="stats-grid stagger" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Source Type</div>
          <div><span className="badge badge-new">{doc.source_type}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Classification</div>
          <div><span className={`badge badge-${doc.classification}`}>{doc.classification}</span></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Chunks</div>
          <div className="stat-value">{doc.chunk_count}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Flagged</div>
          <div className="stat-value" style={doc.flagged_chunks > 0 ? { background: 'var(--gradient-warning)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } : {}}>
            {doc.flagged_chunks}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="glass-card-static" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.875rem' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em' }}>Status</div>
            <span className={`badge badge-${doc.status === 'indexed' ? 'ok' : doc.status}`}>{doc.status}</span>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em' }}>Allowed Roles</div>
            <span style={{ color: 'var(--text-secondary)' }}>{doc.allowed_roles?.join(', ') || '—'}</span>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em' }}>Source Updated</div>
            <span style={{ color: 'var(--text-secondary)' }}>{new Date(doc.source_updated_at).toLocaleString()}</span>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em' }}>Indexed At</div>
            <span style={{ color: 'var(--text-secondary)' }}>{new Date(doc.indexed_at).toLocaleString()}</span>
          </div>
          {doc.source_uri && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600, letterSpacing: '0.06em' }}>Source URI</div>
              <code style={{ fontSize: '0.8rem', color: 'var(--violet-400)', wordBreak: 'break-all' }}>{doc.source_uri}</code>
            </div>
          )}
        </div>
      </div>

      {/* Access Control Edit (admin only) */}
      {isAdmin && (
        <div className="glass-card-static" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>🔐 Access Control</h3>
            {!editing && (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>✏️ Edit</button>
            )}
          </div>

          {editing ? (
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="edit-class">Classification</label>
                <select id="edit-class" className="select" value={classification} onChange={(e) => setClassification(e.target.value)}>
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="edit-roles">Allowed Roles</label>
                <input id="edit-roles" className="input" value={allowedRoles} onChange={(e) => setAllowedRoles(e.target.value)} placeholder="* or comma-separated roles" />
              </div>
              <div className="full-width" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setClassification(doc.classification); setAllowedRoles(doc.allowed_roles?.join(', ') || ''); }}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? '⏳ Saving…' : '💾 Save'}
                </button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Edit classification and allowed roles. Changes update Qdrant payloads in-place without re-embedding.
            </p>
          )}
        </div>
      )}

      {/* Danger Zone */}
      {(isAdmin || user?.role === 'manager') && (
        <div className="glass-card-static" style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--rose-400)', marginBottom: 8 }}>⚠️ Danger Zone</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            Permanently delete this document and all its chunks from both the database and vector store.
          </p>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑 Delete Document</button>
        </div>
      )}

      <div style={{ marginTop: 16, fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
        ID: <code style={{ color: 'var(--violet-400)' }}>{doc.id}</code>
      </div>
    </div>
  );
}
