import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      console.log('Already logged in, redirecting to home...');
      router.replace('/');
    }
  }, [user, authLoading, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div style={styles.container}>
        <div className="jw-receipt" style={styles.card}>
          <p style={{ color: 'var(--fg-dim)', textAlign: 'center' }}>Checking session…</p>
        </div>
      </div>
    );
  }

  // Already logged in, show redirect message
  if (user) {
    return (
      <div style={styles.container}>
        <div className="jw-receipt" style={styles.card}>
          <p style={{ color: 'var(--fg-dim)', textAlign: 'center' }}>Already signed in — redirecting…</p>
        </div>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!supabase) {
      setError('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars.');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email');
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (err) {
      setError(`Sign in failed: ${err.message}`);
    } else {
      setMessage(`✓ Check ${email} for a magic link to sign in!`);
      setEmail('');
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setError('Supabase not configured.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) {
      setError(`Google sign-in failed: ${err.message}`);
      setLoading(false);
    }
    // On success the browser redirects to Google — no further action needed here
  };

  return (
    <div style={styles.container}>
      <div className="jw-receipt" style={styles.card}>
        <div className="jw-receipt-head">
          <span className="jw-receipt-label">JustWrite</span>
          <span className="jw-receipt-meta">Sign in</span>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>No password needed — pick a way in.</p>

        <button
          type="button"
          style={styles.googleButton}
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: '10px', flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.1 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.5-4.1 7.1-10.2 7.1-17.1z"/>
            <path fill="#FBBC05" d="M10.6 28.6A14.9 14.9 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8-6.1z"/>
            <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.7 2.2-7.6 2.2-6.2 0-11.5-4.2-13.4-9.8l-8 6.1C6.6 42.6 14.6 48 24 48z"/>
          </svg>
          {loading ? 'Redirecting...' : 'Continue with Google'}
        </button>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or</span>
        </div>

        <form onSubmit={handleSignIn} style={styles.form}>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            disabled={loading}
            autoFocus
          />
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}
        {message && <p style={styles.success}>{message}</p>}

        <div style={styles.footerRule} />
        <p style={styles.hint}>
          A magic link signs you in straight from your inbox — nothing to remember.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--fg)',
    padding: '1.5rem',
  },
  card: {
    maxWidth: '420px',
    width: '100%',
  },
  title: {
    fontSize: '26px',
    fontWeight: 600,
    marginBottom: '0.35rem',
    color: 'var(--fg)',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: '15px',
    marginBottom: '1.5rem',
    color: 'var(--fg-dim)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  input: {
    width: '100%',
  },
  button: {
    background: 'var(--accent-warm)',
    color: '#1a1206',
    border: 'none',
    padding: '0.875rem',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'inherit',
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    minHeight: '46px',
    transition: 'all 0.15s ease',
  },
  error: {
    color: 'var(--danger)',
    fontSize: '14px',
    marginTop: '1rem',
  },
  success: {
    color: 'var(--success)',
    fontSize: '14px',
    marginTop: '1rem',
  },
  footerRule: {
    borderTop: '1.5px dashed var(--border)',
    marginTop: '1.75rem',
    paddingTop: '0.25rem',
  },
  hint: {
    fontSize: '13px',
    color: 'var(--muted)',
    marginTop: '0.75rem',
    lineHeight: 1.6,
  },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0.875rem',
    background: 'transparent',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontFamily: 'inherit',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: '46px',
    transition: 'all 0.15s ease',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.25rem 0',
    gap: '0.75rem',
  },
  dividerText: {
    color: 'var(--muted)',
    fontSize: '12px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    flex: 1,
    textAlign: 'center',
  },
};
