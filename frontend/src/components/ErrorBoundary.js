'use client';

import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Reload Page
            </button>
          </div>

          <style jsx>{`
            .error-boundary {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              background: var(--bg-base);
            }

            .error-card {
              text-align: center;
              max-width: 500px;
              background: var(--bg-elevated);
              border: 1px solid var(--border-default);
              border-radius: var(--radius-xl);
              padding: 48px 32px;
              box-shadow: var(--shadow-lg);
            }

            .error-icon {
              font-size: 4rem;
              margin-bottom: 16px;
            }

            h2 {
              font-size: 1.5rem;
              font-weight: 700;
              color: var(--text-primary);
              margin-bottom: 12px;
            }

            .error-message {
              color: var(--text-secondary);
              font-size: 0.9rem;
              line-height: 1.6;
              margin-bottom: 24px;
            }

            .btn {
              padding: 10px 24px;
              border-radius: var(--radius-md);
              font-size: 0.9rem;
              font-weight: 600;
              cursor: pointer;
              transition: all var(--transition-fast);
              border: none;
            }

            .btn-primary {
              background: var(--gradient-primary);
              color: white;
              box-shadow: 0 2px 8px rgba(86, 217, 181, 0.22);
            }

            .btn-primary:hover {
              box-shadow: 0 4px 16px rgba(86, 217, 181, 0.3);
              transform: translateY(-1px);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
