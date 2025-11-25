import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>JustWrite</h1>
        <p style={styles.subtitle}>Sign in to continue</p>

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

        <p style={styles.hint}>
          No password needed — we'll email you a magic link to sign in instantly.
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
    fontFamily: '"Press Start 2P", monospace',
    padding: '1rem',
  },
  card: {
    background: 'var(--card)',
    border: '3px solid var(--accent)',
    padding: '2rem',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 0 20px rgba(0, 255, 213, 0.5)',
  },
  title: {
    fontSize: '1.5rem',
    marginBottom: '0.5rem',
    color: 'var(--accent)',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '0.75rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
    color: 'var(--muted)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    background: 'var(--bg)',
    color: 'var(--fg)',
    border: '2px solid var(--accent)',
    padding: '0.75rem',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
  },
  button: {
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: 'none',
    padding: '0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.65rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  error: {
    color: '#ff3bff',
    fontSize: '0.75rem',
    marginTop: '1rem',
    textAlign: 'center',
  },
  success: {
    color: 'var(--accent)',
    fontSize: '0.75rem',
    marginTop: '1rem',
    textAlign: 'center',
  },
  hint: {
    fontSize: '0.65rem',
    color: 'var(--muted)',
    marginTop: '1.5rem',
    lineHeight: '1.5',
  },
};
