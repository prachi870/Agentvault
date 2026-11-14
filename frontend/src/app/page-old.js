'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getToken } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (getToken()) {
      router.push('/dashboard');
    }

    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40
      });
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [router]);

  return (
    <div className="landing-page">
      {/* 3D Background with Document Theme */}
      <div className="background-3d">
        <div className="grid-lines"></div>
        <div className="floating-docs">
          <div className="doc-particle doc-1" style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }}>📄</div>
          <div className="doc-particle doc-2" style={{ transform: `translate(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px)` }}>📊</div>
          <div className="doc-particle doc-3" style={{ transform: `translate(${mousePos.x * 0.7}px, ${mousePos.y * 0.7}px)` }}>📋</div>
          <div className="doc-particle doc-4" style={{ transform: `translate(${mousePos.x * 0.4}px, ${mousePos.y * 0.4}px)` }}>📑</div>
          <div className="doc-particle doc-5" style={{ transform: `translate(${mousePos.x * 0.6}px, ${mousePos.y * 0.6}px)` }}>📝</div>
        </div>
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
        <div className="gradient-sphere sphere-3"></div>
      </div>

      {/* Navigation */}
      <nav className="main-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="3" y="3" width="30" height="30" rx="8" fill="url(#nav-gradient)" />
              <path d="M12 14h12M12 18h12M12 22h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="nav-gradient" x1="3" y1="3" x2="33" y2="33">
                  <stop offset="0%" stopColor="#d4af76"/>
                  <stop offset="100%" stopColor="#e07856"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="logo-title">Agentvault</span>
          </div>
          <div className="nav-menu">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#demo">Demo</a>
            <Link href="/login" className="nav-btn">Login</Link>
            <Link href="/signup" className="nav-btn primary">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section with 3D Documents */}
      <section className="hero-3d">
        <div className="hero-grid">
          {/* Left Content */}
          <div className="hero-left">
            <div className="hero-badge">
              <span className="badge-icon">🤖</span>
              <span>AI-Powered Document Intelligence</span>
            </div>
            
            <h1 className="hero-heading">
              Your Documents,
              <br />
              <span className="gradient-heading">Instantly Searchable</span>
            </h1>
            
            <p className="hero-text">
              Upload employee handbooks, contracts, reports, or any business documents. 
              Ask questions in plain English and get precise answers with citations in under 2 seconds.
            </p>

            <div className="hero-stats-bar">
              <div className="stat-box">
                <div className="stat-number">86%</div>
                <div className="stat-label">Accuracy</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-box">
                <div className="stat-number">&lt;2s</div>
                <div className="stat-label">Response</div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-box">
                <div className="stat-number">100%</div>
                <div className="stat-label">Secure</div>
              </div>
            </div>

            <div className="hero-actions">
              <Link href="/signup" className="btn-hero primary">
                <span>Start Free Trial</span>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
                </svg>
              </Link>
              <button className="btn-hero secondary">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/>
                </svg>
                <span>Watch Demo</span>
              </button>
            </div>
          </div>

          {/* Right 3D Visualization */}
          <div className="hero-right">
            <div className="document-scene" style={{ 
              transform: `perspective(1000px) rotateY(${mousePos.x * 0.02}deg) rotateX(${-mousePos.y * 0.02}deg)` 
            }}>
              {/* Main Document Stack */}
              <div className="doc-stack-3d">
                <div className="document-3d doc-front">
                  <div className="doc-header">
                    <div className="doc-type-icon">📄</div>
                    <div className="doc-info">
                      <div className="doc-name">Employee_Handbook.pdf</div>
                      <div className="doc-size">2.4 MB • 156 pages</div>
                    </div>
                    <div className="doc-badge indexed">✓ Indexed</div>
                  </div>
                  <div className="doc-preview">
                    <div className="preview-line"></div>
                    <div className="preview-line short"></div>
                    <div className="preview-line"></div>
                    <div className="preview-line medium"></div>
                    <div className="preview-line"></div>
                    <div className="preview-line short"></div>
                    <div className="preview-highlight">
                      <div className="highlight-icon">🔍</div>
                      <div className="highlight-text">&quot;vacation policy&quot; found</div>
                    </div>
                  </div>
                </div>

                <div className="document-3d doc-back-1">
                  <div className="doc-header-mini">
                    <span>📊 Q4_Report.xlsx</span>
                    <span className="doc-badge-mini">✓</span>
                  </div>
                </div>

                <div className="document-3d doc-back-2">
                  <div className="doc-header-mini">
                    <span>📋 Product_Specs.docx</span>
                    <span className="doc-badge-mini">✓</span>
                  </div>
                </div>
              </div>

              {/* AI Processing Indicator */}
              <div className="ai-processor-3d">
                <div className="processor-ring ring-1"></div>
                <div className="processor-ring ring-2"></div>
                <div className="processor-ring ring-3"></div>
                <div className="processor-core">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M16 4v4m0 16v4M28 16h-4M8 16H4m20.485 8.485l-2.828-2.828M10.343 10.343L7.515 7.515m17-1.03l-2.828 2.828M10.343 21.657l-2.828 2.828" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <div className="processor-label">AI Processing</div>
              </div>

              {/* Search Query Bubble */}
              <div className="query-bubble-3d">
                <div className="bubble-icon">💬</div>
                <div className="bubble-text">
                  <div className="bubble-question">&quot;What are our vacation policies?&quot;</div>
                  <div className="bubble-thinking">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
              </div>

              {/* Result Card */}
              <div className="result-card-3d">
                <div className="result-icon">✓</div>
                <div className="result-content">
                  <div className="result-title">Answer Found</div>
                  <div className="result-source">Employee Handbook • Page 24</div>
                  <div className="result-confidence">
                    <div className="confidence-bar">
                      <div className="confidence-fill"></div>
                    </div>
                    <span>92% confidence</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features with Document Icons */}
      <section id="features" className="features-3d">
        <div className="section-head">
          <div className="section-badge">
            <span>⚡</span>
            <span>Features</span>
          </div>
          <h2 className="section-heading">
            Everything for Document Intelligence
          </h2>
          <p className="section-subheading">
            Upload, index, and search your business documents with AI precision
          </p>
        </div>

        <div className="features-grid-3d">
          <div className="feature-card-3d">
            <div className="feature-icon-3d">
              <div className="icon-bg">📄</div>
            </div>
            <h3>Multi-Format Upload</h3>
            <p>PDF, DOCX, XLSX, PPT, TXT and more. Drag and drop or bulk upload hundreds of documents at once.</p>
          </div>

          <div className="feature-card-3d">
            <div className="feature-icon-3d">
              <div className="icon-bg">🔍</div>
            </div>
            <h3>Natural Language Search</h3>
            <p>Ask questions like you&apos;re talking to a colleague. Get precise answers with exact page citations.</p>
          </div>

          <div className="feature-card-3d">
            <div className="feature-icon-3d">
              <div className="icon-bg">🤖</div>
            </div>
            <h3>AI-Powered Indexing</h3>
            <p>Automatic content extraction, classification, and intelligent indexing for instant searchability.</p>
          </div>

          <div className="feature-card-3d">
            <div className="feature-icon-3d">
              <div className="icon-bg">🔒</div>
            </div>
            <h3>Role-Based Access</h3>
            <p>Control document visibility with four security levels: Public, Internal, Confidential, Restricted.</p>
          </div>

          <div className="feature-card-3d">
            <div className="feature-icon-3d">
              <div className="icon-bg">📊</div>
            </div>
            <h3>Analytics Dashboard</h3>
            <p>Track search queries, answer accuracy, user activity, and system performance in real-time.</p>
          </div>

          <div className="feature-card-3d">
            <div className="feature-icon-3d">
              <div className="icon-bg">🔗</div>
            </div>
            <h3>System Integration</h3>
            <p>Connect SharePoint, Confluence, Jira, Google Drive, Notion and auto-sync your document library.</p>
          </div>
        </div>
      </section>

      {/* How It Works - Document Flow */}
      <section id="how-it-works" className="process-section">
        <div className="section-head">
          <div className="section-badge">
            <span>🚀</span>
            <span>How It Works</span>
          </div>
          <h2 className="section-heading">
            Three Steps to Intelligent Search
          </h2>
        </div>

        <div className="process-flow">
          <div className="process-step">
            <div className="step-number">01</div>
            <div className="step-visual">
              <div className="upload-zone">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <rect x="8" y="16" width="48" height="40" rx="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M32 36V24m0 0l-6 6m6-6l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <div className="file-icons">
                  <span>📄</span>
                  <span>📊</span>
                  <span>📋</span>
                </div>
              </div>
            </div>
            <h3>Upload Documents</h3>
            <p>Upload employee handbooks, contracts, policies, reports, or any business documents. Supports all major formats.</p>
          </div>

          <div className="process-arrow">
            <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
              <path d="M2 12h52m0 0l-8-8m8 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="process-step">
            <div className="step-number">02</div>
            <div className="step-visual">
              <div className="ai-processing">
                <div className="processing-ring"></div>
                <div className="processing-ring"></div>
                <div className="processing-core">🤖</div>
                <div className="processing-text">Analyzing...</div>
              </div>
            </div>
            <h3>AI Indexes Content</h3>
            <p>Our AI automatically extracts text, identifies key information, and creates searchable indexes in seconds.</p>
          </div>

          <div className="process-arrow">
            <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
              <path d="M2 12h52m0 0l-8-8m8 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          <div className="process-step">
            <div className="step-number">03</div>
            <div className="step-visual">
              <div className="search-demo">
                <div className="search-bar-demo">
                  <span className="search-icon">🔍</span>
                  <span className="search-text">Ask anything...</span>
                </div>
                <div className="search-result-demo">
                  <span className="result-check">✓</span>
                  <span>Found in 1.8s</span>
                </div>
              </div>
            </div>
            <h3>Get Instant Answers</h3>
            <p>Ask questions in natural language. Get accurate answers with source citations and confidence scores.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-3d">
        <div className="cta-box">
          <div className="cta-bg-pattern"></div>
          <h2>Ready to Search Your Documents?</h2>
          <p>Join teams using Agentvault to unlock knowledge in their business documents</p>
          <Link href="/signup" className="btn-cta">
            <span>Start Free Trial</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"/>
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="main-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <rect x="3" y="3" width="30" height="30" rx="8" fill="url(#footer-gradient)" />
              <path d="M12 14h12M12 18h12M12 22h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <defs>
                <linearGradient id="footer-gradient" x1="3" y1="3" x2="33" y2="33">
                  <stop offset="0%" stopColor="#d4af76"/>
                  <stop offset="100%" stopColor="#e07856"/>
                </linearGradient>
              </defs>
            </svg>
            <span>Agentvault</span>
          </div>
          <p className="footer-desc">Enterprise Document Intelligence Platform</p>
          <p className="footer-copy">© 2026 Agentvault. Secure • Private • Compliant</p>
        </div>
      </footer>

      <style jsx>{`
        .landing-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
        }

        /* 3D Background */
        .background-3d {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }

        .grid-lines {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(212, 175, 118, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212, 175, 118, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          transform: perspective(500px) rotateX(60deg);
          transform-origin: center center;
        }

        .floating-docs {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .doc-particle {
          position: absolute;
          font-size: 3rem;
          opacity: 0.1;
          filter: blur(1px);
          animation: floatDoc 20s ease-in-out infinite;
        }

        .doc-1 { top: 10%; left: 10%; animation-delay: 0s; }
        .doc-2 { top: 20%; right: 15%; animation-delay: -5s; }
        .doc-3 { bottom: 20%; left: 20%; animation-delay: -10s; }
        .doc-4 { top: 60%; right: 25%; animation-delay: -15s; }
        .doc-5 { bottom: 30%; right: 10%; animation-delay: -7s; }

        @keyframes floatDoc {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-30px) translateX(20px);
          }
          50% {
            transform: translateY(-10px) translateX(-20px);
          }
          75% {
            transform: translateY(-40px) translateX(10px);
          }
        }

        .gradient-sphere {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.15;
          animation: pulseSphere 15s ease-in-out infinite;
        }

        .sphere-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #d4af76, transparent);
          top: -200px;
          right: -100px;
        }

        .sphere-2 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #e07856, transparent);
          bottom: -300px;
          left: -200px;
          animation-delay: -5s;
        }

        .sphere-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #9caf88, transparent);
          top: 40%;
          left: 50%;
          animation-delay: -10s;
        }

        @keyframes pulseSphere {
          0%, 100% {
            transform: scale(1);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.25;
          }
        }

        /* Navigation */
        .main-nav {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: rgba(42, 37, 32, 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-subtle);
        }

        .nav-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1.25rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 700;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-menu {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .nav-menu a {
          color: var(--text-secondary);
          font-weight: 500;
          transition: color 0.2s;
        }

        .nav-menu a:hover {
          color: var(--text-primary);
        }

        .nav-btn {
          padding: 0.625rem 1.25rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          transition: all 0.2s;
        }

        .nav-btn.primary {
          background: var(--gradient-primary);
          color: white;
          box-shadow: var(--shadow-warm);
        }

        .nav-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg), var(--shadow-glow);
        }

        /* Hero 3D */
        .hero-3d {
          position: relative;
          z-index: 1;
          padding: 5rem 2rem;
          min-height: calc(100vh - 80px);
          display: flex;
          align-items: center;
        }

        .hero-grid {
          max-width: 1400px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          align-items: center;
        }

        .hero-left {
          animation: slideInLeft 0.8s ease-out;
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.25rem;
          background: rgba(212, 175, 118, 0.12);
          border: 1px solid rgba(212, 175, 118, 0.3);
          border-radius: 100px;
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gold-400);
          margin-bottom: 2rem;
        }

        .badge-icon {
          font-size: 1.25rem;
        }

        .hero-heading {
          font-size: 4rem;
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          font-family: 'Playfair Display', serif;
        }

        .gradient-heading {
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-text {
          font-size: 1.25rem;
          line-height: 1.7;
          color: var(--text-secondary);
          margin-bottom: 2.5rem;
          max-width: 560px;
        }

        .hero-stats-bar {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding: 1.5rem 2rem;
          background: rgba(94, 81, 68, 0.3);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          margin-bottom: 2.5rem;
        }

        .stat-box {
          text-align: center;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 700;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: var(--border-subtle);
        }

        .hero-actions {
          display: flex;
          gap: 1rem;
        }

        .btn-hero {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          border-radius: var(--radius-lg);
          font-size: 1.0625rem;
          font-weight: 600;
          transition: all 0.3s;
          border: none;
          cursor: pointer;
          text-decoration: none;
        }

        .btn-hero.primary {
          background: var(--gradient-primary);
          color: white;
          box-shadow: var(--shadow-warm);
        }

        .btn-hero.primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px rgba(212, 175, 118, 0.4);
        }

        .btn-hero.secondary {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
        }

        .btn-hero.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--border-accent);
        }

        /* 3D Document Scene */
        .hero-right {
          position: relative;
          animation: slideInRight 0.8s ease-out 0.2s both;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .document-scene {
          position: relative;
          height: 600px;
          transition: transform 0.1s ease-out;
        }

        .doc-stack-3d {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .document-3d {
          position: absolute;
          width: 420px;
          background: var(--bg-glass);
          backdrop-filter: blur(30px);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-xl);
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.3),
            0 0 40px rgba(212, 175, 118, 0.1);
          transition: transform 0.3s ease;
        }

        .doc-front {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) translateZ(0);
          z-index: 3;
          padding: 2rem;
        }

        .doc-front:hover {
          transform: translate(-50%, -50%) translateZ(20px) scale(1.02);
        }

        .doc-back-1 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) translateZ(-50px) scale(0.95);
          z-index: 2;
          padding: 1.5rem;
          opacity: 0.6;
        }

        .doc-back-2 {
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) translateZ(-100px) scale(0.9);
          z-index: 1;
          padding: 1.5rem;
          opacity: 0.4;
        }

        .doc-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .doc-type-icon {
          font-size: 2.5rem;
        }

        .doc-info {
          flex: 1;
        }

        .doc-name {
          font-weight: 600;
          font-size: 1.125rem;
          margin-bottom: 0.25rem;
        }

        .doc-size {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .doc-badge {
          padding: 0.5rem 1rem;
          background: rgba(156, 175, 136, 0.2);
          border: 1px solid rgba(156, 175, 136, 0.4);
          border-radius: 100px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--sage-500);
          white-space: nowrap;
        }

        .doc-preview {
          position: relative;
        }

        .preview-line {
          height: 10px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          margin-bottom: 0.75rem;
        }

        .preview-line.short {
          width: 60%;
        }

        .preview-line.medium {
          width: 80%;
        }

        .preview-highlight {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(212, 175, 118, 0.15);
          border: 1px solid rgba(212, 175, 118, 0.3);
          border-radius: var(--radius-md);
          margin-top: 1.5rem;
          animation: highlightPulse 2s ease-in-out infinite;
        }

        @keyframes highlightPulse {
          0%, 100% {
            box-shadow: 0 0 0 rgba(212, 175, 118, 0.4);
          }
          50% {
            box-shadow: 0 0 20px rgba(212, 175, 118, 0.4);
          }
        }

        .highlight-icon {
          font-size: 1.5rem;
        }

        .highlight-text {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--gold-400);
        }

        .doc-header-mini {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .doc-badge-mini {
          color: var(--sage-500);
        }

        /* AI Processor */
        .ai-processor-3d {
          position: absolute;
          bottom: 80px;
          right: -40px;
          z-index: 4;
        }

        .processor-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid rgba(212, 175, 118, 0.3);
          border-radius: 50%;
          animation: ringPulse 3s ease-in-out infinite;
        }

        .ring-1 {
          width: 80px;
          height: 80px;
        }

        .ring-2 {
          width: 100px;
          height: 100px;
          animation-delay: 0.5s;
        }

        .ring-3 {
          width: 120px;
          height: 120px;
          animation-delay: 1s;
        }

        @keyframes ringPulse {
          0%, 100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        .processor-core {
          position: relative;
          width: 60px;
          height: 60px;
          background: var(--gradient-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 32px rgba(212, 175, 118, 0.5);
          animation: rotateSpin 3s linear infinite;
        }

        @keyframes rotateSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .processor-label {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--gold-400);
          white-space: nowrap;
        }

        /* Query Bubble */
        .query-bubble-3d {
          position: absolute;
          top: 60px;
          left: -60px;
          z-index: 4;
          padding: 1.25rem 1.5rem;
          background: var(--bg-glass);
          backdrop-filter: blur(30px);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          max-width: 280px;
          animation: float 4s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        .bubble-icon {
          font-size: 1.5rem;
          margin-bottom: 0.75rem;
        }

        .bubble-question {
          font-size: 0.9375rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .bubble-thinking {
          display: flex;
          gap: 0.5rem;
        }

        .bubble-thinking .dot {
          width: 8px;
          height: 8px;
          background: var(--gold-400);
          border-radius: 50%;
          animation: dotBounce 1.4s infinite;
        }

        .bubble-thinking .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .bubble-thinking .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes dotBounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }

        /* Result Card */
        .result-card-3d {
          position: absolute;
          bottom: 60px;
          left: -80px;
          z-index: 4;
          padding: 1.25rem 1.5rem;
          background: rgba(156, 175, 136, 0.15);
          backdrop-filter: blur(30px);
          border: 1px solid rgba(156, 175, 136, 0.4);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          display: flex;
          gap: 1rem;
          max-width: 300px;
          animation: slideInResult 0.5s ease-out 2s both;
        }

        @keyframes slideInResult {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .result-icon {
          font-size: 2rem;
        }

        .result-title {
          font-weight: 600;
          font-size: 1rem;
          color: var(--sage-500);
          margin-bottom: 0.25rem;
        }

        .result-source {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }

        .result-confidence {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.8125rem;
          color: var(--text-secondary);
        }

        .confidence-bar {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .confidence-fill {
          width: 92%;
          height: 100%;
          background: var(--gradient-sage);
          animation: fillBar 1s ease-out 2.5s both;
        }

        @keyframes fillBar {
          from {
            width: 0;
          }
          to {
            width: 92%;
          }
        }

        /* Features Section */
        .features-3d {
          position: relative;
          z-index: 1;
          padding: 6rem 2rem;
        }

        .section-head {
          max-width: 800px;
          margin: 0 auto 4rem;
          text-align: center;
        }

        .section-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: rgba(212, 175, 118, 0.12);
          border: 1px solid rgba(212, 175, 118, 0.3);
          border-radius: 100px;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gold-400);
          margin-bottom: 1.5rem;
        }

        .section-heading {
          font-size: 3rem;
          font-weight: 700;
          font-family: 'Playfair Display', serif;
          margin-bottom: 1rem;
        }

        .section-subheading {
          font-size: 1.125rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .features-grid-3d {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
          gap: 2rem;
        }

        .feature-card-3d {
          padding: 2.5rem;
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-xl);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .feature-card-3d::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(212, 175, 118, 0.1), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .feature-card-3d:hover {
          transform: translateY(-8px);
          border-color: var(--border-accent);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 40px rgba(212, 175, 118, 0.2);
        }

        .feature-card-3d:hover::before {
          opacity: 1;
        }

        .feature-icon-3d {
          margin-bottom: 1.5rem;
        }

        .icon-bg {
          width: 72px;
          height: 72px;
          background: var(--gradient-primary);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.25rem;
          box-shadow: var(--shadow-warm);
        }

        .feature-card-3d h3 {
          font-size: 1.375rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .feature-card-3d p {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        /* Process Section */
        .process-section {
          position: relative;
          z-index: 1;
          padding: 6rem 2rem;
          background: rgba(94, 81, 68, 0.2);
        }

        .process-flow {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 3rem;
          flex-wrap: wrap;
        }

        .process-step {
          flex: 1;
          min-width: 300px;
          max-width: 360px;
          padding: 3rem 2rem;
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-xl);
          text-align: center;
          position: relative;
        }

        .step-number {
          position: absolute;
          top: -24px;
          left: 50%;
          transform: translateX(-50%);
          width: 48px;
          height: 48px;
          background: var(--gradient-primary);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          box-shadow: var(--shadow-warm);
        }

        .step-visual {
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 2rem;
        }

        .upload-zone {
          position: relative;
        }

        .upload-zone svg {
          color: var(--gold-400);
        }

        .file-icons {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          font-size: 1.5rem;
        }

        .ai-processing {
          position: relative;
          width: 120px;
          height: 120px;
        }

        .processing-ring {
          position: absolute;
          inset: 0;
          border: 3px solid rgba(212, 175, 118, 0.2);
          border-top-color: var(--gold-500);
          border-radius: 50%;
          animation: spin 2s linear infinite;
        }

        .processing-ring:nth-child(2) {
          animation-duration: 3s;
          animation-direction: reverse;
          border-top-color: var(--terracotta-500);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .processing-core {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 3rem;
        }

        .processing-text {
          position: absolute;
          bottom: -32px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.875rem;
          color: var(--gold-400);
          font-weight: 600;
          white-space: nowrap;
        }

        .search-demo {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .search-bar-demo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
        }

        .search-icon {
          font-size: 1.5rem;
        }

        .search-text {
          color: var(--text-muted);
        }

        .search-result-demo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: rgba(156, 175, 136, 0.15);
          border: 1px solid rgba(156, 175, 136, 0.3);
          border-radius: var(--radius-lg);
          color: var(--sage-500);
          font-weight: 600;
        }

        .result-check {
          font-size: 1.25rem;
        }

        .process-step h3 {
          font-size: 1.375rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .process-step p {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .process-arrow {
          flex-shrink: 0;
        }

        .process-arrow svg {
          color: var(--gold-400);
        }

        /* CTA Section */
        .cta-3d {
          position: relative;
          z-index: 1;
          padding: 6rem 2rem;
        }

        .cta-box {
          max-width: 900px;
          margin: 0 auto;
          padding: 4rem 3rem;
          background: var(--gradient-card);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border-accent);
          border-radius: var(--radius-xl);
          text-align: center;
          position: relative;
          overflow: hidden;
          box-shadow: 0 20px 80px rgba(0, 0, 0, 0.3), 0 0 60px rgba(212, 175, 118, 0.2);
        }

        .cta-bg-pattern {
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(212, 175, 118, 0.15), transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(224, 120, 86, 0.15), transparent 50%);
          pointer-events: none;
        }

        .cta-box h2 {
          font-size: 3rem;
          font-weight: 700;
          font-family: 'Playfair Display', serif;
          margin-bottom: 1rem;
          position: relative;
        }

        .cta-box p {
          font-size: 1.25rem;
          color: var(--text-secondary);
          margin-bottom: 2.5rem;
          position: relative;
        }

        .btn-cta {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1.25rem 2.5rem;
          background: var(--gradient-primary);
          color: white;
          border-radius: var(--radius-lg);
          font-size: 1.125rem;
          font-weight: 600;
          box-shadow: var(--shadow-warm);
          transition: all 0.3s;
          text-decoration: none;
          position: relative;
        }

        .btn-cta:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(212, 175, 118, 0.5);
        }

        /* Footer */
        .main-footer {
          position: relative;
          z-index: 1;
          padding: 4rem 2rem;
          background: rgba(42, 37, 32, 0.8);
          border-top: 1px solid var(--border-subtle);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .footer-logo {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .footer-logo span {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem;
          font-weight: 700;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .footer-desc {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 0.75rem;
        }

        .footer-copy {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-grid {
            grid-template-columns: 1fr;
            gap: 3rem;
          }

          .document-scene {
            max-width: 500px;
            margin: 0 auto;
          }

          .query-bubble-3d,
          .result-card-3d,
          .ai-processor-3d {
            position: static;
            margin: 2rem auto 0;
            max-width: 400px;
          }
        }

        @media (max-width: 768px) {
          .hero-heading {
            font-size: 2.5rem;
          }

          .section-heading {
            font-size: 2rem;
          }

          .features-grid-3d {
            grid-template-columns: 1fr;
          }

          .process-arrow {
            display: none;
          }

          .nav-menu {
            gap: 1rem;
          }

          .nav-menu a:not(.nav-btn) {
            display: none;
          }

          .hero-actions {
            flex-direction: column;
          }

          .btn-hero {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
