'use client';

import { useState, useEffect, useRef } from 'react';
import { useRequireAuth } from '@/lib/auth';
import { listUsers, simulateUserAccessImpact, updateUser } from '@/lib/api';

const ROLES = ['viewer', 'employee', 'manager', 'admin'];
const CLEARANCE_LEVELS = {
  viewer: 0,
  employee: 1,
  manager: 2,
  admin: 3
};

export default function UsersPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(null);
  const [accessImpact, setAccessImpact] = useState(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [impactError, setImpactError] = useState('');
  const impactRequestRef = useRef(0);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (authLoading || !isAdmin) return undefined;
    let active = true;
    listUsers()
      .then((data) => {
        if (active) setUsers(data || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load users');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [authLoading, isAdmin]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.is_active : !u.is_active);
    return matchesSearch && matchesRole && matchesStatus;
  });
  const protectsLastAdmin = Boolean(
    editingUser &&
    editingUser.is_active &&
    editingUser.role === 'admin' &&
    users.filter((item) => item.is_active && item.role === 'admin').length <= 1
    && (draft?.role !== 'admin' || !draft?.is_active)
  );

  useEffect(() => {
    if (!editingUser || !draft) return undefined;
    const requestId = ++impactRequestRef.current;
    const timer = window.setTimeout(async () => {
      setImpactLoading(true);
      setImpactError('');
      try {
        const impact = await simulateUserAccessImpact(editingUser.id, {
          role: draft.role,
          clearance: Number(draft.clearance),
          is_active: draft.is_active,
        });
        if (impactRequestRef.current === requestId) setAccessImpact(impact);
      } catch (err) {
        if (impactRequestRef.current === requestId) {
          setAccessImpact(null);
          setImpactError(err.message || 'Access impact could not be calculated.');
        }
      } finally {
        if (impactRequestRef.current === requestId) setImpactLoading(false);
      }
    }, 160);
    return () => {
      window.clearTimeout(timer);
      impactRequestRef.current += 1;
    };
  }, [editingUser, draft]);

  const beginEdit = (selectedUser) => {
    setEditingUser(selectedUser);
    setAccessImpact(null);
    setImpactError('');
    setDraft({
      role: selectedUser.role,
      clearance: selectedUser.clearance,
      department: selectedUser.department || '',
      is_active: selectedUser.is_active,
    });
    setError('');
    setNotice('');
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!editingUser || !draft) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateUser(editingUser.id, {
        role: draft.role,
        clearance: Number(draft.clearance),
        department: draft.department.trim(),
        is_active: draft.is_active,
      });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEditingUser(null);
      setDraft(null);
      setAccessImpact(null);
      setNotice(`Access settings saved for ${updated.full_name || updated.email}.`);
    } catch (err) {
      setError(err.message || 'Could not update this account.');
    } finally {
      setSaving(false);
    }
  };
  const impactReady = Boolean(
    accessImpact &&
    !impactLoading &&
    !impactError &&
    accessImpact.proposed_role === draft?.role &&
    accessImpact.proposed_clearance === Number(draft?.clearance) &&
    accessImpact.proposed_active === draft?.is_active
  );
  const impactPending = !impactError && !impactReady;

  const getRoleBadgeColor = (role) => {
    const colors = {
      viewer: 'var(--slate-400)',
      employee: 'var(--blue-400)',
      manager: 'var(--violet-400)',
      admin: 'var(--rose-400)'
    };
    return colors[role] || 'var(--gray-400)';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading || (loading && isAdmin)) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
        <style jsx>{`
          .page-container {
            padding: 40px;
            max-width: 1400px;
            margin: 0 auto;
          }
          .loading-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            padding: 60px 20px;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-default);
            border-top-color: var(--violet-500);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="page-container">
        <div className="error-state">
          <span className="error-icon">🔒</span>
          <h2>Access Denied</h2>
          <p>You need administrator privileges to access user management.</p>
          <a href="/chat" className="btn btn-primary">← Back to Chat</a>
        </div>
        <style jsx>{`
          .page-container {
            padding: 40px;
            max-width: 1400px;
            margin: 0 auto;
          }
          .error-state {
            text-align: center;
            padding: 60px 20px;
          }
          .error-icon {
            font-size: 4rem;
            display: block;
            margin-bottom: 20px;
          }
          .error-state h2 {
            font-size: 1.5rem;
            margin-bottom: 8px;
          }
          .error-state p {
            color: var(--text-muted);
            margin-bottom: 24px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1>People & access</h1>
          <p>Manage who can use Agentvault and preview the access their role grants.</p>
        </div>
        <div className="header-right">
          <span className="user-count"><strong>{users.length}</strong> accounts</span>
        </div>
      </div>

      <div className="people-summary">
        <div><span className="summary-label">ACTIVE PEOPLE</span><strong>{users.filter((item) => item.is_active).length}</strong><small>Accounts currently enabled</small></div>
        <div><span className="summary-label">ADMINISTRATORS</span><strong>{users.filter((item) => item.role === 'admin' && item.is_active).length}</strong><small>Full platform access</small></div>
        <div><span className="summary-label">ACCESS MODEL</span><strong>4 <small>levels</small></strong><small>Role + clearance are both enforced</small></div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠</span> {error}
        </div>
      )}
      {notice && <div className="success-banner" role="status">{notice}</div>}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search users by email or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <select 
          value={roleFilter} 
          onChange={(e) => setRoleFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Roles</option>
          <option value="viewer">Viewer</option>
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
          aria-label="Filter by account status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">👤</span>
            <p>{searchTerm || roleFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'No accounts are available yet.'}</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Clearance</th>
                <th>Department</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className={!u.is_active ? 'inactive-row' : ''}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {(u.full_name || u.email).charAt(0).toUpperCase()}
                      </div>
                      <span className="user-name">{u.full_name || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="email-cell">{u.email}</td>
                  <td>
                    <span 
                      className="role-badge" 
                      style={{ backgroundColor: getRoleBadgeColor(u.role) }}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className="clearance-badge">
                      Level {u.clearance}
                    </span>
                  </td>
                  <td className="dept-cell">{u.department || '-'}</td>
                  <td>
                    <span className={`status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? '● Active' : '○ Inactive'}
                    </span>
                  </td>
                  <td className="date-cell">{formatDate(u.created_at)}</td>
                  <td>
                    <div className="actions-cell">
                      <button 
                        className="btn-icon" 
                        title="Edit user"
                        onClick={() => beginEdit(u)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon" 
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => beginEdit(u)}
                      >
                        {u.is_active ? '🔓' : '🔒'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingUser && draft && (
        <div className="modal-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setEditingUser(null);
        }}>
          <form className="modal-content access-editor" onSubmit={saveUser} aria-labelledby="access-editor-title">
            <div className="modal-header">
              <div>
                <span className="summary-label">ACCOUNT ACCESS</span>
                <h2 id="access-editor-title">{editingUser.full_name || editingUser.email}</h2>
                <p>{editingUser.email}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingUser(null)} aria-label="Close access editor" disabled={saving}>×</button>
            </div>
            <div className="access-fields">
              <div className="input-group">
                <label htmlFor="access-role">Role</label>
                <select id="access-role" className="select" value={draft.role} disabled={editingUser.id === user.id} onChange={(event) => {
                  const role = event.target.value;
                  setDraft((current) => ({ ...current, role, clearance: CLEARANCE_LEVELS[role] }));
                }}>
                  {ROLES.map((role) => <option key={role} value={role}>{role[0].toUpperCase() + role.slice(1)}</option>)}
                </select>
                {editingUser.id === user.id && <small className="field-note">You can’t change your own role here.</small>}
                {protectsLastAdmin && <small className="field-note">At least one active administrator must remain.</small>}
              </div>
              <div className="input-group">
                <label htmlFor="access-clearance">Document clearance</label>
                <select id="access-clearance" className="select" value={draft.clearance} onChange={(event) => setDraft((current) => ({ ...current, clearance: Number(event.target.value) }))}>
                  <option value={0}>0 · Public</option>
                  <option value={1}>1 · Internal</option>
                  <option value={2}>2 · Confidential</option>
                  <option value={3}>3 · Restricted</option>
                </select>
              </div>
              <div className="input-group access-wide">
                <label htmlFor="access-department">Department</label>
                <input id="access-department" className="input" maxLength={64} value={draft.department} onChange={(event) => setDraft((current) => ({ ...current, department: event.target.value }))} placeholder="e.g. Research & Development" />
              </div>
            </div>
            <div className="access-preview">
              <span className="preview-lock">⌑</span>
              <div><strong>Access model</strong><p>Document visibility is evaluated against the current role, proposed clearance, and each document’s allowed roles. Nothing changes until you save.</p></div>
            </div>
            <section className="impact-panel" aria-live="polite" aria-labelledby="impact-title">
              <div className="impact-heading">
                <div>
                  <span className="summary-label">WHAT CHANGES?</span>
                  <h3 id="impact-title">Access impact simulation</h3>
                </div>
                {impactReady && <span className="simulation-badge">● SIMULATED</span>}
              </div>
              {(impactLoading || impactPending) && <p className="impact-state">Rechecking document permissions…</p>}
              {impactError && <p className="impact-state impact-error" role="alert">{impactError}</p>}
              {impactReady && (
                <>
                  <div className="impact-stats">
                    <div><span>BEFORE</span><strong>{accessImpact.totals.current}</strong><small>documents accessible</small></div>
                    <div><span>AFTER</span><strong>{accessImpact.totals.proposed}</strong><small>documents accessible</small></div>
                    <div className="gain-stat"><span>NEW ACCESS</span><strong>+{accessImpact.totals.newly_granted}</strong><small>documents unlocked</small></div>
                    <div className="revoke-stat"><span>REMOVED</span><strong>−{accessImpact.totals.revoked}</strong><small>documents no longer visible</small></div>
                  </div>
                  <div className="impact-classifications">
                    <div className="impact-row impact-row-header"><span>CLASSIFICATION</span><span>BEFORE</span><span>AFTER</span><span>CHANGE</span></div>
                    {accessImpact.by_classification.map((item) => (
                      <div className="impact-row" key={item.classification}>
                        <span className={`classification-label classification-${item.classification}`}>{item.classification}</span>
                        <span>{item.current}</span>
                        <span>{item.proposed}</span>
                        <span className={item.newly_granted ? 'impact-positive' : item.revoked ? 'impact-negative' : 'impact-neutral'}>
                          {item.newly_granted ? `+${item.newly_granted}` : item.revoked ? `−${item.revoked}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {(accessImpact.newly_granted.length > 0 || accessImpact.revoked.length > 0) ? (
                    <div className="impact-documents">
                      {accessImpact.newly_granted.length > 0 && (
                        <div>
                          <h4>Newly accessible <span>{accessImpact.totals.newly_granted}</span></h4>
                          {accessImpact.newly_granted.map((item) => (
                            <article key={item.id}>
                              <span className={`impact-doc-class classification-${item.classification}`} />
                              <div><strong>{item.title}</strong><small>{item.classification} · {item.reason}</small></div>
                            </article>
                          ))}
                        </div>
                      )}
                      {accessImpact.revoked.length > 0 && (
                        <div>
                          <h4>Access removed <span>{accessImpact.totals.revoked}</span></h4>
                          {accessImpact.revoked.map((item) => (
                            <article key={item.id}>
                              <span className={`impact-doc-class classification-${item.classification}`} />
                              <div><strong>{item.title}</strong><small>{item.classification} · {item.reason}</small></div>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="impact-no-changes">No documents change visibility with these settings.</p>
                  )}
                  {(accessImpact.totals.newly_granted > accessImpact.newly_granted.length || accessImpact.totals.revoked > accessImpact.revoked.length) && (
                    <p className="impact-sample-note">Showing up to {accessImpact.sample_limit} example documents in each group; totals include all documents.</p>
                  )}
                </>
              )}
            </section>
            <label className={`account-toggle ${editingUser.id === user.id ? 'toggle-disabled' : ''}`}>
              <input
                type="checkbox"
                checked={draft.is_active}
                disabled={editingUser.id === user.id}
                onChange={(event) => setDraft((current) => ({ ...current, is_active: event.target.checked }))}
              />
              <span><strong>Account enabled</strong><small>{draft.is_active ? 'This person can sign in to Agentvault.' : 'This person cannot sign in while disabled.'}</small></span>
            </label>
            {editingUser.id === user.id && <p className="field-note">For security, your own account can’t be disabled here.</p>}
            {protectsLastAdmin && <p className="field-note">This is the last active administrator, so it can’t be disabled or downgraded.</p>}
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setEditingUser(null)} disabled={saving}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !impactReady || protectsLastAdmin}>{saving ? 'Saving access…' : 'Save access'}</button>
            </div>
          </form>
        </div>
      )}

      <style jsx>{`
        .page-container {
          padding: 40px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: clamp(1.7rem, 2.4vw, 2.2rem);
          font-weight: 800;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-header p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .people-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin: 0 0 24px;
        }
        .people-summary > div {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 2px 12px;
          padding: 18px 20px;
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          background: var(--gradient-card);
        }
        .summary-label { color: var(--text-muted); font-size: 0.66rem; font-weight: 700; letter-spacing: 0.12em; }
        .people-summary strong { grid-column: 2; grid-row: 1 / span 2; color: var(--text-primary); font-size: 1.65rem; letter-spacing: -0.04em; }
        .people-summary strong small { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }
        .people-summary > div > small { grid-column: 1; color: var(--text-muted); font-size: 0.75rem; }

        .user-count {
          background: var(--bg-glass);
          border: 1px solid var(--border-glass);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
        }

        .error-banner {
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--rose-400);
        }
        .success-banner {
          padding: 12px 16px;
          margin-bottom: 20px;
          border-radius: var(--radius-md);
          color: var(--emerald-400);
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.24);
          font-size: 0.85rem;
        }

        .filters-bar {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }

        .search-box {
          flex: 1;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 1rem;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px 12px 40px;
          background: var(--bg-glass);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          color: var(--text-primary);
        }

        .search-input:focus {
          outline: none;
          border-color: var(--violet-500);
        }
        .search-input, .filter-select {
          min-height: 44px;
          background-color: var(--bg-input);
          border-color: var(--border-default);
          color: var(--text-primary);
        }

        .filter-select {
          padding: 12px 16px;
          background: var(--bg-glass);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          font-size: 0.9rem;
          color: var(--text-primary);
          cursor: pointer;
        }

        .users-table-container {
          background: var(--bg-glass);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: 32px;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
        }

        .users-table thead {
          background: var(--bg-elevated);
        }

        .users-table th {
          padding: 14px 16px;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-default);
        }

        .users-table td {
          padding: 16px;
          border-bottom: 1px solid var(--border-glass);
          font-size: 0.875rem;
        }

        .users-table tr:last-child td {
          border-bottom: none;
        }

        .users-table tr:hover {
          background: var(--bg-elevated);
        }

        .inactive-row {
          opacity: 0.6;
        }

        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          color: white;
        }

        .user-name {
          font-weight: 600;
        }

        .email-cell {
          color: var(--text-muted);
          font-family: monospace;
          font-size: 0.8rem;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: white;
        }

        .clearance-badge {
          display: inline-block;
          padding: 4px 10px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .dept-cell {
          color: var(--text-muted);
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.15);
          color: var(--emerald-400);
        }

        .status-badge.inactive {
          background: rgba(100, 116, 139, 0.15);
          color: var(--slate-400);
        }

        .date-cell {
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        .actions-cell {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          padding: 6px 10px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: var(--bg-glass);
          border-color: var(--violet-500);
          transform: translateY(-1px);
        }
        .access-editor { max-width: 580px; }
        .access-editor .modal-header { align-items: flex-start; }
        .access-editor .modal-header h2 { margin-top: 5px; font-size: 1.2rem; }
        .access-editor .modal-header p { color: var(--text-muted); font-size: 0.82rem; margin-top: 2px; }
        .access-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .access-wide { grid-column: 1 / -1; }
        .field-note { display: block; margin-top: 5px; color: var(--text-muted); font-size: 0.74rem; }
        .access-preview {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          padding: 14px;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          background: rgba(101, 190, 181, 0.06);
        }
        .preview-lock { color: var(--cyan-400); font-size: 1.1rem; }
        .access-preview strong { font-size: 0.82rem; }
        .access-preview p { margin-top: 3px; color: var(--text-secondary); font-size: 0.78rem; line-height: 1.55; }
        .impact-panel { margin-top:18px; padding:16px; border:1px solid var(--border-glass); border-radius:var(--radius-lg); background:rgba(11,17,27,.42); }
        .impact-heading { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:14px; }
        .impact-heading h3 { margin-top:3px; color:var(--text-primary); font-size:.94rem; font-weight:650; }
        .simulation-badge { color:var(--emerald-400); font-size:.62rem; font-weight:700; letter-spacing:.08em; }
        .impact-state { padding:18px 4px; color:var(--text-secondary); font-size:.8rem; }
        .impact-error { color:var(--rose-400); }
        .impact-stats { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:8px; }
        .impact-stats > div { padding:11px 10px; border:1px solid var(--border-glass); border-radius:var(--radius-md); background:rgba(27,41,57,.48); }
        .impact-stats span, .impact-stats strong, .impact-stats small { display:block; }
        .impact-stats span { color:var(--text-muted); font-size:.57rem; font-weight:700; letter-spacing:.08em; }
        .impact-stats strong { margin-top:3px; color:var(--text-primary); font-size:1.28rem; line-height:1.3; }
        .impact-stats small { color:var(--text-muted); font-size:.62rem; line-height:1.35; }
        .impact-stats .gain-stat strong { color:var(--emerald-400); }
        .impact-stats .revoke-stat strong { color:var(--amber-400); }
        .impact-classifications { margin-top:15px; }
        .impact-row { display:grid; grid-template-columns:1.5fr .65fr .65fr .75fr; align-items:center; gap:8px; min-height:32px; border-top:1px solid var(--border-glass); color:var(--text-secondary); font-size:.72rem; }
        .impact-row > :not(:first-child) { text-align:right; }
        .impact-row-header { min-height:24px; border-top:0; color:var(--text-muted); font-size:.55rem; font-weight:700; letter-spacing:.06em; }
        .classification-label { text-transform:capitalize; }
        .classification-public { color:var(--emerald-400); }
        .classification-internal { color:var(--blue-400); }
        .classification-confidential { color:var(--amber-400); }
        .classification-restricted { color:var(--rose-400); }
        .impact-positive { color:var(--emerald-400); font-weight:700; }
        .impact-negative { color:var(--amber-400); font-weight:700; }
        .impact-neutral { color:var(--text-muted); }
        .impact-documents { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:13px; }
        .impact-documents h4 { display:flex; justify-content:space-between; margin-bottom:6px; color:var(--text-secondary); font-size:.71rem; }
        .impact-documents h4 span { color:var(--text-muted); }
        .impact-documents article { display:flex; gap:8px; padding:8px 0; border-top:1px solid var(--border-glass); }
        .impact-doc-class { width:7px; height:7px; margin-top:5px; flex:none; border-radius:50%; background:currentColor; }
        .impact-documents article div { min-width:0; }
        .impact-documents article strong, .impact-documents article small { display:block; }
        .impact-documents article strong { overflow:hidden; color:var(--text-primary); font-size:.69rem; text-overflow:ellipsis; white-space:nowrap; }
        .impact-documents article small { margin-top:2px; color:var(--text-muted); font-size:.61rem; line-height:1.4; }
        .impact-no-changes, .impact-sample-note { margin-top:10px; color:var(--text-muted); font-size:.7rem; }
        .account-toggle { display: flex; gap: 12px; align-items: center; margin-top: 18px; cursor: pointer; }
        .account-toggle input { width: 17px; height: 17px; accent-color: var(--violet-500); }
        .account-toggle span { display: flex; flex-direction: column; }
        .account-toggle strong { font-size: 0.84rem; }
        .account-toggle small { color: var(--text-muted); font-size: 0.75rem; }
        .toggle-disabled { cursor: not-allowed; opacity: 0.65; }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }

        .empty-icon {
          font-size: 4rem;
          display: block;
          margin-bottom: 16px;
          opacity: 0.3;
        }

        .empty-state p {
          color: var(--text-muted);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .stat-card {
          background: var(--bg-glass);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 20px;
          text-align: center;
        }

        .stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        @media (max-width: 760px) {
          .people-summary { grid-template-columns: 1fr; }
          .filters-bar { flex-wrap: wrap; }
          .filters-bar > * { min-width: 100%; }
        }
        @media (max-width: 520px) {
          .access-fields { grid-template-columns: 1fr; }
          .access-wide { grid-column: auto; }
          .modal-content { padding: 22px; }
          .impact-stats { grid-template-columns:repeat(2, minmax(0, 1fr)); }
          .impact-documents { grid-template-columns:1fr; }
        }
      `}</style>
    </div>
  );
}
