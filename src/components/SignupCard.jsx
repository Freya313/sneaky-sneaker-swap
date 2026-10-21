import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

export default function SignupCard({ session }) {
  const [emailValue, setEmailValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const v = emailValue.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return setError('Please enter a valid email address.');
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email: v });
    setLoading(false);
    if (error) return setError(error.message);
    setSent(true);
  };

  const handleGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setError(error.message);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (session) {
    return (
      <div id="signup" className="signup">
        <span className="signup-kicker">YOU'RE IN</span>
        <h2 className="signup-done-title">Welcome to the swap.</h2>
        <p className="signup-done-msg">Logged in as {session.user.email}</p>
        <button type="button" className="link-btn" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    );
  }

  if (sent) {
    return (
      <div id="signup" className="signup">
        <span className="signup-kicker">CHECK YOUR EMAIL</span>
        <h2 className="signup-done-title">Magic link sent!</h2>
        <p className="signup-done-msg">We sent a login link to {emailValue}. Click it to sign in.</p>
        <button type="button" className="link-btn" onClick={() => setSent(false)}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div id="signup" className="signup">
      <h2 className="signup-title">Sign up to sell or buy your favourite sneakers</h2>
      <p className="signup-sub">Free for every student. Takes 30 seconds.</p>

      <form className="signup-form" onSubmit={handleEmailSubmit} noValidate>
        <label htmlFor="signup-input" className="field-label">EMAIL ADDRESS</label>
        <input
          id="signup-input"
          className={`field ${error ? 'has-error' : ''}`}
          type="email"
          placeholder="you@university.edu"
          value={emailValue}
          onChange={(e) => { setEmailValue(e.target.value); setError(''); }}
        />
        {error && <span className="field-error">{error}</span>}
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? 'Sending…' : 'Create free account'}
        </button>
      </form>

      <div className="divider"><span />OR<span /></div>

      <button type="button" className="google-btn" onClick={handleGoogle}>
        <span className="google-g">G</span>
        Continue with Google
      </button>

      <p className="legal">By signing up you agree to our terms and privacy policy.</p>
    </div>
  );
}
