'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sparkles } from 'lucide-react';

export default function LandingNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Demo', href: '#demo' },
  ];

  const handleAnchorClick = (e, href) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    
    const element = document.querySelector(href);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'py-2' : 'py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            className={`landing-glass rounded-2xl transition-all duration-300 ${
              isScrolled
                ? 'shadow-lg backdrop-blur-premium'
                : 'backdrop-blur-premium'
            }`}
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 gap-4">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative flex-shrink-0"
                >
                  {/* Layered Vault Icon */}
                  <div className="relative w-10 h-10">
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-landing-violet to-landing-blue rounded-lg opacity-20 blur-md"></div>
                    
                    {/* Main vault icon */}
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 40 40"
                      fill="none"
                      className="relative"
                    >
                      {/* Outer vault layer */}
                      <rect
                        x="4"
                        y="4"
                        width="32"
                        height="32"
                        rx="8"
                        fill="url(#vault-gradient)"
                        fillOpacity="0.8"
                      />
                      
                      {/* Inner vault layer */}
                      <rect
                        x="8"
                        y="8"
                        width="24"
                        height="24"
                        rx="6"
                        fill="url(#vault-gradient-inner)"
                        fillOpacity="0.6"
                      />
                      
                      {/* Document lines */}
                      <line
                        x1="14"
                        y1="16"
                        x2="26"
                        y2="16"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="14"
                        y1="20"
                        x2="26"
                        y2="20"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <line
                        x1="14"
                        y1="24"
                        x2="22"
                        y2="24"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      
                      {/* AI sparkle */}
                      <circle
                        cx="30"
                        cy="10"
                        r="4"
                        fill="url(#sparkle-gradient)"
                        className="animate-pulse-glow"
                      />
                      
                      <defs>
                        <linearGradient
                          id="vault-gradient"
                          x1="4"
                          y1="4"
                          x2="36"
                          y2="36"
                        >
                          <stop offset="0%" stopColor="#56D9B5" />
                          <stop offset="100%" stopColor="#6AAEFF" />
                        </linearGradient>
                        <linearGradient
                          id="vault-gradient-inner"
                          x1="8"
                          y1="8"
                          x2="32"
                          y2="32"
                        >
                          <stop offset="0%" stopColor="#6AAEFF" />
                          <stop offset="100%" stopColor="#A99AFF" />
                        </linearGradient>
                        <linearGradient
                          id="sparkle-gradient"
                          x1="26"
                          y1="6"
                          x2="34"
                          y2="14"
                        >
                          <stop offset="0%" stopColor="#A99AFF" />
                          <stop offset="100%" stopColor="#56D9B5" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </motion.div>

                <div>
                  <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-landing-violet via-landing-blue to-landing-cyan bg-clip-text text-transparent whitespace-nowrap">
                    Agentvault
                  </span>
                  <div className="hidden sm:flex items-center gap-1 text-[10px] text-landing-text-muted">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>AI Knowledge</span>
                  </div>
                </div>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-6 flex-1 justify-center">
                {navLinks.map((link, index) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleAnchorClick(e, link.href)}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + 0.3 }}
                    className="text-sm text-landing-text-secondary hover:text-landing-text-primary font-medium transition-colors relative group"
                  >
                    {link.label}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-landing-violet to-landing-blue group-hover:w-full transition-all duration-300"></span>
                  </motion.a>
                ))}
              </div>

              {/* Desktop CTAs */}
              <div className="hidden md:flex items-center gap-3">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Link
                    href="/login"
                    className="btn btn-ghost text-sm h-10 px-4"
                  >
                    Login
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <Link
                    href="/signup"
                    className="btn btn-primary h-10 px-4 text-sm gap-1.5"
                  >
                    Get Started
                    <svg
                      className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                </motion.div>
              </div>

              {/* Mobile Menu Button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-landing-text-primary hover:bg-white/5 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-landing-bg-secondary/95 backdrop-blur-premium border-l border-landing-glass-border z-50 md:hidden overflow-y-auto shadow-2xl"
            >
              <div className="p-6">
                {/* Close button */}
                <div className="flex justify-end mb-8">
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 text-landing-text-primary hover:bg-white/5 rounded-lg transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Mobile Navigation Links */}
                <div className="space-y-2 mb-8">
                  {navLinks.map((link, index) => (
                    <motion.a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleAnchorClick(e, link.href)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="block px-4 py-3 text-landing-text-primary hover:bg-white/5 rounded-lg font-medium transition-colors"
                    >
                      {link.label}
                    </motion.a>
                  ))}
                </div>

                {/* Mobile CTAs */}
                <div className="space-y-3">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn btn-ghost w-full justify-center h-11"
                  >
                    Login
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="btn btn-primary w-full justify-center h-11 gap-1.5"
                  >
                    Get Started
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                </div>

                {/* Mobile Footer */}
                <div className="mt-12 pt-8 border-t border-landing-glass-border">
                  <div className="flex items-center gap-2 text-landing-text-muted text-sm">
                    <Sparkles className="w-4 h-4 text-landing-violet" />
                    <span>AI-Powered Document Intelligence</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
