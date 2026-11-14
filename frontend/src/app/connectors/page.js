'use client';

import { useState, useEffect } from 'react';
import { useRequireRole } from '@/lib/auth';
import { listConnectors, createConnector, syncConnector, deleteConnector, getConnectorOverview } from '@/lib/api';

export default function ConnectorsPage() {
  const { user, loading: authLoading, hasRole } = useRequireRole('admin');
  const [connectors, setConnectors] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [syncing, setSyncing] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Create form
  const [name, setName] = useState('');
  const [kind, setKind] = useState('directory');
  const [sourceType, setSourceType] = useState('drive');
  const [config, setConfig] = useState('{}');
  const [defaultClassification, setDefaultClassification] = useState('internal');
  const [defaultRoles, setDefaultRoles] = useState('');
  const [syncInterval, setSyncInterval] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [conns, ov] = await Promise.all([listConnectors(), getConnectorOverview()]);
      setConnectors(conns);
      setOverview(ov);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (!user || !hasRole) return undefined;
    let active = true;
    Promise.all([listConnectors(), getConnectorOverview()])
      .then(([conns, ov]) => {
        if (!active) return;
        setConnectors(conns);
        setOverview(ov);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user, hasRole]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      let parsedConfig;
      try { parsedConfig = JSON.parse(config); } catch { throw new Error('Invalid JSON in config'); }
      const roles = defaultRoles.split(',').map((r) => r.trim()).filter(Boolean);
      const body = {
        name, kind, source_type: sourceType, config: parsedConfig,
        default_classification: defaultClassification,
        default_allowed_roles: roles,
      };
      if (syncInterval) body.sync_interval_minutes = parseInt(syncInterval, 10);
      const conn = await createConnector(body);
      setConnectors((prev) => [...prev, conn]);
      setShowCreate(false);
      resetForm();
    } catch (err) {
      setCreateError(err.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setName(''); setKind('directory'); setSourceType('drive'); setConfig('{}');
    setDefaultClassification('internal'); setDefaultRoles(''); setSyncInterval(''); setCreateError('');
  };

  const handleSync = async (id) => {
    setSyncing(id);
    setSyncResult(null);
    try {
      const result = await syncConnector(id);
      setSyncResult({ id, ...result });
      fetchData();
    } catch (err) {
      setSyncResult({ id, error: err.message });
    }
    setSyncing(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this connector and all its synced documents?')) return;
    setDeleting(id);
    try {
      await deleteConnector(id);
      setConnectors((prev) => prev.filter((c) => c.id !== id));
    } catch { /* ignore */ }
    setDeleting(null);
  };

  if (authLoading) return null;

  if (!hasRole) {
    return (
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <div className="empty-state-icon">🔒</div>
        <h3>Admin access required</h3>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Connectors</h1>
        <p>Manage enterprise source connectors — sync, configure, and monitor</p>
      </div>

      <div className="toolbar">
        <div className="toolbar-group">
          {overview && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Available kinds: {overview.available_kinds?.join(', ')}
              {overview.planned_sources?.length > 0 && ` · Planned: ${overview.planned_sources.join(', ')}`}
            </span>
          )}
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '✕ Cancel' : '+ New Connector'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass-card-static animate-slide-down" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>New Connector</h3>
          <form onSubmit={handleCreate}>
            {createError && (
              <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--rose-400)', fontSize: '0.8rem', marginBottom: 16 }}>
                ⚠ {createError}
              </div>
            )}
            <div className="form-grid">
              <div className="input-group">
                <label htmlFor="conn-name">Name</label>
                <input id="conn-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="e.g. Engineering Docs" />
              </div>
              <div className="input-group">
                <label htmlFor="conn-kind">Kind</label>
                <select id="conn-kind" className="select" value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="directory">Directory</option>
                  <option value="sql">SQL</option>
                  <option value="confluence">Confluence</option>
                  <option value="jira">Jira</option>
                  <option value="notion">Notion</option>
                  <option value="sharepoint">SharePoint</option>
                  <option value="drive">Google Drive</option>
                  <option value="email">Email (IMAP)</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="conn-source">Source Type</label>
                <select id="conn-source" className="select" value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                  {['upload', 'pdf', 'sharepoint', 'confluence', 'jira', 'notion', 'sql', 'email', 'drive'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="conn-class">Default Classification</label>
                <select id="conn-class" className="select" value={defaultClassification} onChange={(e) => setDefaultClassification(e.target.value)}>
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="confidential">Confidential</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="conn-roles">Default Allowed Roles</label>
                <input id="conn-roles" className="input" value={defaultRoles} onChange={(e) => setDefaultRoles(e.target.value)} placeholder="* or comma-separated" />
              </div>
              <div className="input-group">
                <label htmlFor="conn-interval">Sync Interval (minutes)</label>
                <input id="conn-interval" className="input" type="number" min="5" value={syncInterval} onChange={(e) => setSyncInterval(e.target.value)} placeholder="Empty = manual only" />
              </div>
              <div className="input-group full-width">
                <label htmlFor="conn-config">Config JSON</label>
                <textarea id="conn-config" className="textarea mono" value={config} onChange={(e) => setConfig(e.target.value)} rows={4} placeholder='{ "path": "/data/..." }' />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={creating}>
                {creating ? '⏳ Creating…' : '✓ Create Connector'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sync Result */}
      {syncResult && (
        <div className="animate-slide-down" style={{
          padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16,
          background: syncResult.error ? 'rgba(244,63,94,0.1)' : 'rgba(16,185,129,0.1)',
          border: `1px solid ${syncResult.error ? 'rgba(244,63,94,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: syncResult.error ? 'var(--rose-400)' : 'var(--emerald-400)',
          fontSize: '0.8125rem',
        }}>
          {syncResult.error
            ? `❌ Sync failed: ${syncResult.error}`
            : `✅ Synced "${syncResult.connector}" — ${JSON.stringify(syncResult.stats)}`}
          <button onClick={() => setSyncResult(null)} style={{ float: 'right', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Connectors List */}
      <div className="data-table-wrapper glass-card-static" style={{ padding: 0 }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Source</th>
              <th>Status</th>
              <th>Docs</th>
              <th>Last Sync</th>
              <th>Interval</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="skeleton skeleton-text" /></td>
                  ))}
                </tr>
              ))
            ) : connectors.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🔌</div>
                    <h3>No connectors configured</h3>
                    <p>Add a connector to sync documents from enterprise sources</p>
                  </div>
                </td>
              </tr>
            ) : (
              connectors.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.name}</td>
                  <td><span className="badge badge-new">{c.kind}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.source_type}</td>
                  <td>
                    <span className={`badge badge-${c.status === 'ok' || c.status === 'synced' ? 'ok' : c.status === 'error' ? 'error' : 'pending'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{c.doc_count}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : '—'}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {c.sync_interval_minutes ? `${c.sync_interval_minutes}m` : 'Manual'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => handleSync(c.id)}
                        disabled={syncing === c.id}
                        title="Sync now"
                      >
                        {syncing === c.id ? '⏳' : '🔄'}
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        style={{ color: 'var(--rose-400)' }}
                        onClick={() => handleDelete(c.id)}
                        disabled={deleting === c.id}
                        title="Delete"
                      >
                        {deleting === c.id ? '⏳' : '🗑'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Error display for connectors */}
      {connectors.some((c) => c.last_error) && (
        <div className="glass-card-static" style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--rose-400)', marginBottom: 12 }}>⚠️ Connector Errors</h3>
          {connectors.filter((c) => c.last_error).map((c) => (
            <div key={c.id} style={{ padding: '8px 12px', background: 'rgba(244,63,94,0.06)', borderRadius: 'var(--radius-sm)', marginBottom: 6, fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}:</span>{' '}
              <span style={{ color: 'var(--rose-400)' }}>{c.last_error}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
