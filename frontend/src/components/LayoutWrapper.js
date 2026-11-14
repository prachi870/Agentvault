'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/navigation/Sidebar';
import TopNav from '@/components/navigation/TopNav';
import LandingNavbar from '@/components/landing/LandingNavbar';

const publicRoutes = new Set(['/login', '/signup', '/bootstrap']);

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (pathname === '/') {
    return (
      <>
        <LandingNavbar />
        <main id="main-content">{children}</main>
      </>
    );
  }

  if (publicRoutes.has(pathname)) {
    return <main id="main-content" className="public-page">{children}</main>;
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className={`app-layout${sidebarCollapsed ? ' is-collapsed' : ''}`}>
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileMenuOpen}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          onToggleMobile={setMobileMenuOpen}
        />
        <div className="app-frame">
          <TopNav
            onOpenMenu={() => setMobileMenuOpen((value) => !value)}
            mobileMenuOpen={mobileMenuOpen}
          />
          <main className="main-content" id="main-content">{children}</main>
        </div>
      </div>
    </>
  );
}
