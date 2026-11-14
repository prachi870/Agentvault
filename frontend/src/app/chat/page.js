'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRequireAuth } from '@/lib/auth';
import { createConversation, getConversation, queryStream } from '@/lib/api';
import ChatMessage from '@/components/ChatMessage';
import HelpModal from '@/components/HelpModal';

const currentConversationKey = (userId) => `agentvault_current_conversation_${userId}`;
const openConversationKey = (userId) => `agentvault_open_conversation_${userId}`;
const getErrorMessage = (error, fallback) => (
  typeof error?.detail === 'string'
    ? error.detail
    : typeof error?.detail?.detail === 'string'
      ? error.detail.detail
      : error?.message || fallback
);

export default function ChatPage() {
  const { user, loading } = useRequireAuth();
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [conversationError, setConversationError] = useState('');
  const [input, setInput] = useState('');
  const [answerMode, setAnswerMode] = useState('detailed');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handlePendingQuestion = (question) => {
      setInput(question);
      inputRef.current?.focus();
    };
    const pendingQuestion = sessionStorage.getItem('agentvault_pending_question');
    if (pendingQuestion) {
      handlePendingQuestion(pendingQuestion);
      sessionStorage.removeItem('agentvault_pending_question');
    }
    const handleAsk = (event) => handlePendingQuestion(event.detail);
    window.addEventListener('agentvault:ask', handleAsk);
    return () => window.removeEventListener('agentvault:ask', handleAsk);
  }, []);

  useEffect(() => {
    if (loading || !user?.id) return undefined;
    const pendingKey = openConversationKey(user.id);
    const currentKey = currentConversationKey(user.id);
    const id = sessionStorage.getItem(pendingKey) || sessionStorage.getItem(currentKey);
    sessionStorage.removeItem(pendingKey);
    if (!id) return undefined;

    let active = true;
    // The restore target comes from sessionStorage and cannot be derived during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoadingConversation(true);
    getConversation(id)
      .then((conversation) => {
        if (!active) return;
        setConversationError('');
        const restoredMessages = conversation.turns.flatMap((turn) => [
          { id: `${turn.response.receipt_id}-question`, role: 'user', content: turn.question },
          { id: `${turn.response.receipt_id}-answer`, role: 'ai', streaming: false, response: turn.response },
        ]);
        setConversationId(conversation.id);
        setMessages(restoredMessages);
        sessionStorage.setItem(currentKey, conversation.id);
      })
      .catch((error) => {
        if (!active) return;
        sessionStorage.removeItem(currentKey);
        setConversationError(getErrorMessage(error, 'Could not load this conversation.'));
      })
      .finally(() => {
        if (active) setIsLoadingConversation(false);
      });

    return () => { active = false; };
  }, [loading, user]);

  const startNewChat = () => {
    if (isStreaming || isLoadingConversation) return;
    setMessages([]);
    setConversationId(null);
    setConversationError('');
    if (user?.id) sessionStorage.removeItem(currentConversationKey(user.id));
  };

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || isStreaming || isLoadingConversation) return;

    setIsStreaming(true);
    setConversationError('');
    let activeConversationId = conversationId;
    try {
      if (!activeConversationId) {
        const created = await createConversation(question.slice(0, 120));
        activeConversationId = created.id;
        setConversationId(created.id);
        if (user?.id) sessionStorage.setItem(currentConversationKey(user.id), created.id);
      }
    } catch (error) {
      setIsStreaming(false);
      setConversationError(getErrorMessage(error, 'Could not save this conversation.'));
      return;
    }

    setInput('');
    // Add user message
    const userMsg = { id: Date.now(), role: 'user', content: question };
    const aiMsg = { id: Date.now() + 1, role: 'ai', streaming: true, completedStages: [], currentStage: null, response: null };
    const previousAnswer = [...messages].reverse().find(
      (message) => message.role === 'ai' && !message.streaming && message.response
    )?.response;
    const contextTitles = previousAnswer?.status === 'answered'
      ? [...new Set((previousAnswer.citations || []).map((citation) => citation.title).filter(Boolean))].slice(0, 3)
      : [];
    const excludedChunkIds = contextTitles.length
      ? [...new Set((previousAnswer.citations || []).map((citation) => citation.chunk_id).filter(Boolean))].slice(0, 16)
      : [];

    setMessages((prev) => [...prev, userMsg, aiMsg]);

    const controller = queryStream(
      question,
      // onEvent
      (event) => {
        if (event.type === 'progress') {
          setMessages((prev) => {
            const updated = [...prev];
            const last = { ...updated[updated.length - 1] };
            if (last.currentStage && last.currentStage !== event.stage) {
              last.completedStages = [...(last.completedStages || []), last.currentStage];
            }
            last.currentStage = event.stage;
            updated[updated.length - 1] = last;
            return updated;
          });
        } else if (event.type === 'result') {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              streaming: false,
              response: event.response,
              completedStages: [],
              currentStage: null,
            };
            return updated;
          });
          setIsStreaming(false);
        }
      },
      // onDone
      () => {
        setIsStreaming(false);
      },
      // onError
      (err) => {
        const errorMessage = getErrorMessage(err, typeof err === 'string' ? err : JSON.stringify(err));
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            streaming: false,
            response: {
              receipt_id: '',
              status: 'blocked',
              answer_mode: answerMode,
              answer: errorMessage,
              confidence: 0,
              confidence_label: 'low',
              grounding: 0,
              citations: [],
              warnings: [],
              plan: {},
              latency_ms: 0,
            },
          };
          return updated;
        });
        setIsStreaming(false);
      },
      answerMode,
      contextTitles,
      excludedChunkIds,
      activeConversationId
    );

    controllerRef.current = controller;
  }, [answerMode, conversationId, input, isLoadingConversation, isStreaming, messages, user]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="empty-state" style={{ minHeight: '80vh' }}>
        <div className="animate-pulse" style={{ fontSize: '2rem' }}>⚡</div>
      </div>
    );
  }

  return (
    <div className="chat-page">
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} topic="chat" />
      
      {/* Header */}
      <div className="chat-header">
        <div>
          <h1 className="chat-title">Ask Agentvault</h1>
          <p className="chat-subtitle">Enterprise knowledge at your fingertips — verified and cited</p>
        </div>
        <div className="chat-header-actions">
          <button
            className="btn btn-secondary btn-sm"
            type="button"
            onClick={startNewChat}
            disabled={isStreaming || isLoadingConversation || (!conversationId && messages.length === 0 && !conversationError)}
          >
            New chat
          </button>
          <label className="answer-mode-control">
            <span>Answer style</span>
            <select value={answerMode} onChange={(event) => setAnswerMode(event.target.value)} aria-label="Answer style">
              <option value="quick">Quick</option>
              <option value="detailed">Detailed</option>
              <option value="decision_brief">Decision brief</option>
            </select>
          </label>
          <button
            className="help-btn"
            onClick={() => setShowHelp(true)}
            title="Help & Documentation"
          >
            ?
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={scrollRef}>
        {conversationError && <p className="conversation-error" role="alert">{conversationError}</p>}
        {isLoadingConversation && <p className="conversation-loading">Loading saved conversation…</p>}
        {messages.length === 0 && (
          <div className="chat-welcome animate-fade-in">
            <div className="chat-welcome-icon">⚡</div>
            <h2>Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}</h2>
            <p>Ask a question about your enterprise knowledge base. Every answer is grounded in retrieved evidence, verified for accuracy, and comes with a signed audit receipt.</p>
            <div className="chat-welcome-features">
              <div className="chat-feature">
                <span>🔍</span>
                <span>Multi-source retrieval</span>
              </div>
              <div className="chat-feature">
                <span>✅</span>
                <span>Claim verification</span>
              </div>
              <div className="chat-feature">
                <span>📎</span>
                <span>Inline citations</span>
              </div>
              <div className="chat-feature">
                <span>🛡️</span>
                <span>RBAC enforced</span>
              </div>
            </div>
            <div className="chat-starters" aria-label="Suggested questions">
              <span>TRY ASKING</span>
              {[
                'What knowledge sources can I access?',
                'Find the latest guidance for my team',
                'Summarize the key points in a policy',
              ].map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => {
                  setInput(suggestion);
                  inputRef.current?.focus();
                }}>
                  {suggestion}<span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="chat-input-wrap">
        <div className="chat-input-card">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Ask a question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isStreaming || isLoadingConversation}
            autoFocus
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || isLoadingConversation}
            title="Send (Enter)"
          >
            {isStreaming ? (
              <span className="animate-spin">⏳</span>
            ) : (
              '→'
            )}
          </button>
        </div>
        <div className="chat-input-hint">
          Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
        </div>
      </div>

      <style jsx>{`
        .chat-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - var(--topnav-height));
          max-width: 900px;
          margin: 0 auto;
        }

        .chat-header {
          flex-shrink: 0;
          padding-bottom: var(--space-4);
          border-bottom: 1px solid var(--border-glass);
          margin-bottom: var(--space-4);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chat-header-actions { display:flex; align-items:center; gap:12px; }
        .answer-mode-control { display:flex; flex-direction:column; gap:4px; color:var(--text-muted); font-size:.62rem; font-weight:650; letter-spacing:.06em; text-transform:uppercase; }
        .answer-mode-control select { min-width:150px; }
        @media (max-width:575px) { .chat-header-actions { align-items:flex-end; } .answer-mode-control select { min-width:124px; } }

        .help-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-glass);
          border: 1px solid var(--border-glass);
          border-radius: 50%;
          color: var(--text-secondary);
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .help-btn:hover {
          background: var(--bg-hover);
          color: var(--violet-500);
          border-color: var(--violet-500);
          transform: scale(1.05);
        }

        .chat-title {
          font-size: var(--font-h2);
          font-weight: 700;
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .chat-subtitle {
          font-size: var(--font-sm);
          color: var(--text-muted);
          margin-top: var(--space-1);
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-2) 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .chat-welcome {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--space-14) var(--space-5);
          flex: 1;
        }

        .chat-welcome-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.75rem;
          background: var(--gradient-primary);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-glow-lg);
          margin-bottom: var(--space-5);
        }

        .chat-welcome h2 {
          font-size: var(--font-h3);
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: var(--space-2);
        }

        .chat-welcome p {
          max-width: 500px;
          color: var(--text-secondary);
          font-size: var(--font-sm);
          line-height: 1.6;
          margin-bottom: var(--space-7);
        }

        .chat-welcome-features {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--space-3);
        }

        .chat-feature {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-4);
          background: var(--bg-glass);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-full);
          font-size: var(--font-sm);
          color: var(--text-secondary);
        }

        .chat-input-wrap {
          flex-shrink: 0;
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-glass);
        }

        .chat-input-card {
          display: flex;
          align-items: flex-end;
          gap: var(--space-2);
          background: var(--bg-glass);
          backdrop-filter: blur(16px);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: var(--space-2) var(--space-3);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }

        .chat-input-card:focus-within {
          border-color: var(--violet-500);
          box-shadow: 0 0 0 3px rgba(86, 217, 181, 0.12), var(--shadow-glow);
        }

        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-family: inherit;
          font-size: var(--font-base);
          line-height: 1.5;
          padding: var(--space-2) var(--space-1);
          resize: none;
          max-height: 120px;
        }

        .chat-input::placeholder { color: var(--text-muted); }
        .chat-input:disabled { opacity: 0.5; }

        .chat-send-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-primary);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-size: 1.125rem;
          font-weight: 700;
          cursor: pointer;
          transition: all var(--transition-fast);
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(86, 217, 181, 0.22);
        }

        .chat-send-btn:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(86, 217, 181, 0.3);
          transform: translateY(-1px);
        }

        .chat-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
        }

        .chat-input-hint {
          text-align: center;
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 8px;
          padding-bottom: 4px;
        }

        .chat-input-hint kbd {
          background: var(--bg-elevated);
          padding: 1px 6px;
          border-radius: 3px;
          font-family: inherit;
          font-size: 0.65rem;
          border: 1px solid var(--border-glass);
        }
        .chat-starters {
          width: min(100%, 620px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 24px;
        }
        .chat-starters > span {
          width: 100%;
          color: var(--text-muted);
          font-size: .64rem;
          font-weight: 700;
          letter-spacing: .13em;
        }
        .chat-starters button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 11px;
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-full);
          background: rgba(21, 31, 45, .72);
          color: var(--text-secondary);
          font: inherit;
          font-size: .72rem;
          cursor: pointer;
          transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
        }
        .chat-starters button:hover {
          border-color: var(--border-accent);
          background: rgba(101, 190, 181, .08);
          color: var(--text-primary);
        }
        .chat-starters button span { color: var(--text-accent); }

        @media (max-width: 768px) {
          .chat-page { 
            height: calc(100vh - var(--topnav-height)); 
            padding: 0 var(--space-4);
          }
          .chat-header {
            padding-bottom: var(--space-3);
            margin-bottom: var(--space-3);
          }
          .chat-title {
            font-size: var(--font-h3);
          }
          .chat-subtitle {
            font-size: var(--font-caption);
          }
          .help-btn {
            width: 28px;
            height: 28px;
            font-size: 0.875rem;
          }
          .chat-welcome {
            padding: var(--space-8) var(--space-4);
          }
          .chat-welcome h2 {
            font-size: var(--font-h4);
          }
          .chat-welcome-icon {
            width: 48px;
            height: 48px;
            font-size: 1.5rem;
          }
          .chat-welcome-features { 
            flex-direction: column; 
            align-items: center;
            gap: var(--space-2);
          }
          .chat-starters {
            flex-direction: column;
            gap: var(--space-2);
          }
          .chat-starters button {
            width: 100%;
            justify-content: space-between;
          }
          .chat-messages {
            padding: var(--space-1) 0;
          }
          .chat-input-hint {
            font-size: var(--font-caption);
          }
        }

        @media (max-width: 575px) {
          .chat-page {
            padding: 0 var(--space-3);
          }
          .chat-input-card {
            gap: var(--space-1);
          }
          .chat-send-btn {
            width: 32px;
            height: 32px;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
