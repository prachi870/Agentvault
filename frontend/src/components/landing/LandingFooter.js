'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles, Code2 } from 'lucide-react';

export default function LandingFooter() {
  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Demo', href: '#demo' },
    ],
    resources: [
      { label: 'GitHub Repository', href: 'https://github.com/prachi870/Agentvault' },
    ],
  };

  const socialLinks = [
    { icon: Code2, href: 'https://github.com/prachi870/Agentvault', label: 'GitHub repository' },
  ];

  return (
    <footer className="relative border-t border-landing-glass-border">
      <div className="section-spacing">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 group mb-4">
              <motion.div
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="relative w-10 h-10"
              >
                {/* Vault Icon */}
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect
                    x="4"
                    y="4"
                    width="32"
                    height="32"
                    rx="8"
                    fill="url(#footer-vault-gradient)"
                    fillOpacity="0.8"
                  />
                  <rect
                    x="8"
                    y="8"
                    width="24"
                    height="24"
                    rx="6"
                    fill="url(#footer-vault-gradient-inner)"
                    fillOpacity="0.6"
                  />
                  <line x1="14" y1="16" x2="26" y2="16" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="14" y1="20" x2="26" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="14" y1="24" x2="22" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="30" cy="10" r="4" fill="url(#footer-sparkle-gradient)" className="animate-pulse" />
                  <defs>
                    <linearGradient id="footer-vault-gradient" x1="4" y1="4" x2="36" y2="36">
                      <stop offset="0%" stopColor="#56D9B5" />
                      <stop offset="100%" stopColor="#6AAEFF" />
                    </linearGradient>
                    <linearGradient id="footer-vault-gradient-inner" x1="8" y1="8" x2="32" y2="32">
                      <stop offset="0%" stopColor="#6AAEFF" />
                      <stop offset="100%" stopColor="#A99AFF" />
                    </linearGradient>
                    <linearGradient id="footer-sparkle-gradient" x1="26" y1="6" x2="34" y2="14">
                      <stop offset="0%" stopColor="#A99AFF" />
                      <stop offset="100%" stopColor="#56D9B5" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
              <span className="text-lg font-bold bg-gradient-to-r from-landing-violet via-landing-blue to-landing-cyan bg-clip-text text-transparent">
                Agentvault
              </span>
            </Link>
            
            <p className="text-sm text-landing-text-secondary mb-4 leading-relaxed">
              An AI knowledge workspace for finding information across your team&apos;s documents.
            </p>

            <div className="flex items-center gap-2 text-xs text-landing-text-muted">
              <Sparkles className="w-3.5 h-3.5 text-landing-violet" />
              <span>AI-Powered Document Intelligence</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-sm font-semibold text-landing-text-primary mb-3">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-landing-text-secondary hover:text-landing-text-primary transition-colors inline-block hover:translate-x-1 duration-200"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-sm font-semibold text-landing-text-primary mb-3">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noreferrer" className="text-sm text-landing-text-secondary hover:text-landing-text-primary transition-colors inline-block hover:translate-x-1 duration-200">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="border-t border-landing-glass-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <div className="text-sm text-landing-text-muted">
            © {new Date().getFullYear()} Agentvault. All rights reserved. Built with AI for the future of work.
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => {
              const Icon = social.icon;
              return (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-9 h-9 rounded-lg landing-glass hover:bg-landing-glass-hover flex items-center justify-center text-landing-text-secondary hover:text-landing-text-primary transition-colors"
                  aria-label={social.label}
                >
                  <Icon className="w-4 h-4" />
                </motion.a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
}
