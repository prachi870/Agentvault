'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useRequireRole } from '@/lib/auth';
import { getAnswerFeedbackReview, updateAnswerFeedbackStatus } from '@/lib/api';

const FILTERS = [
  { value: 'open', label: 'Needs review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'all', label: 'All feedback' },
];

const REASONS = {
  incorrect: 'Incorrect answer',
  missing_detail: 'Missing detail',
  wrong_source: 'Wrong source',
  outdated: 'Outdated information',
  other: 'Other',
};

export default function FeedbackPage() {
  const { loading: authLoading, hasRole } = useRequireRole('manager', 'admin');
  const [filter, setFilter] = useState('open');
  const [items, setItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingId, setUpdatingId] = useState('');
  const [loadedRequestKey, setLoadedRequestKey] = useState(null);
  const [requestError, setRequestError] = useState({ key: null, message: '' });
  const [actionError, setActionError] = useState({ key: null, message: '' });
  const requestKey = `${filter}:${refreshKey}`;
  const loading = !authLoading && hasRole && loadedRequestKey !== requestKey;
  const error = (actionError.key === requestKey ? actionError.message : '')
    || (requestError.key === requestKey ? requestError.message : '');

  useEffect(() => {
    if (authLoading || !hasRole) return undefined;
    let active = true;
    getAnswerFeedbackReview(filter)
      .then((result) => {
        if (!active) return;
        setItems(result);
        setRequestError({ key: requestKey, message: '' });
      })
      .catch((err) => {
        if (active) setRequestError({ key: requestKey, message: err.message || 'Answer feedback could not be loaded.' });
      })
      .finally(() => {
        if (active) setLoadedRequestKey(requestKey);
      });
    return () => { active = false; };
  }, [authLoading, hasRole, filter, requestKey]);

  if (authLoading) return null;
  if (!hasRole) {
    return (
      <main className="feedback-page">
        <section className="feedback-empty">
          <h1>Administrator access required</h1>
          <p>Answer feedback is available to managers and administrators.</p>
        </section>
      </main>
    );
  }

  const updateStatus = async (item) => {
    const status = item.status === 'open' ? 'reviewed' : 'open';
    setUpdatingId(item.id);
    setActionError({ key: requestKey, message: '' });
    setRequestError({ key: requestKey, message: '' });
    try {
      await updateAnswerFeedbackStatus(item.id, status);
      setItems((current) => {
        if ((filter === 'open' && status === 'reviewed') || (filter === 'reviewed' && status === 'open')) {
          return current.filter((entry) => entry.id !== item.id);
        }
        return current.map((entry) => entry.id === item.id ? { ...entry, status } : entry);
      });
    } catch (err) {
      setActionError({ key: requestKey, message: err.message || 'Feedback status could not be updated.' });
    } finally {
      setUpdatingId('');
    }
  };

  const openCount = items.filter((item) => item.status === 'open').length;
  const unhelpfulCount = items.filter((item) => !item.helpful).length;

  return (
    <main className="feedback-page">
      <header className="feedback-header">
        <div>
          <span className="feedback-eyebrow">ANSWER QUALITY LOOP</span>
          <h1>Answer feedback</h1>
          <p>Review user ratings alongside the answer and cited sources, then close the loop.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'feedback-spinning' : ''} />
          Refresh
        </button>
      </header>

      <aside className="feedback-privacy-note">
        Feedback is shown without user names or email addresses. Managers only see feedback from their department when its cited sources are within their access; administrators can review all workspace feedback. Handle notes according to your organization’s data policy.
      </aside>

      <section className="feedback-summary" aria-label="Feedback summary">
        <div><strong>{loading ? '—' : items.length}</strong><span>items shown</span></div>
        <div><strong>{loading ? '—' : openCount}</strong><span>awaiting review</span></div>
        <div><strong>{loading ? '—' : unhelpfulCount}</strong><span>marked not helpful</span></div>
      </section>

      <div className="feedback-toolbar">
        <div className="feedback-filters" aria-label="Feedback status">
          {FILTERS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={filter === option.value ? 'active' : ''}
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <span className="feedback-anonymous">Latest 100 · no employee identity displayed</span>
      </div>

      {error && <div className="feedback-error" role="alert">{error}</div>}

      <div className="feedback-list" aria-live="polite">
        {loading ? (
          <div className="feedback-empty">Loading feedback…</div>
        ) : items.length === 0 ? (
          <section className="feedback-empty">
            <CheckCircle2 size={26} />
            <h2>{filter === 'open' ? 'Nothing to review' : 'No feedback here yet'}</h2>
            <p>When users rate an answer in chat, it will appear here alongside its receipt evidence.</p>
          </section>
        ) : items.map((item) => (
          <article className="feedback-card" key={item.id}>
            <div className="feedback-card-heading">
              <div className={`feedback-rating ${item.helpful ? 'helpful' : 'unhelpful'}`}>
                {item.helpful ? <ThumbsUp size={17} /> : <ThumbsDown size={17} />}
                <strong>{item.helpful ? 'Helpful' : 'Not helpful'}</strong>
                {!item.helpful && item.reason && <span>{REASONS[item.reason] || item.reason}</span>}
              </div>
              <div className="feedback-card-actions">
                <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                {item.status === 'open' ? (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => updateStatus(item)} disabled={updatingId === item.id}>
                    <CheckCircle2 size={15} /> {updatingId === item.id ? 'Saving…' : 'Mark reviewed'}
                  </button>
                ) : (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => updateStatus(item)} disabled={updatingId === item.id}>
                    Reopen
                  </button>
                )}
              </div>
            </div>

            <div className="feedback-context">
              <div>
                <span className="feedback-label">QUESTION</span>
                <p>{item.query}</p>
              </div>
              <div>
                <span className="feedback-label">ANSWER</span>
                <p>{item.answer || 'No answer text was recorded.'}</p>
              </div>
            </div>

            {item.citation_titles.length > 0 && (
              <div className="feedback-sources">
                <FileText size={15} />
                <span>Sources: {item.citation_titles.join(' · ')}</span>
              </div>
            )}
            {item.comment && <blockquote className="feedback-comment">{item.comment}</blockquote>}

            <footer className="feedback-card-footer">
              <span>{Math.round(item.confidence * 100)}% confidence · {Math.round(item.grounding * 100)}% grounding</span>
              <Link href={`/receipts/${item.receipt_id}`} className="feedback-receipt-link">
                Inspect receipt <ExternalLink size={14} />
              </Link>
            </footer>
          </article>
        ))}
      </div>
    </main>
  );
}
