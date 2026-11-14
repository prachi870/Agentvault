'use client';

import { useState } from 'react';
import { signup } from '@/lib/api';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(email, password, fullName, department);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-page">
        <div className="login-bg">
          <div className="login-orb login-orb-1" />
          <div className="login-orb login-orb-2" />
          <div className="login-orb login-orb-3" />
        </div>

        <div className="login-card animate-scale-in">
          <div className="login-header">
            <div className="login-logo">✓</div>
            <h1>Account Created!</h1>
            <p>Redirecting you to login...</p>
          </div>
        </div>

        <style jsx>{`
          .login-page {
            position: fixed;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--gradient-bg);
            z-index: 2000;
            padding: 20px;
          }

          .login-bg {
            position: absolute;
            inset: 0;
            overflow: hidden;
            pointer-events: none;
          }

          .login-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(100px);
            opacity: 0.3;
          }

          .login-orb-1 {
            width: 500px;
            height: 500px;
            background: var(--violet-700);
            top: -100px;
            right: -100px;
            animation: pulse 6s infinite;
          }

          .login-orb-2 {
            width: 400px;
            height: 400px;
            background: var(--cyan-500);
            bottom: -80px;
            left: -80px;
            animation: pulse 8s infinite 2s;
          }

          .login-orb-3 {
            width: 300px;
            height: 300px;
            background: var(--violet-500);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            animation: pulse 7s infinite 1s;
          }

          .login-card {
            background: rgba(17, 24, 39, 0.7);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-xl);
            padding: 32px;
            width: 100%;
            max-width: 420px;
            box-shadow: var(--shadow-xl), var(--shadow-glow-lg);
            position: relative;
            z-index: 1;
          }

          .login-header {
            text-align: center;
          }

          .login-logo {
            width: 48px;
            height: 48px;
            margin: 0 auto 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: var(--radius-lg);
            box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
          }

          .login-header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 6px;
          }

          .login-header p {
            font-size: 0.875rem;
            color: var(--text-muted);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      <div className="login-card animate-scale-in">
        <div className="login-header">
          <div className="login-logo">✨</div>
          <h1>Create Account</h1>
          <p>Join Agentvault — your evidence-first knowledge workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error animate-slide-down">
              <span>⚠</span> {error}
            </div>
          )}

          <div className="input-group">
            <label htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              type="text"
              className="input"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label htmlFor="signup-email">Email</label>
            <input
              id="signup-email"
              type="email"
              className="input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="signup-department">Department (Optional)</label>
            <input
              id="signup-department"
              type="text"
              className="input"
              placeholder="Engineering, Sales, etc."
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              autoComplete="organization-title"
            />
          </div>

          <div className="input-group">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              At least 8 characters
            </small>
          </div>

          <button type="submit" className="btn btn-primary btn-lg login-submit" disabled={loading}>
            {loading ? (
              <><span className="animate-spin" style={{ display: 'inline-block' }}>⏳</span> Creating account…</>
            ) : (
              'Create Account →'
            )}
          </button>
        </form>

        <div className="login-footer">
          <span>New account will have Employee role by default</span>
          <div style={{ marginTop: 10 }}>
            <a href="/login" style={{ fontSize: '0.875rem', color: 'var(--violet-400)' }}>
              Already have an account? Sign in →
            </a>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-bg);
          z-index: 2000;
          padding: 20px;
        }

        .login-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.3;
        }

        .login-orb-1 {
          width: 500px;
          height: 500px;
          background: var(--violet-700);
          top: -100px;
          right: -100px;
          animation: pulse 6s infinite;
        }

        .login-orb-2 {
          width: 400px;
          height: 400px;
          background: var(--cyan-500);
          bottom: -80px;
          left: -80px;
          animation: pulse 8s infinite 2s;
        }

        .login-orb-3 {
          width: 300px;
          height: 300px;
          background: var(--violet-500);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 7s infinite 1s;
        }

        .login-card {
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-xl);
          padding: 32px;
          width: 100%;
          max-width: 420px;
          box-shadow: var(--shadow-xl), var(--shadow-glow-lg);
          position: relative;
          z-index: 1;
        }

        .login-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .login-logo {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          background: var(--gradient-primary);
          border-radius: var(--radius-lg);
          box-shadow: 0 4px 20px rgba(86, 217, 181, 0.28);
        }

        .login-header h1 {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .login-header p {
          font-size: 0.875rem;
          color: var(--text-muted);
          max-width: 320px;
          margin: 0 auto;
          line-height: 1.4;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-error {
          background: rgba(244, 63, 94, 0.12);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          font-size: 0.8125rem;
          color: var(--rose-400);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .login-submit {
          width: 100%;
          justify-content: center;
          margin-top: 4px;
          font-size: 0.9375rem;
          height: 44px;
        }

        .login-footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid var(--border-glass);
        }

        .login-footer span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}
