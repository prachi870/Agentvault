'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getDashboardHealth, listDocuments, listReceipts, verifyReceipt } from '@/lib/api';
import Link from 'next/link';

function AnimatedNumber({ value, suffix = '' }) {
  return <span className="animate-fade-in">{value}{suffix}</span>;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [healthData, setHealthData] = useState(null);
  const [healthError, setHealthError] = useState('');
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [refreshKey, setRefreshKey] = useState(0);
  const [workspaceStart, setWorkspaceStart] = useState({
    loading: true,
    hasDocuments: false,
    latestReceipt: null,
    receiptIntegrity: null,
    error: '',
  });

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    Promise.all([listDocuments(1, 0), listReceipts(undefined, 1, 0)])
      .then(async ([documents, receipts]) => {
        let receiptIntegrity = null;
        let receiptWarning = '';
        if (receipts[0]) {
          try {
            const result = await verifyReceipt(receipts[0].id);
            receiptIntegrity = result.valid;
          } catch (err) {
            receiptWarning = err.message || 'The latest receipt could not be verified automatically.';
          }
        }
        if (active) {
          setWorkspaceStart({
            loading: false,
            hasDocuments: documents.length > 0,
            latestReceipt: receipts[0] || null,
            receiptIntegrity,
            error: receiptWarning,
          });
        }
      })
      .catch((err) => {
        if (active) {
          setWorkspaceStart((current) => ({
            ...current,
            loading: false,
            error: err.message || 'Your workspace guide could not be loaded.',
          }));
        }
      });
    return () => { active = false; };
  }, [user, refreshKey]);

  useEffect(() => {
    if (!user) return;
    
    // Load health data for managers/admins
    if (user.role === 'manager' || user.role === 'admin') {
      getDashboardHealth(days)
        .then((data) => {
          setHealthData(data);
          setHealthError('');
        })
        .catch((err) => {
          setHealthData(null);
          setHealthError(err.message || 'System health could not be loaded.');
        })
        .finally(() => setLoading(false));
    }
  }, [user, days, refreshKey]);

  if (authLoading || !user) return null;

  const canViewHealth = user.role === 'manager' || user.role === 'admin';
  const canManage = user.role === 'admin' || user.role === 'manager';

  return (
    <div className="dashboard-container">
      {/* Welcome Section */}
      <div className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">WORKSPACE OVERVIEW</span>
          <h1 className="dashboard-title">Welcome back, {user.full_name || user.email.split('@')[0]}.</h1>
          <p className="dashboard-subtitle">
            A clear view of your knowledge activity, answer quality, and system health.
          </p>
        </div>
        <div className="user-badge">
          <div className="user-avatar">
            {(user.full_name || user.email)[0].toUpperCase()}
          </div>
          <div>
            <div className="user-name">{user.full_name || user.email}</div>
            <div className="user-role">{user.role}</div>
          </div>
        </div>
      </div>

      <section className="getting-started" aria-labelledby="getting-started-title">
        <div className="getting-started-heading">
          <div>
            <span className="dashboard-eyebrow">A SIMPLE FIRST RUN</span>
            <h2 id="getting-started-title">Make your first answer traceable</h2>
            <p>Three small steps show how Agentvault turns trusted knowledge into verifiable answers.</p>
          </div>
          <div className="journey-progress" aria-label={`${workspaceStart.loading ? 0 : [workspaceStart.hasDocuments, Boolean(workspaceStart.latestReceipt), workspaceStart.receiptIntegrity === true].filter(Boolean).length} of 3 steps complete`}>
            <strong>{workspaceStart.loading ? '—' : [workspaceStart.hasDocuments, Boolean(workspaceStart.latestReceipt), workspaceStart.receiptIntegrity === true].filter(Boolean).length}<span> / 3</span></strong>
            <small>steps complete</small>
          </div>
        </div>
        {workspaceStart.error && <p className="journey-error" role="status">{workspaceStart.error} Open the receipt to retry verification; the links below still work.</p>}
        <div className="journey-steps">
          <article className={workspaceStart.hasDocuments ? 'journey-step step-done' : 'journey-step'}>
            <span className="journey-step-mark">{workspaceStart.loading ? '·' : workspaceStart.hasDocuments ? '✓' : '1'}</span>
            <div className="journey-step-copy">
              <span className="journey-status">{workspaceStart.hasDocuments ? 'KNOWLEDGE AVAILABLE' : 'START HERE'}</span>
              <h3>Find your knowledge</h3>
              <p>{workspaceStart.hasDocuments ? 'You have sources available. Search them or check their access labels.' : 'Open the library to see what you can access. Ask a manager if it is empty.'}</p>
              <Link href="/documents">Open knowledge library <span>→</span></Link>
            </div>
          </article>
          <article className={workspaceStart.latestReceipt ? 'journey-step step-done' : 'journey-step'}>
            <span className="journey-step-mark">{workspaceStart.loading ? '·' : workspaceStart.latestReceipt ? '✓' : '2'}</span>
            <div className="journey-step-copy">
              <span className="journey-status">{workspaceStart.latestReceipt ? 'QUESTION ASKED' : 'NEXT STEP'}</span>
              <h3>Ask one clear question</h3>
              <p>{workspaceStart.latestReceipt ? 'Your questions are kept in your evidence ledger.' : 'Name a topic, team, or time period to get a more useful answer.'}</p>
              <Link href="/chat">Ask Agentvault <span>→</span></Link>
            </div>
          </article>
          <article className={workspaceStart.receiptIntegrity === true ? 'journey-step step-done' : 'journey-step'}>
            <span className="journey-step-mark">{workspaceStart.loading ? '·' : workspaceStart.receiptIntegrity === true ? '✓' : '3'}</span>
            <div className="journey-step-copy">
              <span className="journey-status">
                {workspaceStart.receiptIntegrity === true ? 'INTEGRITY VERIFIED' : workspaceStart.receiptIntegrity === false ? 'REVIEW RECEIPT' : 'WHEN IT MATTERS'}
              </span>
              <h3>Inspect the evidence trail</h3>
              <p>{workspaceStart.receiptIntegrity === true ? 'Your latest receipt passed its signature check.' : 'Open a receipt to see the sources, checks, and integrity status behind a response.'}</p>
              <Link href={workspaceStart.latestReceipt ? `/receipts/${workspaceStart.latestReceipt.id}` : '/receipts'}>
                {workspaceStart.latestReceipt ? 'Open latest receipt' : 'See the evidence ledger'} <span>→</span>
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Quick Stats Overview */}
      <div className="quick-stats-grid">
        <Link href="/chat" className="quick-stat-card glass-card-hover">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            💬
          </div>
          <div className="stat-info">
            <div className="stat-label">Ask Questions</div>
            <div className="stat-desc">Query your documents</div>
          </div>
          <div className="stat-arrow">→</div>
        </Link>

        <Link href="/documents" className="quick-stat-card glass-card-hover">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
            📄
          </div>
          <div className="stat-info">
            <div className="stat-label">Documents</div>
            <div className="stat-desc">Manage knowledge base</div>
          </div>
          <div className="stat-arrow">→</div>
        </Link>

        {canManage && (
          <Link href="/connectors" className="quick-stat-card glass-card-hover">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
              🔗
            </div>
            <div className="stat-info">
              <div className="stat-label">Connectors</div>
              <div className="stat-desc">Data sources</div>
            </div>
            <div className="stat-arrow">→</div>
          </Link>
        )}

        <Link href="/receipts" className="quick-stat-card glass-card-hover">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>
            🧾
          </div>
          <div className="stat-info">
            <div className="stat-label">Receipts</div>
            <div className="stat-desc">Audit trail</div>
          </div>
          <div className="stat-arrow">→</div>
        </Link>
      </div>

      {/* Health Dashboard for Managers/Admins */}
      {canViewHealth && (
        <>
          <div className="section-header">
            <div>
              <h2 className="section-title">System Health</h2>
              <p className="section-desc">Query metrics and quality indicators</p>
            </div>
            <div className="toolbar-group">
              {[7, 14, 30, 90].map((d) => (
                <button
                  key={d}
                  className={`btn btn-sm ${d === days ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setDays(d)}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="stats-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-card" />
              ))}
            </div>
          ) : healthError ? (
            <div className="dashboard-error" role="alert">
              <span>{healthError}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setRefreshKey((key) => key + 1)}>Try again</button>
            </div>
          ) : !healthData ? (
            <div className="empty-state-small">
              <div className="empty-state-icon">📊</div>
              <p>Health metrics will appear after the first queries are processed.</p>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="metrics-grid">
                <div className="metric-card glass-card">
                  <div className="metric-header">
                    <span className="metric-icon">📊</span>
                    <span className="metric-title">Total Queries</span>
                  </div>
                  <div className="metric-value">
                    <AnimatedNumber value={healthData.queries?.total ?? 0} />
                  </div>
                  <div className="metric-footer">
                    <span className="metric-change success">
                      ↑ {healthData.queries?.answered ?? 0} answered
                    </span>
                  </div>
                </div>

                <div className="metric-card glass-card">
                  <div className="metric-header">
                    <span className="metric-icon">🎯</span>
                    <span className="metric-title">Avg. confidence</span>
                  </div>
                  <div className="metric-value">
                    <AnimatedNumber 
                      value={Math.round((healthData.quality?.avg_confidence ?? 0) * 100)} 
                      suffix="%" 
                    />
                  </div>
                  <div className="metric-footer">
                    <div className="mini-progress-bar">
                      <div 
                        className="mini-progress-fill success"
                        style={{ width: `${(healthData.quality?.avg_confidence ?? 0) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="metric-card glass-card">
                  <div className="metric-header">
                    <span className="metric-icon">⚡</span>
                    <span className="metric-title">Avg Response</span>
                  </div>
                  <div className="metric-value">
                    <AnimatedNumber value={healthData.latency_ms?.p50 ?? 0} suffix="ms" />
                  </div>
                  <div className="metric-footer">
                    <span className="metric-label">p50 latency</span>
                  </div>
                </div>

                <div className="metric-card glass-card">
                  <div className="metric-header">
                    <span className="metric-icon">🛡️</span>
                    <span className="metric-title">Security</span>
                  </div>
                  <div className="metric-value">
                    <AnimatedNumber value={healthData.security?.injection_events ?? 0} />
                  </div>
                  <div className="metric-footer">
                    <span className={`metric-label ${(healthData.security?.injection_events ?? 0) === 0 ? 'success' : 'warning'}`}>
                      {(healthData.security?.injection_events ?? 0) === 0 ? '✓ No threats' : '⚠ Blocked'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="detail-section">
                <h3 className="detail-title">Query Breakdown</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Answered</div>
                    <div className="stat-value success">
                      <AnimatedNumber value={healthData.queries?.answered ?? 0} />
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Abstained</div>
                    <div className="stat-value warning">
                      <AnimatedNumber value={healthData.queries?.abstained ?? 0} />
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Blocked</div>
                    <div className="stat-value danger">
                      <AnimatedNumber value={healthData.queries?.blocked ?? 0} />
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Knowledge Gaps</div>
                    <div className="stat-value">
                      <AnimatedNumber value={healthData.knowledge?.open_gaps ?? 0} />
                    </div>
                    <Link href="/dashboard/knowledge-gaps" className="stat-link">
                      View gaps →
                    </Link>
                  </div>
                </div>
              </div>

              {/* System Components */}
              <div className="detail-section">
                <h3 className="detail-title">System Components</h3>
                <div className="components-grid glass-card">
                  {Object.entries(healthData.components || {}).map(([key, val]) => {
                    const isBoolean = typeof val === 'boolean';
                    const isOk = isBoolean ? val : true;
                    return (
                      <div key={key} className="component-item">
                        <span className={`status-indicator ${isOk ? 'success' : 'error'}`} />
                        <span className="component-name">
                          {key.replace(/_/g, ' ')}
                        </span>
                        {!isBoolean && (
                          <span className="component-value">{val}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Quick Actions for All Users */}
      <div className="section-header" style={{ marginTop: '3rem' }}>
        <div>
          <h2 className="section-title">Quick Actions</h2>
          <p className="section-desc">Common tasks and features</p>
        </div>
      </div>

      <div className="actions-grid">
        <div className="action-card glass-card-hover">
          <div className="action-icon">🔍</div>
          <h4 className="action-title">Search Documents</h4>
          <p className="action-desc">Find information across all your indexed documents</p>
          <Link href="/chat" className="action-btn btn btn-secondary btn-sm">
            Start Searching
          </Link>
        </div>

        {canManage && (
          <div className="action-card glass-card-hover">
            <div className="action-icon">📤</div>
            <h4 className="action-title">Upload Documents</h4>
            <p className="action-desc">Add new documents to your knowledge base</p>
            <Link href="/documents" className="action-btn btn btn-secondary btn-sm">
              Upload Files
            </Link>
          </div>
        )}

        <div className="action-card glass-card-hover">
          <div className="action-icon">📜</div>
          <h4 className="action-title">View History</h4>
          <p className="action-desc">Review your query receipts and audit trail</p>
          <Link href="/receipts" className="action-btn btn btn-secondary btn-sm">
            View Receipts
          </Link>
        </div>

        {canManage && (
          <div className="action-card glass-card-hover">
            <div className="action-icon">🔧</div>
            <h4 className="action-title">Configure Sources</h4>
            <p className="action-desc">Connect SharePoint, Confluence, and other data sources</p>
            <Link href="/connectors" className="action-btn btn btn-secondary btn-sm">
              Manage Connectors
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        /* Welcome Section */
        .dashboard-welcome {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding: 2rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
          border-radius: var(--radius-xl);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .dashboard-title {
          font-size: clamp(1.7rem, 2.4vw, 2.35rem);
          font-weight: 700;
          letter-spacing: -0.045em;
          margin-bottom: 0.5rem;
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .dashboard-subtitle {
          color: var(--text-secondary);
          font-size: 1rem;
        }
        .dashboard-eyebrow {
          display: inline-block;
          margin-bottom: 7px;
          color: var(--text-accent);
          font-size: .68rem;
          font-weight: 700;
          letter-spacing: .14em;
        }
        .dashboard-error {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          padding:14px 16px;
          border:1px solid rgba(244,63,94,.28);
          border-radius:var(--radius-md);
          background:rgba(244,63,94,.08);
          color:var(--rose-400);
        }
        .getting-started {
          margin: 0 0 28px;
          padding: clamp(18px, 2.8vw, 28px);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-xl);
          background: linear-gradient(115deg, rgba(101, 190, 181, .055), transparent 58%), var(--bg-glass);
        }
        .getting-started-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:18px; }
        .getting-started-heading h2 { color:var(--text-primary); font-size:1.15rem; letter-spacing:-.025em; }
        .getting-started-heading p { margin-top:4px; color:var(--text-secondary); font-size:.8rem; }
        .journey-progress { min-width:84px; text-align:right; }
        .journey-progress strong { color:var(--text-primary); font-size:1.25rem; }
        .journey-progress strong span { color:var(--text-muted); font-size:.85rem; font-weight:500; }
        .journey-progress small { display:block; color:var(--text-muted); font-size:.68rem; }
        .journey-steps { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; }
        .journey-step { display:flex; gap:12px; min-width:0; padding:15px; border:1px solid var(--border-glass); border-radius:15px; background:rgba(11,17,27,.32); }
        .journey-step.step-done { border-color:rgba(52,211,153,.2); background:rgba(16,185,129,.045); }
        .journey-step-mark { display:grid; place-items:center; width:27px; height:27px; flex:none; border:1px solid var(--border-default); border-radius:50%; color:var(--text-accent); font-size:.72rem; font-weight:750; }
        .step-done .journey-step-mark { border-color:rgba(52,211,153,.32); color:var(--emerald-400); background:rgba(16,185,129,.1); }
        .journey-step-copy { min-width:0; }
        .journey-status { color:var(--text-muted); font-size:.56rem; font-weight:750; letter-spacing:.1em; }
        .journey-step h3 { margin-top:4px; color:var(--text-primary); font-size:.83rem; font-weight:650; }
        .journey-step p { min-height:40px; margin-top:4px; color:var(--text-secondary); font-size:.71rem; line-height:1.55; }
        .journey-step a { display:inline-block; margin-top:10px; color:var(--text-accent); font-size:.71rem; font-weight:650; }
        .journey-step a span { margin-left:3px; }
        .journey-error { margin-bottom:12px; color:var(--amber-400); font-size:.75rem; }

        .user-badge {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.25rem;
          background: rgba(0, 0, 0, 0.3);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .user-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .user-name {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }

        /* Quick Stats Grid */
        .quick-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .quick-stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: var(--radius-lg);
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
        }

        .quick-stat-card:hover {
          transform: translateY(-2px);
        }

        .stat-icon {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          flex-shrink: 0;
        }

        .stat-info {
          flex: 1;
        }

        .stat-label {
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }

        .stat-desc {
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

        .stat-arrow {
          font-size: 1.5rem;
          color: var(--primary-400);
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .quick-stat-card:hover .stat-arrow {
          opacity: 1;
        }

        /* Section Headers */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .section-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        /* Metrics Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metric-card {
          padding: 1.5rem;
          border-radius: var(--radius-lg);
        }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .metric-icon {
          font-size: 1.5rem;
        }

        .metric-title {
          font-size: 0.875rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .metric-value {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .metric-footer {
          display: flex;
          align-items: center;
        }

        .metric-change {
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .metric-change.success {
          color: var(--success-400);
        }

        .metric-label {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .metric-label.success {
          color: var(--success-400);
        }

        .metric-label.warning {
          color: var(--warning-400);
        }

        .mini-progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .mini-progress-fill {
          height: 100%;
          transition: width 0.3s;
        }

        .mini-progress-fill.success {
          background: var(--gradient-success);
        }

        /* Detail Section */
        .detail-section {
          margin-bottom: 2rem;
        }

        .detail-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
        }

        .stat-label {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.875rem;
          font-weight: 700;
        }

        .stat-value.success {
          color: var(--success-400);
        }

        .stat-value.warning {
          color: var(--warning-400);
        }

        .stat-value.danger {
          color: var(--danger-400);
        }

        .stat-link {
          display: inline-block;
          margin-top: 0.5rem;
          font-size: 0.8125rem;
          color: var(--primary-400);
          text-decoration: none;
        }

        .stat-link:hover {
          text-decoration: underline;
        }

        /* Components Grid */
        .components-grid {
          padding: 1.5rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .component-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: var(--radius-md);
        }

        .status-indicator {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-indicator.success {
          background: var(--success-500);
          box-shadow: 0 0 10px var(--success-500);
        }

        .status-indicator.error {
          background: var(--danger-500);
          box-shadow: 0 0 10px var(--danger-500);
        }

        .component-name {
          font-size: 0.8125rem;
          color: var(--text-secondary);
          text-transform: capitalize;
          flex: 1;
        }

        .component-value {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Actions Grid */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .action-card {
          padding: 2rem;
          border-radius: var(--radius-lg);
          text-align: center;
          transition: transform 0.2s;
        }

        .action-card:hover {
          transform: translateY(-4px);
        }

        .action-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .action-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .action-desc {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .action-btn {
          width: 100%;
          justify-content: center;
        }

        .empty-state-small {
          text-align: center;
          padding: 3rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: var(--radius-lg);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .empty-state-small .empty-state-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 768px) {
          .journey-steps { grid-template-columns:1fr; }
          .journey-step p { min-height:0; }
          .dashboard-container {
            padding: 1rem;
          }

          .dashboard-welcome {
            flex-direction: column;
            gap: 1.5rem;
            text-align: center;
          }

          .dashboard-title {
            font-size: 1.5rem;
          }

          .quick-stats-grid,
          .metrics-grid,
          .stats-grid,
          .actions-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
