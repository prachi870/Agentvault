'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useEffect, useState } from 'react';
import WorkspaceGuide from '@/components/WorkspaceGuide';

const NAV_ITEMS = [
  { href: '/chat', label: 'Ask Agentvault', icon: '⌕', roles: null },
  { href: '/documents', label: 'Knowledge library', icon: '▤', roles: null },
  { href: '/receipts', label: 'Evidence ledger', icon: '◷', roles: null },
  { href: '/dashboard', label: 'Overview', icon: '◫', roles: ['manager', 'admin'] },
  { href: '/dashboard/knowledge-gaps', label: 'Knowledge gaps', icon: '◇', roles: ['manager', 'admin'] },
  { href: '/dashboard/evidence-changes', label: 'Evidence change radar', icon: '↻', roles: ['manager', 'admin'] },
  { href: '/connectors', label: 'Data sources', icon: '⛓', roles: ['admin'] },
  { href: '/users', label: 'People & access', icon: '♙', roles: ['admin'] },
  { href: '/profile', label: 'My profile', icon: '◉', roles: null },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const resetDesktopNavigation = () => {
      if (window.innerWidth > 768) setCollapsed(false);
    };
    window.addEventListener('resize', resetDesktopNavigation);
    return () => window.removeEventListener('resize', resetDesktopNavigation);
  }, []);

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role)
  );

  return (
    <>
      <WorkspaceGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
      {/* Mobile toggle */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Open navigation' : 'Close navigation'}
      >
        {collapsed ? '☰' : '×'}
      </button>

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          {!collapsed && (
            <div className="sidebar-logo-text">
              <span className="sidebar-logo-title">Agentvault</span>
              <span className="sidebar-logo-sub">Intelligence Platform</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {visibleItems.map((item) => {
            const active = pathname === item.href || 
              (item.href !== '/chat' && pathname.startsWith(item.href + '/'));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  if (window.innerWidth <= 768) setCollapsed(true);
                }}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
                {active && <div className="sidebar-link-indicator" />}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="sidebar-footer">
          <button className="sidebar-guide" onClick={() => setShowGuide(true)} title={collapsed ? 'How to use Agentvault' : undefined}>
            <span className="guide-icon">?</span>
            {!collapsed && <span>How to use Agentvault</span>}
          </button>
          {!collapsed && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">
                {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.full_name || user.email}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
            </div>
          )}
          <button className="sidebar-logout" onClick={logout} title="Logout">
            {collapsed ? '↗' : 'Sign out'}
          </button>
        </div>
      </aside>

      <style jsx>{`
        .sidebar-mobile-toggle {
          display: none;
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 1100;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 1.2rem;
          padding: 8px 12px;
          cursor: pointer;
        }

        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: var(--sidebar-width);
          height: 100vh;
          background: rgba(10, 14, 26, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-right: 1px solid var(--border-glass);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          transition: width var(--transition-base), transform var(--transition-base);
          overflow: hidden;
        }

        .sidebar-collapsed { width: var(--sidebar-collapsed); }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 20px 20px;
          border-bottom: 1px solid var(--border-glass);
        }

        .sidebar-logo-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          background: var(--gradient-primary);
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }

        .sidebar-logo-text { display: flex; flex-direction: column; }
        .sidebar-logo-title {
          font-size: 1.1rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .sidebar-logo-sub {
          font-size: 0.65rem;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          transition: all var(--transition-fast);
          position: relative;
          text-decoration: none;
        }

        .sidebar-link:hover {
          color: var(--text-primary);
          background: rgba(86, 217, 181, 0.08);
        }

        .sidebar-link-active {
          color: var(--text-primary);
          background: rgba(86, 217, 181, 0.12);
        }

        .sidebar-link-icon { font-size: 1.1rem; flex-shrink: 0; width: 24px; text-align: center; }
        .sidebar-link-label { white-space: nowrap; }

        .sidebar-link-indicator {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 20px;
          background: var(--gradient-primary);
          border-radius: 0 3px 3px 0;
        }

        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid var(--border-glass);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sidebar-guide {
          display:flex;
          align-items:center;
          gap:10px;
          width:100%;
          padding:9px 10px;
          border:1px solid var(--border-glass);
          border-radius:var(--radius-md);
          background:rgba(101,190,181,.045);
          color:var(--text-secondary);
          font:inherit;
          font-size:.78rem;
          text-align:left;
          cursor:pointer;
          transition:all var(--transition-fast);
        }
        .sidebar-guide:hover { border-color:var(--border-accent); color:var(--text-primary); background:rgba(101,190,181,.09); }
        .guide-icon { display:grid; place-items:center; width:22px; height:22px; flex:none; border:1px solid var(--border-default); border-radius:50%; color:var(--text-accent); font-size:.72rem; font-weight:700; }

        .sidebar-user {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .sidebar-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .sidebar-user-info { overflow: hidden; }
        .sidebar-user-name {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sidebar-user-role {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: capitalize;
        }

        .sidebar-logout {
          background: transparent;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-muted);
          font-family: inherit;
          font-size: 0.8125rem;
          padding: 8px;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
        }

        .sidebar-logout:hover {
          color: var(--rose-400);
          border-color: rgba(244, 63, 94, 0.3);
          background: rgba(244, 63, 94, 0.06);
        }

        @media (max-width: 768px) {
          .sidebar-mobile-toggle { display: block; }
          .sidebar {
            transform: translateX(0);
            width: var(--sidebar-width);
          }
          .sidebar-collapsed {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </>
  );
}
