'use client';

const STAGES = [
  { key: 'guard_input', label: 'Security Check', icon: '🛡️' },
  { key: 'plan', label: 'Planning', icon: '🧠' },
  { key: 'retrieve', label: 'Retrieving', icon: '🔍' },
  { key: 'grade', label: 'Grading Evidence', icon: '⚖️' },
  { key: 'rewrite', label: 'Rewriting Query', icon: '✏️' },
  { key: 'engineer_context', label: 'Building Context', icon: '🔧' },
  { key: 'generate', label: 'Generating', icon: '✨' },
  { key: 'verify', label: 'Verifying Claims', icon: '✅' },
  { key: 'finalize', label: 'Finalizing', icon: '📋' },
];

export default function StreamProgress({ completedStages = [], currentStage = null, active = false }) {
  return (
    <div className="stream-progress">
      <div className="stream-stages">
        {STAGES.map((stage) => {
          const completed = completedStages.includes(stage.key);
          const isCurrent = currentStage === stage.key;
          const skipped = !completed && !isCurrent && completedStages.length > 0 &&
            STAGES.indexOf(stage) < STAGES.findIndex(s => s.key === currentStage);

          if (!completed && !isCurrent && !skipped) return null;

          return (
            <div
              key={stage.key}
              className={`stream-stage ${completed ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <span className="stream-stage-icon">
                {completed ? '✓' : isCurrent ? stage.icon : '○'}
              </span>
              <span className="stream-stage-label">{stage.label}</span>
              {isCurrent && active && <span className="stream-stage-dots"><span>.</span><span>.</span><span>.</span></span>}
            </div>
          );
        })}
      </div>

      {active && (
        <div className="stream-bar">
          <div className="stream-bar-fill" />
        </div>
      )}

      <style jsx>{`
        .stream-progress {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px 0;
        }
        .stream-stages {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .stream-stage {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          background: var(--bg-elevated);
          border: 1px solid var(--border-glass);
          color: var(--text-muted);
          animation: slideUp 200ms ease backwards;
        }
        .stream-stage.completed {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
          color: var(--emerald-400);
        }
        .stream-stage.current {
          background: rgba(86, 217, 181, 0.12);
          border-color: rgba(86, 217, 181, 0.3);
          color: var(--violet-400);
          box-shadow: 0 0 12px rgba(86, 217, 181, 0.15);
        }
        .stream-stage-icon { font-size: 0.8rem; }
        .stream-stage-label { font-weight: 500; }
        .stream-stage-dots span {
          animation: pulse 1s infinite;
        }
        .stream-stage-dots span:nth-child(2) { animation-delay: 0.2s; }
        .stream-stage-dots span:nth-child(3) { animation-delay: 0.4s; }
        .stream-bar {
          height: 3px;
          background: var(--bg-elevated);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .stream-bar-fill {
          height: 100%;
          width: 40%;
          background: var(--gradient-primary);
          border-radius: var(--radius-full);
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
