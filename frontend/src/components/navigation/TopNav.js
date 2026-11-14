'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, Search, Settings, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { clearToken } from '@/lib/api';

export default function TopNav({ onOpenMenu, mobileMenuOpen }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const question = searchQuery.trim();
    if (!question) return;
    if (pathname === '/chat') {
      window.dispatchEvent(new CustomEvent('agentvault:ask', { detail: question }));
    } else {
      sessionStorage.setItem('agentvault_pending_question', question);
      router.push('/chat');
    }
    setSearchQuery('');
  };

  const handleLogout = () => {
    clearToken();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <header className="app-topnav">
      <div className="topnav-inner">
        <button
          className="topnav-menu-button"
          type="button"
          onClick={onOpenMenu}
          aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>

        <form className="topnav-search" onSubmit={handleSearch} role="search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            aria-label="Ask Agentvault"
            placeholder="Ask a question about your knowledge..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <kbd>↵</kbd>
        </form>

        <div className="topnav-context">
          <span className="topnav-context-icon"><ShieldCheck size={15} /></span>
          <span>Private workspace</span>
        </div>

        <div className="topnav-user" ref={userMenuRef}>
          <button
            className="topnav-user-button"
            type="button"
            onClick={() => setShowUserMenu((value) => !value)}
            aria-expanded={showUserMenu}
            aria-label="Open account menu"
          >
            <span className="topnav-avatar">
              {(user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
            </span>
            <span className="topnav-user-copy">
              <strong>{user.full_name || user.email}</strong>
              <small>{user.role}</small>
            </span>
          </button>

          {showUserMenu && (
            <div className="topnav-user-menu">
              <div className="topnav-user-details">
                <strong>{user.full_name || user.email}</strong>
                <span>{user.email}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  router.push('/profile');
                  setShowUserMenu(false);
                }}
              >
                <Settings size={16} /> Account settings
              </button>
              <button type="button" className="topnav-logout" onClick={handleLogout}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
