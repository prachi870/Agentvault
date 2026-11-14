'use client';

import { useRequireRole } from '@/lib/auth';
import { Shield, Lock, Key, Eye, FileCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function SecurityPage() {
  const { user, loading, hasRole } = useRequireRole('admin');

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading security settings...</p>
        </div>
      </div>
    );
  }

  if (!hasRole) {
    return (
      <div className="page-container">
        <div className="error-state">
          <span className="error-icon">🔒</span>
          <h2>Access Denied</h2>
          <p>You need administrator privileges to access security settings.</p>
          <a href="/chat" className="btn btn-primary">← Back to Chat</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container-spacious">
      {/* Page Header */}
      <div className="page-header-section">
        <div>
          <span className="page-eyebrow">SECURITY & COMPLIANCE</span>
          <h1 className="page-title">Security Center</h1>
          <p className="page-subtitle">
            Manage authentication, access controls, audit logs, and compliance settings for your organization.
          </p>
        </div>
        <div className="security-status">
          <div className="status-indicator status-secure">
            <CheckCircle className="w-5 h-5" />
            <span>System Secure</span>
          </div>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="feature-coming-soon">
        <div className="coming-soon-icon">
          <Shield className="w-16 h-16" />
        </div>
        <h2>Enterprise Security Features Coming Soon</h2>
        <p>
          We are building comprehensive security and compliance tools to help you meet enterprise 
          requirements, audit standards, and regulatory obligations.
        </p>
        
        <div className="planned-features">
          <h3>Security Features In Development:</h3>
          <div className="features-grid">
            <div className="feature-item">
              <Lock className="w-5 h-5 text-accent-primary" />
              <div>
                <strong>Advanced Authentication</strong>
                <small>SSO/SAML integration, MFA, password policies, session management</small>
              </div>
            </div>
            <div className="feature-item">
              <Key className="w-5 h-5 text-accent-secondary" />
              <div>
                <strong>Access Control Management</strong>
                <small>Fine-grained permissions, role hierarchies, resource-level access</small>
              </div>
            </div>
            <div className="feature-item">
              <Eye className="w-5 h-5 text-accent-tertiary" />
              <div>
                <strong>Audit Logging</strong>
                <small>Complete audit trail, user activity tracking, compliance reports</small>
              </div>
            </div>
            <div className="feature-item">
              <FileCheck className="w-5 h-5 text-accent-success" />
              <div>
                <strong>Document Security</strong>
                <small>Encryption at rest, secure sharing, data classification labels</small>
              </div>
            </div>
            <div className="feature-item">
              <AlertTriangle className="w-5 h-5 text-accent-warning" />
              <div>
                <strong>Threat Detection</strong>
                <small>Anomaly detection, suspicious activity alerts, automated responses</small>
              </div>
            </div>
            <div className="feature-item">
              <Shield className="w-5 h-5 text-accent-primary" />
              <div>
                <strong>Compliance Tools</strong>
                <small>GDPR, HIPAA, SOC 2 compliance reporting and certifications</small>
              </div>
            </div>
          </div>
        </div>

        {/* Current Security Status */}
        <div className="current-security">
          <h3>Current Security Features:</h3>
          <div className="security-items">
            <div className="security-item active">
              <CheckCircle className="w-5 h-5 text-accent-success" />
              <span>Role-Based Access Control (RBAC)</span>
            </div>
            <div className="security-item active">
              <CheckCircle className="w-5 h-5 text-accent-success" />
              <span>Document-Level Clearance Permissions</span>
            </div>
            <div className="security-item active">
              <CheckCircle className="w-5 h-5 text-accent-success" />
              <span>Secure Authentication & Session Management</span>
            </div>
            <div className="security-item active">
              <CheckCircle className="w-5 h-5 text-accent-success" />
              <span>Query Receipt Ledger for Audit Trail</span>
            </div>
            <div className="security-item active">
              <CheckCircle className="w-5 h-5 text-accent-success" />
              <span>Encrypted API Communications (HTTPS)</span>
            </div>
          </div>
        </div>

        <div className="coming-soon-actions">
          <Link href="/users" className="btn btn-primary">
            Manage User Access
          </Link>
          <Link href="/receipts" className="btn btn-ghost">
            View Audit Receipts
          </Link>
        </div>
      </div>

      <style jsx>{`
        .page-container-spacious {
          max-width: 1400px;
          margin: 0 auto;
          padding: 3rem 2rem;
        }

        .page-header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 3rem;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .page-eyebrow {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent-primary);
          margin-bottom: 0.75rem;
        }

        .page-title {
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 0.75rem;
          color: var(--text-primary);
        }

        .page-subtitle {
          font-size: 1.125rem;
          color: var(--text-secondary);
          max-width: 600px;
          line-height: 1.6;
        }

        .security-status {
          display: flex;
          align-items: center;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-lg);
          font-weight: 600;
          font-size: 0.9375rem;
        }

        .status-indicator.status-secure {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: var(--accent-success);
        }

        .feature-coming-soon {
          background: var(--glass-bg);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-xl);
          padding: 4rem 3rem;
          text-align: center;
          backdrop-filter: blur(20px);
        }

        .coming-soon-icon {
          display: inline-flex;
          padding: 1.5rem;
          background: var(--gradient-primary);
          border-radius: var(--radius-xl);
          margin-bottom: 2rem;
          box-shadow: var(--shadow-glow);
        }

        .coming-soon-icon :global(svg) {
          color: white;
        }

        .feature-coming-soon h2 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }

        .feature-coming-soon > p {
          font-size: 1.125rem;
          color: var(--text-secondary);
          max-width: 700px;
          margin: 0 auto 3rem;
          line-height: 1.7;
        }

        .planned-features,
        .current-security {
          max-width: 900px;
          margin: 0 auto 3rem;
          text-align: left;
        }

        .planned-features h3,
        .current-security h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: var(--text-primary);
          text-align: center;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .feature-item {
          display: flex;
          gap: 1rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          align-items: flex-start;
        }

        .feature-item :global(svg) {
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        .feature-item strong {
          display: block;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.25rem;
        }

        .feature-item small {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .security-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .security-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 0.9375rem;
          color: var(--text-secondary);
        }

        .security-item.active {
          color: var(--text-primary);
        }

        .coming-soon-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .loading-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          padding: 4rem 2rem;
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid var(--border-default);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .error-icon {
          font-size: 4rem;
        }

        .error-state h2 {
          font-size: 1.75rem;
          margin-bottom: 0.5rem;
        }

        .error-state p {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .page-container-spacious {
            padding: 2rem 1.5rem;
          }

          .page-title {
            font-size: 1.75rem;
          }

          .feature-coming-soon {
            padding: 3rem 2rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
