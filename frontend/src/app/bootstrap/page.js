'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

export default function BootstrapPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('Setup is already complete. Sign in with the existing administrator account, then use People & access to create another account. If you have lost access, recover the existing administrator through Supabase first.');
        }
        throw new Error(data?.detail || 'Bootstrap failed');
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
      </div>

      <div className="login-card animate-scale-in">
        <div className="login-header">
          <div className="login-logo">⚡</div>
          <h1>Agentvault setup</h1>
          <p>Create the first admin account to get started</p>
        </div>

        {success ? (
          <div className="animate-slide-up" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 8, color: 'var(--emerald-400)' }}>Admin Account Created!</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
              You can now sign in with your credentials.
            </p>
            <Link href="/login" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
              Go to Login →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error animate-slide-down">
                <span>⚠</span> {error}
              </div>
            )}

            <div className="input-group">
              <label htmlFor="boot-name">Full Name</label>
              <input
                id="boot-name"
                type="text"
                className="input"
                placeholder="Admin User"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label htmlFor="boot-email">Email</label>
              <input
                id="boot-email"
                type="email"
                className="input"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label htmlFor="boot-password">Password</label>
              <input
                id="boot-password"
                type="password"
                className="input"
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg login-submit" disabled={loading}>
              {loading ? '⏳ Creating…' : '🚀 Create Admin Account'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Link href="/login" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        )}

        <div className="login-footer">
          <span>This page only works before the first user is created</span>
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
        .login-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
        .login-orb { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.3; }
        .login-orb-1 { width: 500px; height: 500px; background: var(--violet-700); top: -100px; right: -100px; animation: pulse 6s infinite; }
        .login-orb-2 { width: 400px; height: 400px; background: var(--cyan-500); bottom: -80px; left: -80px; animation: pulse 8s infinite 2s; }
        .login-orb-3 { width: 300px; height: 300px; background: var(--violet-500); top: 50%; left: 50%; transform: translate(-50%, -50%); animation: pulse 7s infinite 1s; }
        .login-card {
          background: rgba(17, 24, 39, 0.7); backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
          border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: 40px;
          width: 100%; max-width: 420px; box-shadow: var(--shadow-xl), var(--shadow-glow-lg); position: relative; z-index: 1;
        }
        .login-header { text-align: center; margin-bottom: 32px; }
        .login-logo { width: 56px; height: 56px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; background: var(--gradient-primary); border-radius: var(--radius-lg); box-shadow: 0 4px 20px rgba(86, 217, 181, 0.28); }
        .login-header h1 { font-size: 1.5rem; font-weight: 800; letter-spacing: 0.1em; background: var(--gradient-accent); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 4px; }
        .login-header p { font-size: 0.8rem; color: var(--text-muted); }
        .login-form { display: flex; flex-direction: column; gap: 18px; }
        .login-error { background: rgba(244, 63, 94, 0.12); border: 1px solid rgba(244, 63, 94, 0.3); border-radius: var(--radius-md); padding: 10px 14px; font-size: 0.8125rem; color: var(--rose-400); display: flex; align-items: center; gap: 8px; }
        .login-submit { width: 100%; justify-content: center; margin-top: 4px; font-size: 0.95rem; padding: 14px; }
        .login-footer { text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-glass); }
        .login-footer span { font-size: 0.7rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
}
