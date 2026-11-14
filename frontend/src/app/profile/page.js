'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/lib/auth';
import { updateMyProfile } from '@/lib/api';

export default function ProfilePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const beginEdit = () => {
    setFormData({
      full_name: user.full_name || '',
      department: user.department || '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setMessage({ type: '', text: '' });
    setSaving(true);
    try {
      const updatedUser = await updateMyProfile({
        full_name: formData.full_name.trim(),
        department: formData.department.trim(),
      });
      localStorage.setItem('agentvault_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setMessage({ type: 'success', text: 'Your profile has been updated.' });
      setEditing(false);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Could not update your profile.' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      viewer: 'var(--slate-400)',
      employee: 'var(--blue-400)',
      manager: 'var(--violet-400)',
      admin: 'var(--rose-400)'
    };
    return colors[role] || 'var(--gray-400)';
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      viewer: 'Can view public documents and ask questions',
      employee: 'Can view public and internal documents, ask questions',
      manager: 'Can upload documents, access dashboards, view confidential info',
      admin: 'Full system access including user management and all documents'
    };
    return descriptions[role] || 'No description available';
  };

  const getClearanceDescription = (clearance) => {
    const descriptions = {
      0: 'Public documents only',
      1: 'Public + Internal documents',
      2: 'Public + Internal + Confidential documents',
      3: 'All documents including Restricted'
    };
    return descriptions[clearance] || 'Unknown clearance level';
  };

  if (authLoading || !user) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
        <style jsx>{`
          .page-container {
            padding: 40px;
            max-width: 1000px;
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <h1>My profile</h1>
        <p>Your identity, access level, and account details in one place.</p>
      </div>

      {message.text && (
        <div className={`message-banner ${message.type}`}>
          <span>{message.type === 'success' ? '✓' : '⚠'}</span> {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
          </div>
          <div className="profile-header-info">
            <h2>{user.full_name || 'No name set'}</h2>
            <p className="profile-email">{user.email}</p>
            <div className="profile-badges">
              <span 
                className="role-badge" 
                style={{ backgroundColor: getRoleBadgeColor(user.role) }}
              >
                {user.role}
              </span>
              <span className="clearance-badge">
                Clearance Level {user.clearance}
              </span>
              {user.is_active && (
                <span className="status-badge active">
                  ● Active
                </span>
              )}
            </div>
          </div>
          <div className="profile-header-actions">
            {!editing && (
              <button 
                onClick={beginEdit}
                className="btn btn-secondary"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Editable Fields */}
        <div className="profile-section">
          <h3>Personal Information</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              {editing ? (
                <input
                  type="text"
                  className="input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="field-value">{user.full_name || '-'}</div>
              )}
            </div>
            <div className="form-group">
              <label>Department</label>
              {editing ? (
                <input
                  type="text"
                  className="input"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Engineering, Sales"
                />
              ) : (
                <div className="field-value">{user.department || '-'}</div>
              )}
            </div>
          </div>

          {editing && (
            <div className="form-actions">
              <button 
                onClick={handleSave} 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button 
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    full_name: user.full_name || '',
                    department: user.department || '',
                  });
                }} 
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Read-Only Fields */}
        <div className="profile-section">
          <h3>Account Details</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Email Address</label>
              <div className="field-value">{user.email}</div>
              <small>Cannot be changed</small>
            </div>
            <div className="info-item">
              <label>User ID</label>
              <div className="field-value mono">{user.id}</div>
            </div>
            <div className="info-item">
              <label>Account Created</label>
              <div className="field-value">{formatDate(user.created_at)}</div>
            </div>
            <div className="info-item">
              <label>Tenant ID</label>
              <div className="field-value mono">{user.tenant_id || 'default'}</div>
            </div>
          </div>
        </div>

        {/* Permissions Section */}
        <div className="profile-section">
          <h3>🔐 Permissions & Access</h3>
          
          <div className="permission-card">
            <div className="permission-header">
              <span className="permission-icon">👔</span>
              <div>
                <h4>Role: {user.role}</h4>
                <p>{getRoleDescription(user.role)}</p>
              </div>
            </div>
          </div>

          <div className="permission-card">
            <div className="permission-header">
              <span className="permission-icon">🔑</span>
              <div>
                <h4>Clearance Level: {user.clearance}</h4>
                <p>{getClearanceDescription(user.clearance)}</p>
              </div>
            </div>
          </div>

          <div className="permissions-list">
            <h4>Your Permissions:</h4>
            <ul>
              <li className="perm-item">✅ Ask questions in chat</li>
              <li className="perm-item">✅ View receipts for your queries</li>
              <li className="perm-item">✅ View accessible documents</li>
              {['manager', 'admin'].includes(user.role) && (
                <>
                  <li className="perm-item">✅ Upload documents</li>
                  <li className="perm-item">✅ Access health dashboard</li>
                  <li className="perm-item">✅ View knowledge gaps</li>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <li className="perm-item">✅ Manage users</li>
                  <li className="perm-item">✅ Manage connectors</li>
                  <li className="perm-item">✅ View all receipts</li>
                  <li className="perm-item">✅ Access all documents</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Security Section */}
        <div className="profile-section">
          <h3>Account security</h3>
          <div className="security-actions">
            <div className="security-note">
              <span className="security-note-icon">⌑</span>
              <div><strong>Access is permission-aware</strong><p>Your role and clearance are checked whenever documents are retrieved.</p></div>
            </div>
            <Link href="/receipts" className="btn btn-secondary">View my query history <span aria-hidden="true">→</span></Link>
          </div>
          <p className="security-footnote">Need a password reset or a different access level? Contact your Agentvault administrator.</p>
        </div>
      </div>

      <style jsx>{`
        .page-container {
          padding: 40px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 32px;
        }

        .page-header h1 {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .page-header p {
          color: var(--text-muted);
          font-size: 0.9rem;
        }

        .message-banner {
          padding: 12px 16px;
          border-radius: var(--radius-md);
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .message-banner.success {
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--emerald-400);
        }
        .message-banner.error {
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.3);
          color: var(--rose-400);
        }

        .profile-card {
          background: var(--bg-glass);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-xl);
          overflow: hidden;
        }

        .profile-header {
          background: linear-gradient(110deg, rgba(101, 190, 181, 0.08), transparent 70%), var(--bg-secondary);
          padding: 32px;
          display: flex;
          gap: 24px;
          align-items: flex-start;
          border-bottom: 1px solid var(--border-default);
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 800;
          color: white;
          flex-shrink: 0;
        }

        .profile-header-info {
          flex: 1;
        }

        .profile-header-info h2 {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.035em;
          margin-bottom: 4px;
        }

        .profile-email {
          color: var(--text-muted);
          font-family: monospace;
          font-size: 0.875rem;
          margin-bottom: 12px;
        }

        .profile-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .role-badge {
          display: inline-block;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: white;
        }

        .clearance-badge {
          display: inline-block;
          padding: 6px 14px;
          background: var(--bg-glass);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge.active {
          background: rgba(16, 185, 129, 0.15);
          color: var(--emerald-400);
        }

        .profile-section {
          padding: 32px;
          border-bottom: 1px solid var(--border-glass);
        }

        .profile-section:last-child {
          border-bottom: none;
        }

        .profile-section h3 {
          font-size: 1.125rem;
          font-weight: 700;
          margin-bottom: 24px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .field-value {
          font-size: 1rem;
          padding: 12px 0;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
        }

        .info-item label {
          display: block;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .info-item .field-value {
          font-size: 0.95rem;
          padding: 8px 0;
        }

        .info-item small {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .mono {
          font-family: monospace;
          font-size: 0.85rem;
        }

        .permission-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 20px;
          margin-bottom: 16px;
        }

        .permission-header {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .permission-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .permission-header h4 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .permission-header p {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .permissions-list {
          margin-top: 24px;
        }

        .permissions-list h4 {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .permissions-list ul {
          list-style: none;
          padding: 0;
        }

        .perm-item {
          padding: 8px 0;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .security-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .security-note { display:flex; align-items:flex-start; gap:12px; }
        .security-note-icon { display:grid; place-items:center; width:34px; height:34px; flex:none; border-radius:10px; color:var(--cyan-400); background:rgba(34,211,238,.08); }
        .security-note strong { font-size:.86rem; }
        .security-note p, .security-footnote { color:var(--text-muted); font-size:.78rem; }
        .security-note p { margin-top:3px; }
        .security-footnote { margin-top:18px; }
      `}</style>
    </div>
  );
}
