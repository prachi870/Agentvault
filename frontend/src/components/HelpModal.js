'use client';

import { useEffect } from 'react';

export default function HelpModal({ isOpen, onClose, topic = 'general' }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const helpContent = {
    general: {
      title: 'Welcome to Agentvault',
      sections: [
        {
          heading: '🔍 What is Agentvault?',
          content: 'Agentvault helps you ask questions about approved organization knowledge and review the evidence behind an answer.',
        },
        {
          heading: '⚡ Quick Start',
          content: 'Open the knowledge library to see what is available to your account, then ask a specific question in chat. Check the citations and open the answer receipt to inspect the evidence trail.',
        },
        {
          heading: '🛡️ Security & Access',
          content: 'All answers respect your role-based access control (RBAC) and clearance level. You only see information you have permission to access.',
        },
        {
          heading: '📎 Understanding Citations',
          content: 'Every answer includes inline citations marked with [1], [2], etc. Click on these to see the source documents that support each claim.',
        },
      ],
    },
    chat: {
      title: 'Chat Help',
      sections: [
        {
          heading: '💬 Asking Questions',
          content: 'Ask natural language questions about any topic in your knowledge base. Be specific for better results. Example: "What is our Q4 sales strategy for EMEA?"',
        },
        {
          heading: '📊 Understanding Responses',
          content: 'Each response includes:\n• Answer text with inline citations\n• Confidence score (high/medium/low)\n• Grounding percentage (how well supported by evidence)\n• Source documents and excerpts\n• Audit receipt for verification',
        },
        {
          heading: '⚠️ Response Status',
          content: '• ANSWERED: Question answered successfully\n• BLOCKED: Access denied or insufficient clearance\n• UNANSWERED: No relevant information found\n• UNVERIFIABLE: Claims could not be verified',
        },
        {
          heading: '🎯 Tips for Better Results',
          content: '• Be specific and detailed in your questions\n• Include relevant context or constraints\n• Use proper terminology from your domain\n• Break complex questions into smaller parts',
        },
      ],
    },
    receipts: {
      title: 'Audit Receipts',
      sections: [
        {
          heading: '🧾 What are Receipts?',
          content: 'A receipt records the question, evidence, checks, and outcome associated with a response. Its signature can be verified to check the integrity of the recorded payload.',
        },
        {
          heading: '🔐 Verification',
          content: 'Open a receipt to review its evidence trail and select Verify receipt. A valid signature means the recorded payload matches the signed record.',
        },
        {
          heading: '📋 Using Receipts',
          content: 'Use receipts to review how a response was produced, which sources were considered, and whether the receipt signature is valid.',
        },
      ],
    },
    admin: {
      title: 'Admin Guide',
      sections: [
        {
          heading: '👥 User Management',
          content: 'Admins can manage accounts, roles, and clearance. Review the access-impact preview before changing a user to understand which documents may become newly available or unavailable.',
        },
        {
          heading: '📂 Data Sources',
          content: 'Configure a connector from the Connectors page using a connector kind supported by your deployment. Review its default classification and allowed roles before syncing.',
        },
        {
          heading: '🔍 Monitoring',
          content: 'View audit receipts, query analytics, and system health metrics through the admin dashboard. Monitor user activity and system performance.',
        },
        {
          heading: '⚙️ Configuration',
          content: 'Configure LLM providers, embedding models, vector stores, and security settings through environment variables or the admin panel.',
        },
      ],
    },
    errors: {
      title: 'Troubleshooting',
      sections: [
        {
          heading: '🚫 "Access Denied" or "BLOCKED"',
          content: 'The request was blocked. Check the response details and ask your administrator to review your role and the relevant document access settings if needed.',
        },
        {
          heading: '❌ "No documents found"',
          content: 'The system couldn\'t find relevant information in the knowledge base. Try:\n• Rephrasing your question\n• Using different keywords\n• Checking if the data source is connected\n• Asking your admin to upload relevant documents',
        },
        {
          heading: '⏱️ "Request timeout"',
          content: 'The query took too long to process. This may happen with very complex questions or large document sets. Try breaking your question into smaller parts.',
        },
        {
          heading: '🔌 "Service unavailable"',
          content: 'Backend services are temporarily unavailable. Check your connection or contact your system administrator if the issue persists.',
        },
        {
          heading: '📊 Low confidence scores',
          content: 'Low confidence means the system found limited or conflicting evidence. Review citations carefully and consider asking a more specific question.',
        },
      ],
    },
  };

  const content = helpContent[topic] || helpContent.general;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="modal-container">
        <div className="modal-header">
          <h2>{content.title}</h2>
          <button className="close-btn" onClick={onClose} title="Close (Esc)">
            ✕
          </button>
        </div>
        <div className="modal-body">
          {content.sections.map((section, idx) => (
            <div key={idx} className="help-section">
              <h3>{section.heading}</h3>
              <p>{section.content}</p>
            </div>
          ))}
          <div className="help-footer">
            <p>
              <strong>Need more help?</strong> Contact your system administrator and share the receipt ID if you are asking about a specific response.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        .modal-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 90%;
          max-width: 700px;
          max-height: 85vh;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-2xl);
          z-index: 1001;
          animation: slideUp 0.3s ease-out;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 1px solid var(--border-glass);
          flex-shrink: 0;
        }

        .modal-header h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-glass);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 1.2rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-default);
        }

        .modal-body {
          overflow-y: auto;
          padding: 28px;
          flex: 1;
        }

        .help-section {
          margin-bottom: 28px;
        }

        .help-section:last-of-type {
          margin-bottom: 20px;
        }

        .help-section h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .help-section p {
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.7;
          white-space: pre-line;
        }

        .help-footer {
          margin-top: 32px;
          padding-top: 20px;
          border-top: 1px solid var(--border-glass);
        }

        .help-footer p {
          color: var(--text-secondary);
          font-size: 0.85rem;
          line-height: 1.6;
        }

        .help-footer strong {
          color: var(--text-primary);
          font-weight: 600;
        }

        .help-footer a {
          color: var(--violet-500);
          text-decoration: none;
          font-weight: 500;
        }

        .help-footer a:hover {
          text-decoration: underline;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translate(-50%, -48%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        @media (max-width: 768px) {
          .modal-container {
            width: 95%;
            max-height: 90vh;
          }
          .modal-header {
            padding: 20px;
          }
          .modal-body {
            padding: 20px;
          }
        }
      `}</style>
    </>
  );
}
