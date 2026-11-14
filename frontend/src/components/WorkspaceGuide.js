'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function WorkspaceGuide({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="guide-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="workspace-guide-title">
        <header className="guide-header">
          <div>
            <span className="guide-eyebrow">YOUR AGENTVAULT FIELD GUIDE</span>
            <h2 id="workspace-guide-title">From question to evidence</h2>
            <p>A simple path through the workspace. Each answer stays inside your access boundaries.</p>
          </div>
          <button type="button" className="guide-close" onClick={onClose} aria-label="Close guide">×</button>
        </header>

        <ol className="guide-steps">
          <li>
            <span className="guide-step-number">01</span>
            <div><h3>Make trusted knowledge available</h3><p>Admins and managers add files or configure an approved data source. Classification and allowed roles decide who can use each document.</p></div>
            <Link href="/documents" onClick={onClose}>Knowledge library <span>→</span></Link>
          </li>
          <li>
            <span className="guide-step-number">02</span>
            <div><h3>Ask one clear question</h3><p>Be specific about the topic, team, or time period. Agentvault searches only the material your account is allowed to see.</p></div>
            <Link href="/chat" onClick={onClose}>Ask Agentvault <span>→</span></Link>
          </li>
          <li>
            <span className="guide-step-number">03</span>
            <div><h3>Review the evidence, not just the answer</h3><p>Open a citation to inspect its excerpt. Confidence describes answer certainty; grounding describes how much of the answer was supported.</p></div>
            <Link href="/receipts" onClick={onClose}>Evidence ledger <span>→</span></Link>
          </li>
          <li>
            <span className="guide-step-number">04</span>
            <div><h3>Verify the record when it matters</h3><p>Every response has a signed receipt. Verify its integrity before using it in a review or audit.</p></div>
            <Link href="/receipts" onClick={onClose}>Review receipts <span>→</span></Link>
          </li>
        </ol>

        <footer className="guide-footer">
          <span className="guide-lock">⌑</span>
          <p><strong>Not seeing a source?</strong> That may be an access boundary, not a search failure. Ask your administrator to review your role and document clearance.</p>
        </footer>
      </section>

      <style jsx>{`
        .guide-backdrop { position:fixed; inset:0; z-index:1500; display:grid; place-items:center; padding:20px; background:rgba(4,9,16,.76); backdrop-filter:blur(8px); }
        .guide-dialog { width:min(720px, 100%); max-height:min(820px, 92vh); overflow:auto; padding:clamp(22px, 4vw, 36px); border:1px solid var(--border-default); border-radius:24px; background:linear-gradient(145deg, #1a2939, #111b29); box-shadow:var(--shadow-xl); }
        .guide-header { display:flex; justify-content:space-between; gap:20px; padding-bottom:24px; border-bottom:1px solid var(--border-glass); }
        .guide-eyebrow { color:var(--text-accent); font-size:.65rem; font-weight:750; letter-spacing:.15em; }
        .guide-header h2 { margin-top:8px; color:var(--text-primary); font-size:clamp(1.45rem, 3vw, 1.9rem); letter-spacing:-.04em; }
        .guide-header p { max-width:540px; margin-top:6px; color:var(--text-secondary); font-size:.84rem; }
        .guide-close { width:36px; height:36px; flex:none; border:1px solid var(--border-glass); border-radius:10px; background:transparent; color:var(--text-secondary); font-size:1.4rem; cursor:pointer; }
        .guide-close:hover { color:var(--text-primary); border-color:var(--border-accent); }
        .guide-steps { list-style:none; padding:5px 0 0; }
        .guide-steps li { display:grid; grid-template-columns:38px minmax(0, 1fr) auto; align-items:start; gap:14px; padding:17px 0; border-bottom:1px solid var(--border-glass); }
        .guide-step-number { display:grid; place-items:center; width:34px; height:34px; border-radius:11px; background:rgba(101,190,181,.1); color:var(--text-accent); font-size:.67rem; font-weight:700; }
        .guide-steps h3 { color:var(--text-primary); font-size:.9rem; font-weight:650; }
        .guide-steps p { margin-top:4px; color:var(--text-secondary); font-size:.76rem; line-height:1.65; }
        .guide-steps a { align-self:center; color:var(--text-accent); font-size:.74rem; font-weight:650; white-space:nowrap; }
        .guide-steps a span { margin-left:3px; }
        .guide-footer { display:flex; gap:12px; align-items:flex-start; margin-top:20px; padding:14px; border:1px solid rgba(101,190,181,.15); border-radius:14px; background:rgba(101,190,181,.055); }
        .guide-lock { color:var(--cyan-400); }
        .guide-footer p { color:var(--text-secondary); font-size:.75rem; line-height:1.6; }
        .guide-footer strong { color:var(--text-primary); }
        @media (max-width:620px) { .guide-steps li { grid-template-columns:34px minmax(0,1fr); gap:10px; } .guide-steps li a { grid-column:2; justify-self:start; } }
      `}</style>
    </div>
  );
}
