'use client';

export default function ConfidenceMeter({ value, label }) {
  const pct = Math.round(value * 100);
  const color = label === 'high' ? 'var(--emerald-400)' : label === 'medium' ? 'var(--amber-400)' : 'var(--rose-400)';
  const bgColor = label === 'high' ? 'rgba(16,185,129,0.12)' : label === 'medium' ? 'rgba(245,158,11,0.12)' : 'rgba(244,63,94,0.12)';
  const glowColor = label === 'high' ? 'rgba(16,185,129,0.3)' : label === 'medium' ? 'rgba(245,158,11,0.3)' : 'rgba(244,63,94,0.3)';

  return (
    <div className="confidence-meter">
      <div className="confidence-ring-wrap">
        <svg viewBox="0 0 80 80" className="confidence-ring">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${pct * 2.136} 213.6`}
            transform="rotate(-90 40 40)"
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4, 0, 0.2, 1)', filter: `drop-shadow(0 0 4px ${glowColor})` }}
          />
        </svg>
        <div className="confidence-value" style={{ color }}>{pct}%</div>
      </div>
      <div className="confidence-label">
        <span className="confidence-badge" style={{ background: bgColor, color, border: `1px solid ${glowColor}` }}>
          {label}
        </span>
        <span className="confidence-text">confidence</span>
      </div>

      <style jsx>{`
        .confidence-meter {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .confidence-ring-wrap {
          position: relative;
          width: 64px;
          height: 64px;
        }
        .confidence-ring { width: 100%; height: 100%; }
        .confidence-value {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          font-weight: 700;
        }
        .confidence-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .confidence-badge {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 2px 8px;
          border-radius: var(--radius-full);
        }
        .confidence-text {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
