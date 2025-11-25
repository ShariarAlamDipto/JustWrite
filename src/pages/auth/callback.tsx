import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      router.push('/auth/login');
      return;
    }

    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash (Supabase auto-parses this)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setError(sessionError.message);
          setTimeout(() => router.push('/auth/login?error=auth_failed'), 2000);
          return;
        }

        if (session) {
          // Session is established, redirect to home
          router.push('/');
        } else {
          // No session found, check if we just received the token in the hash
          // Wait a moment for Supabase to process the hash
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: { session: newSession }, error: retryError } = await supabase.auth.getSession();
          
          if (retryError || !newSession) {
            console.error('Failed to establish session:', retryError);
            setError('Failed to sign in. Please try again.');
            setTimeout(() => router.push('/auth/login?error=auth_failed'), 2000);
          } else {
            router.push('/');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An error occurred during sign in.');
        setTimeout(() => router.push('/auth/login?error=auth_failed'), 2000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div style={styles.container}>
      {error ? (
        <>
          <p style={styles.error}>❌ {error}</p>
          <p style={styles.text}>Redirecting to login...</p>
        </>
      ) : (
        <p style={styles.text}>Signing you in...</p>
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
    gap: '1rem',
  },
  text: {
    color: 'var(--fg)',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '1rem',
  },
  error: {
    color: '#ff3bff',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.75rem',
  },
};
