import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function SignupCard({ session, defaultMode = 'signup' }) {
  const [mode,        setMode]        = useState(defaultMode); // 'signup' | 'login' | 'reset'
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [resetSent,   setResetSent]   = useState(false);
  const [signupDone,  setSignupDone]  = useState(false);

  const switchMode = (m) => { setMode(m); setError(''); setPassword(''); };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(error.message);
  };

  const handleSignOut = async () => supabase.auth.signOut();

  // ── sign up ────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setError(''); setLoading(true);
    const { error } = await supabase.auth.signUp({ email: v, password });
    setLoading(false);
    if (error) return setError(error.message);
    setSignupDone(true);
  };

  // ── log in ─────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!v) return setError('Please enter your email.');
    if (!password) return setError('Please enter your password.');
    setError(''); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: v, password });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes('invalid')) {
        return setError('Wrong email or password. Try again, or use "Forgot password?" below.');
      }
      return setError(error.message);
    }
  };

  // ── forgot password ────────────────────────────────────
  const handleReset = async (e) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError('Please enter your email first.');
    setError(''); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(v);
    setLoading(false);
    if (error) return setError(error.message);
    setResetSent(true);
  };

  // ── logged in ──────────────────────────────────────────
  if (session) {
    return (
      <div id="signup" className="signup">
        <span className="signup-kicker">YOU'RE IN</span>
        <h2 className="signup-done-title">Welcome to the swap.</h2>
        <p className="signup-done-msg">Logged in as {session.user.email}</p>
        <button type="button" className="link-btn" onClick={handleSignOut}>Sign out</button>
      </div>
    );
  }

  // ── sign up success (email confirmation pending) ───────
  if (signupDone) {
    return (
      <div id="signup" className="signup">
        <span className="signup-kicker">ALMOST THERE</span>
        <h2 className="signup-done-title">Check your email</h2>
        <p className="signup-done-msg">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to log in.
        </p>
        <button type="button" className="link-btn" onClick={() => { setSignupDone(false); switchMode('login'); }}>
          Go to log in
        </button>
      </div>
    );
  }

  // ── password reset sent ────────────────────────────────
  if (resetSent) {
    return (
      <div id="signup" className="signup">
        <span className="signup-kicker">CHECK YOUR EMAIL</span>
        <h2 className="signup-done-title">Reset link sent</h2>
        <p className="signup-done-msg">
          We sent a password reset link to <strong>{email}</strong>. Click it to set a new password, then log in here.
        </p>
        <button type="button" className="link-btn" onClick={() => { setResetSent(false); switchMode('login'); }}>
          Back to log in
        </button>
      </div>
    );
  }

  const isLogin  = mode === 'login';
  const isSignup = mode === 'signup';
  const isReset  = mode === 'reset';

  return (
    <div id="signup" className="signup">

      {/* Tab toggle */}
      {!isReset && (
        <div className="auth-tabs">
          <button type="button" className={`auth-tab${isSignup ? ' auth-tab--active' : ''}`} onClick={() => switchMode('signup')}>
            Sign up
          </button>
          <button type="button" className={`auth-tab${isLogin ? ' auth-tab--active' : ''}`} onClick={() => switchMode('login')}>
            Log in
          </button>
        </div>
      )}

      {isSignup && (
        <>
          <h2 className="signup-title">Join the swap</h2>
          <p className="signup-sub">Free for every student at CIUP Paris. Takes 30 seconds.</p>
          <form className="signup-form" onSubmit={handleSignup} noValidate>
            <label htmlFor="su-email" className="field-label">EMAIL ADDRESS</label>
            <input id="su-email" className={`field${error ? ' has-error' : ''}`} type="email"
              placeholder="you@university.edu" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }} />

            <label htmlFor="su-pw" className="field-label">PASSWORD</label>
            <div className="pw-wrap">
              <input id="su-pw" className={`field${error ? ' has-error' : ''}`}
                type={showPw ? 'text' : 'password'} placeholder="At least 8 characters"
                value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
                <EyeIcon open={showPw} />
              </button>
            </div>

            {error && <span className="field-error">{error}</span>}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Creating account…' : 'Create free account'}
            </button>
          </form>
        </>
      )}

      {isLogin && (
        <>
          <h2 className="signup-title">Welcome back</h2>
          <p className="signup-sub">Log in with your email and password.</p>
          <form className="signup-form" onSubmit={handleLogin} noValidate>
            <label htmlFor="li-email" className="field-label">EMAIL ADDRESS</label>
            <input id="li-email" className={`field${error ? ' has-error' : ''}`} type="email"
              placeholder="your@email.com" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }} />

            <label htmlFor="li-pw" className="field-label">PASSWORD</label>
            <div className="pw-wrap">
              <input id="li-pw" className={`field${error ? ' has-error' : ''}`}
                type={showPw ? 'text' : 'password'} placeholder="Your password"
                value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password">
                <EyeIcon open={showPw} />
              </button>
            </div>

            {error && <span className="field-error">{error}</span>}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
          <button type="button" className="link-btn forgot-link" onClick={() => switchMode('reset')}>
            Forgot password?
          </button>
        </>
      )}

      {isReset && (
        <>
          <h2 className="signup-title">Reset password</h2>
          <p className="signup-sub">Enter your email and we'll send you a reset link.</p>
          <form className="signup-form" onSubmit={handleReset} noValidate>
            <label htmlFor="rs-email" className="field-label">EMAIL ADDRESS</label>
            <input id="rs-email" className={`field${error ? ' has-error' : ''}`} type="email"
              placeholder="your@email.com" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }} />
            {error && <span className="field-error">{error}</span>}
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
          <button type="button" className="link-btn forgot-link" onClick={() => switchMode('login')}>
            ← Back to log in
          </button>
        </>
      )}

      {!isReset && (
        <>
          <div className="divider"><span />OR<span /></div>
          <button type="button" className="google-btn" onClick={handleGoogle}>
            <span className="google-g">G</span>
            {isLogin ? 'Log in with Google' : 'Continue with Google'}
          </button>
        </>
      )}

      {isSignup && <p className="legal">By signing up you agree to our terms and privacy policy.</p>}
      {isLogin  && (
        <p className="legal">
          New here?{' '}
          <button type="button" className="link-btn" style={{ fontSize: 'inherit' }} onClick={() => switchMode('signup')}>
            Create a free account.
          </button>
        </p>
      )}
    </div>
  );
}
