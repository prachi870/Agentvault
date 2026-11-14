'use client';

import { useEffect, useState } from 'react';
import CitationCard from './CitationCard';
import ConfidenceMeter from './ConfidenceMeter';
import StreamProgress from './StreamProgress';
import Link from 'next/link';
import { getMyAnswerFeedback, submitAnswerFeedback } from '@/lib/api';

export default function ChatMessage({ message }) {
  const [feedbackRecord, setFeedbackRecord] = useState(null);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackFormOpen, setFeedbackFormOpen] = useState(false);
  const [feedbackActionError, setFeedbackActionError] = useState({ receiptId: null, message: '' });
  const [feedbackDraft, setFeedbackDraft] = useState({ helpful: null, reason: '', comment: '' });
  const response = message.response;
  const receiptId = response?.receipt_id;
  const canRate = message.role === 'ai'
    && !message.streaming
    && Boolean(receiptId)
    && ['answered', 'abstained'].includes(response?.status);
  const currentFeedbackRecord = feedbackRecord?.receiptId === receiptId ? feedbackRecord : null;
  const savedFeedback = currentFeedbackRecord?.feedback ?? null;
  const feedbackLoading = canRate && !currentFeedbackRecord;
  const feedbackError = currentFeedbackRecord?.error
    || (feedbackActionError.receiptId === receiptId ? feedbackActionError.message : '');

  useEffect(() => {
    if (!canRate) return undefined;
    let active = true;
    getMyAnswerFeedback(receiptId)
      .then((feedback) => {
        if (active) setFeedbackRecord({ receiptId, feedback, error: '' });
      })
      .catch((error) => {
        if (active) {
          setFeedbackRecord({
            receiptId,
            feedback: null,
            error: error.message || 'Feedback status could not be loaded.',
          });
        }
      });
    return () => { active = false; };
  }, [canRate, receiptId]);

  const openFeedbackForm = (helpful = false) => {
    setFeedbackDraft({
      helpful,
      reason: savedFeedback?.reason || '',
      comment: savedFeedback?.comment || '',
    });
    setFeedbackFormOpen(true);
    setFeedbackActionError({ receiptId, message: '' });
    if (currentFeedbackRecord?.error) {
      setFeedbackRecord({ ...currentFeedbackRecord, error: '' });
    }
  };

  const saveFeedback = async () => {
    if (feedbackDraft.helpful === null || (!feedbackDraft.helpful && !feedbackDraft.reason)) {
      setFeedbackActionError({ receiptId, message: 'Choose a rating and a reason for unhelpful feedback.' });
      return;
    }
    setFeedbackSaving(true);
    setFeedbackActionError({ receiptId, message: '' });
    try {
      const feedback = await submitAnswerFeedback({
        receipt_id: receiptId,
        helpful: feedbackDraft.helpful,
        reason: feedbackDraft.helpful ? null : feedbackDraft.reason,
        comment: feedbackDraft.comment.trim() || null,
      });
      setFeedbackRecord({ receiptId, feedback, error: '' });
      setFeedbackFormOpen(false);
    } catch (error) {
      setFeedbackActionError({ receiptId, message: error.message || 'Your feedback could not be saved.' });
    } finally {
      setFeedbackSaving(false);
    }
  };

  if (message.role === 'user') {
    return (
      <div className="chat-msg chat-msg-user animate-slide-up">
        <div className="chat-msg-bubble chat-msg-bubble-user">
          {message.content}
        </div>
        <style jsx>{`
          .chat-msg-user {
            display: flex;
            justify-content: flex-end;
            padding: var(--space-1) 0;
          }
          .chat-msg-bubble-user {
            max-width: 70%;
            padding: var(--space-3) var(--space-4);
            background: var(--gradient-primary);
            border-radius: var(--radius-lg) var(--radius-lg) 4px var(--radius-lg);
            color: white;
            font-size: var(--font-base);
            line-height: 1.6;
            box-shadow: 0 2px 12px rgba(86, 217, 181, 0.2);
          }
        `}</style>
      </div>
    );
  }

  // Streaming / loading state
  if (message.streaming) {
    return (
      <div className="chat-msg chat-msg-ai animate-slide-up">
        <div className="chat-msg-bubble chat-msg-bubble-ai">
          <div className="chat-ai-header">
            <span className="chat-ai-icon">⚡</span>
            <span className="chat-ai-label">Agentvault is thinking…</span>
          </div>
          <StreamProgress
            completedStages={message.completedStages || []}
            currentStage={message.currentStage}
            active={true}
          />
        </div>
        <style jsx>{`
          .chat-msg-ai { padding: var(--space-1) 0; }
          .chat-msg-bubble-ai {
            max-width: 85%;
            padding: var(--card-padding);
            background: var(--bg-glass);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-glass);
            border-radius: 4px var(--radius-lg) var(--radius-lg) var(--radius-lg);
            box-shadow: var(--shadow-md);
          }
          .chat-ai-header {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            margin-bottom: var(--space-3);
          }
          .chat-ai-icon {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--gradient-primary);
            border-radius: var(--radius-sm);
            font-size: var(--font-sm);
          }
          .chat-ai-label {
            font-size: var(--font-sm);
            font-weight: 600;
            color: var(--violet-400);
          }
        `}</style>
      </div>
    );
  }

  // Full response
  const resp = response;
  if (!resp) return null;

  const statusColors = {
    answered: 'var(--emerald-400)',
    abstained: 'var(--amber-400)',
    blocked: 'var(--rose-400)',
  };

  return (
    <div className="chat-msg chat-msg-ai animate-slide-up">
      <div className="chat-msg-bubble chat-msg-bubble-ai">
        {/* Header */}
        <div className="chat-ai-header">
          <span className="chat-ai-icon">⚡</span>
          <span className={`badge badge-${resp.status}`}>{resp.status}</span>
          {resp.answer_mode && <span className="chat-mode-label">{resp.answer_mode.replace('_', ' ')}</span>}
          <span className="chat-latency">{resp.latency_ms}ms</span>
          <Link href={`/receipts/${resp.receipt_id}`} className="chat-receipt-link" title="View receipt">
            🧾
          </Link>
        </div>

        {/* Answer */}
        <div className="chat-answer">
          {resp.answer}
        </div>

        {/* Abstention reason */}
        {resp.abstain_reason && (
          <div className="chat-abstain">
            <span>ℹ️</span> {resp.abstain_reason}
          </div>
        )}

        {/* Warnings */}
        {resp.warnings?.length > 0 && (
          <div className="chat-warnings">
            {resp.warnings.map((w, i) => (
              <div key={i} className="chat-warning">⚠ {w}</div>
            ))}
          </div>
        )}

        {/* Metrics */}
        <div className="chat-metrics">
          <ConfidenceMeter value={resp.confidence} label={resp.confidence_label} />
          <div className="chat-grounding">
            <div className="chat-grounding-label">Grounding</div>
            <div className="chat-grounding-value">{Math.round(resp.grounding * 100)}%</div>
            <div className="progress-bar" style={{ width: 80 }}>
              <div
                className={`progress-fill ${resp.grounding > 0.7 ? 'emerald' : resp.grounding > 0.4 ? 'amber' : 'rose'}`}
                style={{ width: `${resp.grounding * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Citations */}
        {resp.citations?.length > 0 && (
          <div className="chat-citations">
            <div className="chat-citations-header">
              📎 {resp.citations.length} citation{resp.citations.length > 1 ? 's' : ''}
            </div>
            <div className="chat-citations-list">
              {resp.citations.map((c, i) => (
                <CitationCard key={c.chunk_id} citation={c} index={i + 1} />
              ))}
            </div>
          </div>
        )}

        {canRate && (
          <section className="chat-feedback" aria-label="Answer feedback">
            {feedbackLoading ? (
              <span className="chat-feedback-muted">Loading feedback…</span>
            ) : savedFeedback && !feedbackFormOpen ? (
              <div className="chat-feedback-saved">
                <span>{savedFeedback.helpful ? 'Thanks — marked helpful.' : 'Thanks — feedback sent for review.'}</span>
                <button type="button" onClick={() => openFeedbackForm(savedFeedback.helpful)}>Update feedback</button>
              </div>
            ) : feedbackFormOpen ? (
              <div className="chat-feedback-form">
                <strong>Help us improve this answer</strong>
                <div className="chat-feedback-ratings">
                  <button
                    type="button"
                    className={feedbackDraft.helpful ? 'selected' : ''}
                    aria-pressed={feedbackDraft.helpful === true}
                    onClick={() => setFeedbackDraft((current) => ({ ...current, helpful: true, reason: '' }))}
                  >
                    Helpful
                  </button>
                  <button
                    type="button"
                    className={feedbackDraft.helpful === false ? 'selected' : ''}
                    aria-pressed={feedbackDraft.helpful === false}
                    onClick={() => setFeedbackDraft((current) => ({ ...current, helpful: false }))}
                  >
                    Not helpful
                  </button>
                </div>
                {feedbackDraft.helpful === false && (
                  <label>
                    What should be improved?
                    <select
                      value={feedbackDraft.reason}
                      onChange={(event) => setFeedbackDraft((current) => ({ ...current, reason: event.target.value }))}
                    >
                      <option value="">Choose a reason</option>
                      <option value="incorrect">Incorrect answer</option>
                      <option value="missing_detail">Missing detail</option>
                      <option value="wrong_source">Wrong source</option>
                      <option value="outdated">Outdated information</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                )}
                <textarea
                  rows={2}
                  maxLength={1000}
                  value={feedbackDraft.comment}
                  onChange={(event) => setFeedbackDraft((current) => ({ ...current, comment: event.target.value }))}
                  placeholder="Add context (optional)"
                  aria-label="Optional feedback comment"
                />
                <div className="chat-feedback-form-actions">
                  <button type="button" onClick={() => setFeedbackFormOpen(false)}>Cancel</button>
                  <button type="button" className="primary" onClick={saveFeedback} disabled={feedbackSaving}>
                    {feedbackSaving ? 'Saving…' : 'Save feedback'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="chat-feedback-prompt">
                <span>Was this answer helpful?</span>
                <button type="button" onClick={() => { setFeedbackDraft({ helpful: true, reason: '', comment: '' }); setFeedbackFormOpen(true); }}>Yes</button>
                <button type="button" onClick={() => openFeedbackForm(false)}>Not quite</button>
              </div>
            )}
            {feedbackError && <span className="chat-feedback-error" role="alert">{feedbackError}</span>}
          </section>
        )}
      </div>

      <style jsx>{`
        .chat-msg-ai { padding: var(--space-1) 0; }
        .chat-msg-bubble-ai {
          max-width: 85%;
          padding: var(--card-padding);
          background: var(--bg-glass);
          backdrop-filter: blur(16px);
          border: 1px solid var(--border-glass);
          border-radius: 4px var(--radius-lg) var(--radius-lg) var(--radius-lg);
          box-shadow: var(--shadow-md);
        }
        .chat-ai-header {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          margin-bottom: var(--space-3);
        }
        .chat-ai-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-primary);
          border-radius: var(--radius-sm);
          font-size: var(--font-sm);
        }
        .chat-latency {
          font-size: var(--font-caption);
          color: var(--text-muted);
          margin-left: auto;
        }
        .chat-mode-label { color:var(--text-muted); font-size:var(--font-caption); text-transform:capitalize; }
        .chat-receipt-link {
          font-size: 0.875rem;
          opacity: 0.5;
          transition: opacity var(--transition-fast);
          text-decoration: none;
        }
        .chat-receipt-link:hover { opacity: 1; }
        .chat-answer {
          font-size: var(--font-base);
          line-height: 1.7;
          color: var(--text-primary);
          margin-bottom: var(--space-4);
          white-space: pre-wrap;
        }
        .chat-abstain {
          padding: var(--space-2) var(--space-3);
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: var(--radius-md);
          font-size: var(--font-sm);
          color: var(--amber-400);
          margin-bottom: var(--space-3);
          display: flex;
          align-items: flex-start;
          gap: var(--space-2);
        }
        .chat-warnings { display: flex; flex-direction: column; gap: var(--space-2); margin-bottom: var(--space-3); }
        .chat-warning {
          font-size: var(--font-sm);
          color: var(--amber-400);
          padding: var(--space-2) var(--space-2);
          background: rgba(245, 158, 11, 0.06);
          border-radius: var(--radius-sm);
        }
        .chat-metrics {
          display: flex;
          align-items: center;
          gap: var(--space-8);
          padding: var(--space-3) 0;
          border-top: 1px solid var(--border-glass);
          border-bottom: 1px solid var(--border-glass);
          margin-bottom: var(--space-3);
        }
        .chat-grounding {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .chat-grounding-label {
          font-size: var(--font-caption);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          font-weight: 600;
        }
        .chat-grounding-value {
          font-size: var(--font-h4);
          font-weight: 700;
          color: var(--text-primary);
        }
        .chat-citations { margin-top: var(--space-1); }
        .chat-citations-header {
          font-size: var(--font-sm);
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: var(--space-2);
        }
        .chat-citations-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .chat-feedback {
          margin-top: var(--space-4);
          padding-top: var(--space-3);
          border-top: 1px solid var(--border-glass);
          font-size: var(--font-caption);
        }
        .chat-feedback-prompt,
        .chat-feedback-saved,
        .chat-feedback-form-actions,
        .chat-feedback-ratings {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          flex-wrap: wrap;
        }
        .chat-feedback-prompt span,
        .chat-feedback-saved span,
        .chat-feedback-muted { color: var(--text-muted); }
        .chat-feedback button {
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-sm);
          padding: 5px 9px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font: inherit;
        }
        .chat-feedback button:hover,
        .chat-feedback button.selected {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }
        .chat-feedback button:disabled { opacity: 0.6; cursor: wait; }
        .chat-feedback-form {
          display: grid;
          gap: var(--space-2);
          max-width: 520px;
        }
        .chat-feedback-form strong { color: var(--text-primary); }
        .chat-feedback-form label {
          display: grid;
          gap: 5px;
          color: var(--text-secondary);
        }
        .chat-feedback-form select,
        .chat-feedback-form textarea {
          width: 100%;
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-sm);
          padding: 8px;
          background: var(--landing-bg-primary);
          color: var(--text-primary);
          font: inherit;
        }
        .chat-feedback-form-actions { justify-content: flex-end; }
        .chat-feedback button.primary {
          border-color: var(--accent-primary);
          background: var(--accent-primary);
          color: #05211b;
          font-weight: 700;
        }
        .chat-feedback-error { display: block; margin-top: 6px; color: var(--accent-danger); }
        
        @media (max-width: 768px) {
          .chat-msg-bubble-ai,
          .chat-msg-bubble-user {
            max-width: 95%;
          }
          .chat-msg-bubble-ai {
            padding: var(--space-4);
          }
          .chat-metrics {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-4);
          }
          .chat-grounding {
            width: 100%;
          }
        }
        
        @media (max-width: 575px) {
          .chat-msg-bubble-user {
            padding: var(--space-2) var(--space-3);
            font-size: var(--font-sm);
          }
          .chat-answer {
            font-size: var(--font-sm);
          }
          .chat-ai-icon {
            width: 20px;
            height: 20px;
            font-size: var(--font-caption);
          }
        }
      `}</style>
    </div>
  );
}
