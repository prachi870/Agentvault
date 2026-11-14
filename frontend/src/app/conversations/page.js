'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRequireAuth } from '@/lib/auth';
import { deleteConversation, listConversations, renameConversation } from '@/lib/api';

const currentConversationKey = (userId) => `agentvault_current_conversation_${userId}`;
const openConversationKey = (userId) => `agentvault_open_conversation_${userId}`;
const getErrorMessage = (error, fallback) => (
  typeof error?.detail === 'string'
    ? error.detail
    : typeof error?.detail?.detail === 'string'
      ? error.detail.detail
      : error?.message || fallback
);

export default function ConversationsPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (loading || !user?.id) return undefined;
    let active = true;
    listConversations()
      .then((items) => {
        if (active) setConversations(items);
      })
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError, 'Could not load saved conversations.'));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
  }, [loading, user]);

  const visibleConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? conversations.filter((conversation) => conversation.title.toLowerCase().includes(term))
      : conversations;
  }, [conversations, search]);

  const openConversation = (id) => {
    sessionStorage.setItem(openConversationKey(user.id), id);
    router.push('/chat');
  };

  const startNewChat = () => {
    if (user?.id) {
      sessionStorage.removeItem(currentConversationKey(user.id));
      sessionStorage.removeItem(openConversationKey(user.id));
    }
    router.push('/chat');
  };

  const saveTitle = async (id) => {
    const title = editTitle.trim();
    if (!title) {
      setError('Conversation title cannot be blank.');
      return;
    }
    try {
      const updated = await renameConversation(id, title);
      setConversations((items) => items.map((item) => item.id === id ? updated : item));
      setEditingId(null);
      setEditTitle('');
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not rename this conversation.'));
    }
  };

  const removeConversation = async (conversation) => {
    if (!window.confirm(`Remove “${conversation.title}” from Saved conversations? Its signed receipts will remain in the Evidence Ledger.`)) {
      return;
    }
    try {
      await deleteConversation(conversation.id);
      setConversations((items) => items.filter((item) => item.id !== conversation.id));
      if (user?.id && sessionStorage.getItem(currentConversationKey(user.id)) === conversation.id) {
        sessionStorage.removeItem(currentConversationKey(user.id));
      }
      setError('');
    } catch (requestError) {
      setError(getErrorMessage(requestError, 'Could not delete this conversation.'));
    }
  };

  if (loading) {
    return <div className="empty-state" style={{ minHeight: '60vh' }}>Loading…</div>;
  }

  return (
    <main className="conversations-page">
      <header className="conversations-header">
        <div>
          <span className="conversations-eyebrow">YOUR WORKSPACE</span>
          <h1>Saved conversations</h1>
          <p>Pick up where you left off. New chats are saved automatically to your account.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={startNewChat}>＋ New chat</button>
      </header>

      <section className="conversations-panel" aria-label="Conversation history">
        <label className="conversation-search">
          <span>Search your conversations</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by conversation title"
          />
        </label>

        {error && <p className="conversation-alert" role="alert">{error}</p>}
        {isLoading && <p className="conversation-state">Loading your saved conversations…</p>}
        {!isLoading && !error && conversations.length === 0 && (
          <div className="conversation-empty">
            <div className="conversation-empty-icon" aria-hidden="true">↗</div>
            <h2>Your useful answers will be easy to find</h2>
            <p>Start a chat and it will appear here with its answers and citations, ready to reopen later.</p>
            <button className="btn btn-primary" type="button" onClick={startNewChat}>Start your first chat</button>
          </div>
        )}
        {!isLoading && conversations.length > 0 && visibleConversations.length === 0 && (
          <p className="conversation-state">No conversations match “{search}”.</p>
        )}

        {visibleConversations.length > 0 && (
          <ul className="conversation-list">
            {visibleConversations.map((conversation) => (
              <li className="conversation-card" key={conversation.id}>
                <div className="conversation-card-copy">
                  {editingId === conversation.id ? (
                    <form
                      className="conversation-rename-form"
                      onSubmit={(event) => { event.preventDefault(); saveTitle(conversation.id); }}
                    >
                      <input
                        aria-label="Conversation title"
                        maxLength={120}
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-secondary btn-sm" type="submit">Save title</button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <h2>{conversation.title}</h2>
                      <p>
                        {conversation.turn_count} {conversation.turn_count === 1 ? 'question' : 'questions'}
                        <span aria-hidden="true"> · </span>
                        Updated {new Date(conversation.updated_at).toLocaleString()}
                      </p>
                    </>
                  )}
                </div>
                <div className="conversation-card-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => {
                      setError('');
                      setEditTitle(conversation.title);
                      setEditingId(conversation.id);
                    }}
                    aria-label={`Rename ${conversation.title}`}
                  >
                    Rename
                  </button>
                  <button
                    className="btn btn-ghost btn-sm conversation-delete"
                    type="button"
                    onClick={() => removeConversation(conversation)}
                    aria-label={`Delete ${conversation.title}`}
                  >
                    Delete
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    type="button"
                    onClick={() => openConversation(conversation.id)}
                  >
                    Open <span aria-hidden="true">→</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="conversation-retention-note">
        Conversations are private to your account. Removing one hides it from this list; signed audit receipts remain available in the <Link href="/receipts">Evidence Ledger</Link>.
      </p>

      <style jsx>{`
        .conversations-page { max-width: 1000px; margin: 0 auto; padding: 8px 0 36px; }
        .conversations-header { display:flex; justify-content:space-between; align-items:flex-end; gap:20px; margin-bottom:24px; }
        .conversations-eyebrow { color:var(--text-muted); font-size:.68rem; font-weight:700; letter-spacing:.12em; }
        .conversations-header h1 { margin:8px 0; font-size:clamp(1.7rem,3vw,2.25rem); color:var(--text-primary); }
        .conversations-header p { margin:0; color:var(--text-secondary); }
        .conversations-panel { border:1px solid var(--glass-border); border-radius:var(--radius-xl); background:var(--glass-bg); padding:22px; }
        .conversation-search { display:flex; align-items:center; gap:16px; max-width:680px; color:var(--text-secondary); font-size:.85rem; margin-bottom:18px; }
        .conversation-search input,.conversation-rename-form input { width:100%; min-width:0; padding:10px 12px; color:var(--text-primary); background:var(--bg-secondary); border:1px solid var(--border-default); border-radius:var(--radius-md); }
        .conversation-state { padding:28px 8px; color:var(--text-muted); text-align:center; }
        .conversation-alert { padding:12px 14px; color:var(--accent-danger); background:rgba(220,70,70,.08); border:1px solid rgba(220,70,70,.2); border-radius:var(--radius-md); }
        .conversation-empty { max-width:480px; margin:40px auto; text-align:center; }
        .conversation-empty-icon { width:48px; height:48px; display:grid; place-items:center; margin:0 auto 12px; border-radius:16px; color:var(--accent-primary); background:rgba(101,190,181,.1); font-size:1.5rem; }
        .conversation-empty h2 { color:var(--text-primary); font-size:1.12rem; }
        .conversation-empty p { color:var(--text-secondary); line-height:1.6; margin-bottom:20px; }
        .conversation-list { list-style:none; margin:0; padding:0; }
        .conversation-card { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:16px 4px; border-top:1px solid var(--border-glass); }
        .conversation-card-copy { min-width:0; }
        .conversation-card h2 { overflow:hidden; margin:0 0 6px; color:var(--text-primary); font-size:1rem; text-overflow:ellipsis; white-space:nowrap; }
        .conversation-card p { margin:0; color:var(--text-muted); font-size:.78rem; }
        .conversation-card-actions { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .conversation-delete { color:var(--danger-500); }
        .conversation-rename-form { display:flex; align-items:center; gap:8px; }
        .conversation-retention-note { margin:14px 4px; color:var(--text-muted); font-size:.78rem; line-height:1.6; }
        .conversation-retention-note a { color:var(--accent-500); text-decoration:underline; text-underline-offset:2px; }
        @media (max-width:680px) {
          .conversations-header { align-items:flex-start; flex-direction:column; }
          .conversations-panel { padding:16px; }
          .conversation-search { align-items:stretch; flex-direction:column; gap:8px; }
          .conversation-card { align-items:flex-start; flex-direction:column; }
          .conversation-card-actions { width:100%; justify-content:flex-end; }
          .conversation-rename-form { align-items:stretch; flex-wrap:wrap; }
        }
      `}</style>
    </main>
  );
}
