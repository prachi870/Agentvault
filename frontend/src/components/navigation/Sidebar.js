'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  LayoutDashboard,
  Link2,
  MessagesSquare,
  MessageSquareText,
  Shield,
  ShieldCheck,
  ThumbsUp,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

const navigationGroups = [
  {
    label: 'WORKSPACE',
    items: [
      { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Ask Agentvault', href: '/chat', icon: MessageSquareText },
      { name: 'Saved conversations', href: '/conversations', icon: MessagesSquare },
      { name: 'Knowledge library', href: '/documents', icon: BookOpen },
      { name: 'Knowledge updates', href: '/updates', icon: Bell },
      { name: 'Evidence ledger', href: '/receipts', icon: FileCheck2 },
    ],
  },
  {
    label: 'MANAGE',
    items: [
      { name: 'Data sources', href: '/connectors', icon: Link2, roles: ['admin'] },
      { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['manager', 'admin'] },
      { name: 'RAG evaluation', href: '/evaluation', icon: ClipboardCheck, roles: ['admin'] },
      { name: 'Answer feedback', href: '/feedback', icon: ThumbsUp, roles: ['manager', 'admin'] },
      { name: 'Security', href: '/security', icon: Shield, roles: ['manager', 'admin'] },
      { name: 'Knowledge gaps', href: '/dashboard/knowledge-gaps', icon: Activity, roles: ['manager', 'admin'] },
      { name: 'People & access', href: '/users', icon: Users, roles: ['admin'] },
    ],
  },
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onToggleMobile,
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => onToggleMobile(false)}
        />
      )}
      <aside
        className={`app-sidebar${collapsed ? ' is-collapsed' : ''}${mobileOpen ? ' is-open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-brand">
          <Link
            href="/dashboard"
            className="sidebar-brand-link"
            aria-label="Agentvault home"
            onClick={() => onToggleMobile(false)}
          >
            <span className="brand-mark"><ShieldCheck size={19} strokeWidth={2.2} /></span>
            {!collapsed && (
              <span className="sidebar-brand-copy">
                <strong>Agentvault</strong>
                <small>Knowledge workspace</small>
              </span>
            )}
          </Link>
          <button
            className="sidebar-icon-button sidebar-mobile-close"
            type="button"
            onClick={() => onToggleMobile(false)}
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
          <button
            className="sidebar-icon-button sidebar-desktop-collapse"
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <nav className="sidebar-navigation">
          {navigationGroups.map((group) => {
            const items = group.items.filter(
              (item) => !item.roles || item.roles.includes(user.role)
            );
            if (!items.length) return null;

            return (
              <div className="sidebar-group" key={group.label}>
                {!collapsed && <span className="sidebar-group-label">{group.label}</span>}
                {items.map((item) => {
                  const active = pathname === item.href
                    || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-link${active ? ' is-active' : ''}`}
                      title={collapsed ? item.name : undefined}
                      aria-current={active ? 'page' : undefined}
                      onClick={() => onToggleMobile(false)}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                      {!collapsed && <span>{item.name}</span>}
                      {active && <span className="sidebar-active-mark" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-secure-note">
            <span className="secure-note-icon"><ShieldCheck size={15} /></span>
            {!collapsed && (
              <span>
                <strong>Evidence-first AI</strong>
                <small>Answers with a trail</small>
              </span>
            )}
          </div>
          {!collapsed && <span className="sidebar-version">AGENTVAULT WORKSPACE</span>}
        </div>
      </aside>
    </>
  );
}
