'use client';

import { useState } from 'react';

export default function CitationCard({ citation, index }) {
  const [expanded, setExpanded] = useState(false);

  const sourceColors = {
    upload: 'var(--violet-400)',
    pdf: 'var(--rose-400)',
    confluence: 'var(--blue-400)',
    jira: 'var(--blue-400)',
    sharepoint: 'var(--cyan-400)',
    sql: 'var(--amber-400)',
    drive: 'var(--emerald-400)',
    notion: 'var(--text-primary)',
    email: 'var(--amber-400)',
  };

  const color = sourceColors[citation.source_type] || 'var(--violet-400)';

  return (
    <div className={`citation-card ${expanded ? 'expanded' : ''}`}>
      <button className="citation-toggle" onClick={() => setExpanded(!expanded)}>
        <span className="citation-index" style={{ background: `${color}22`, color, borderColor: `${color}44` }}>
          {index}
        </span>
        <span className="citation-title">{citation.title}</span>
        <span className="citation-meta">
          <span className="citation-type" style={{ color }}>{citation.source_type}</span>
          {citation.stale && <span className="citation-stale">⚠ stale</span>}
          <span className="citation-score">{Math.round(citation.score * 100)}%</span>
        </span>
        <span className="citation-chevron">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="citation-body animate-slide-down">
          <div className="citation-snippet">{citation.snippet}</div>
          <div className="citation-details">
            <span>Doc: <code>{citation.doc_id.slice(0, 8)}…</code></span>
            <span>Updated: {new Date(citation.updated_at).toLocaleDateString()}</span>
            <span>Score: {(citation.score * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .citation-card {
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: all var(--transition-fast);
        }
        .citation-card.expanded {
          border-color: var(--border-subtle);
          box-shadow: var(--shadow-sm);
        }
        .citation-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(26, 31, 58, 0.3);
          border: none;
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 0.8rem;
          cursor: pointer;
          text-align: left;
          transition: background var(--transition-fast);
        }
        .citation-toggle:hover { background: rgba(26, 31, 58, 0.5); }
        .citation-index {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 700;
          border: 1px solid;
          flex-shrink: 0;
        }
        .citation-title {
          flex: 1;
          font-weight: 500;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .citation-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .citation-type { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
        .citation-stale { font-size: 0.7rem; color: var(--amber-400); }
        .citation-score { font-size: 0.7rem; color: var(--text-muted); }
        .citation-chevron { color: var(--text-muted); font-size: 0.7rem; }
        .citation-body {
          padding: 12px;
          border-top: 1px solid var(--border-glass);
          background: rgba(10, 14, 26, 0.3);
        }
        .citation-snippet {
          font-size: 0.8rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 10px;
          padding: 10px;
          background: rgba(86, 217, 181, 0.04);
          border-left: 3px solid var(--violet-600);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
        }
        .citation-details {
          display: flex;
          gap: 16px;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .citation-details code {
          color: var(--violet-400);
          font-size: 0.7rem;
        }
      `}</style>
    </div>
  );
}
