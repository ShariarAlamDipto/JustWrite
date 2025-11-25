import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';

export function Nav() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.left}>
        <Link href="/" style={styles.link}>
          📝 Journal
        </Link>
        <Link href="/entry" style={styles.link}>
          ✍️ New Entry
        </Link>
        <Link href="/tasks" style={styles.link}>
          ✓ Tasks
        </Link>
        <Link href="/brainstorm" style={styles.link}>
          💡 Brainstorm
        </Link>
      </div>
      <div style={styles.right}>
        {user ? (
          <>
            <span style={styles.userEmail}>{user.email || 'User'}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </>
        ) : (
          <Link href="/auth/login" style={styles.link}>
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--card)',
    border: '2px solid var(--accent)',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.65rem',
    color: 'var(--fg)',
  },
  left: {
    display: 'flex',
    gap: '1rem',
  },
  right: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--accent)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  userEmail: {
    color: 'var(--muted)',
    fontSize: '0.55rem',
  },
  logoutBtn: {
    background: '#ff3bff',
    color: 'var(--bg)',
    border: 'none',
    padding: '0.5rem 0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.55rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};
