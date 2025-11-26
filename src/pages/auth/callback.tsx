import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Processing login...');

  useEffect(() => {
    if (!supabase) {
      router.push('/auth/login');
      return;
    }

    const handleAuthCallback = async () => {
      try {
        // Check if there's a hash fragment with tokens (from magic link)
        const hash = window.location.hash;
        
        if (hash && hash.includes('access_token')) {
          setStatus('Verifying token...');
          
          // Let Supabase handle the hash automatically
          // It will detect and parse the tokens from the URL
          const { data, error: hashError } = await supabase.auth.getSession();
          
          if (hashError) {
            throw hashError;
          }
          
          if (data.session) {
            setStatus('Success! Redirecting...');
            // Clear the hash from URL for cleaner look
            window.history.replaceState(null, '', window.location.pathname);
            router.push('/');
            return;
          }
        }

        // If no hash, check existing session
        setStatus('Checking session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          setStatus('Already signed in! Redirecting...');
          router.push('/');
        } else {
          // No session, redirect to login
          setStatus('No session found. Redirecting to login...');
          setTimeout(() => router.push('/auth/login'), 1500);
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'An error occurred during sign in.');
        setTimeout(() => router.push('/auth/login?error=auth_failed'), 2000);
      }
    };

    // Small delay to ensure Supabase client is ready
    setTimeout(handleAuthCallback, 100);
  }, [router]);

  return (
    <div style={styles.container}>
      {error ? (
        <>
          <p style={styles.error}>❌ {error}</p>
          <p style={styles.text}>Redirecting to login...</p>
        </>
      ) : (
        <>
          <div style={styles.spinner}></div>
          <p style={styles.text}>{status}</p>
        </>
      )}
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
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '1rem',
  },
  text: {
    color: 'var(--accent)',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.7rem',
    textAlign: 'center',
  },
  error: {
    color: '#ff3bff',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.65rem',
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid var(--muted)',
    borderTop: '4px solid var(--accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};
