import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { useState } from 'react';

export function Nav() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <nav style={styles.nav}>
      <div style={styles.header}>
        <Link href="/" style={styles.logo}>
          JW
        </Link>
        <button 
          style={styles.menuBtn} 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
      
      <div style={{
        ...styles.links,
        ...(menuOpen ? styles.linksOpen : {}),
      }}>
        <Link 
          href="/" 
          style={{...styles.link, ...(isActive('/') ? styles.activeLink : {})}}
          onClick={() => setMenuOpen(false)}
        >
          📝 Journal
        </Link>
        <Link 
          href="/tasks" 
          style={{...styles.link, ...(isActive('/tasks') ? styles.activeLink : {})}}
          onClick={() => setMenuOpen(false)}
        >
          ✓ Tasks
        </Link>
        <Link 
          href="/brainstorm" 
          style={{...styles.link, ...(isActive('/brainstorm') ? styles.activeLink : {})}}
          onClick={() => setMenuOpen(false)}
        >
          💡 Brainstorm
        </Link>
        
        <div style={styles.userSection}>
          {user ? (
            <>
              <span style={styles.userEmail}>{user.email?.split('@')[0] || 'User'}</span>
              <button onClick={handleLogout} style={styles.logoutBtn}>
                Logout
              </button>
            </>
          ) : (
            <Link href="/auth/login" style={styles.link} onClick={() => setMenuOpen(false)}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    background: 'var(--card)',
    border: '2px solid var(--accent)',
    padding: '0.5rem',
    marginBottom: '0.75rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.55rem',
    color: 'var(--fg)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    color: 'var(--accent)',
    fontSize: '0.8rem',
    fontWeight: 700,
    textDecoration: 'none',
    padding: '0.5rem',
  },
  menuBtn: {
    display: 'block',
    background: 'transparent',
    border: '2px solid var(--accent)',
    color: 'var(--accent)',
    padding: '0.5rem 0.75rem',
    fontSize: '1rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  links: {
    display: 'none',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    paddingTop: '0.75rem',
    marginTop: '0.5rem',
    borderTop: '1px solid var(--muted)',
  },
  linksOpen: {
    display: 'flex',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
    padding: '0.75rem',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'block',
    textAlign: 'center' as const,
  },
  activeLink: {
    background: 'rgba(0, 255, 213, 0.1)',
    borderColor: 'var(--accent)',
  },
  userSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    alignItems: 'center',
    paddingTop: '0.5rem',
    borderTop: '1px solid var(--muted)',
    marginTop: '0.5rem',
  },
  userEmail: {
    color: 'var(--muted)',
    fontSize: '0.5rem',
  },
  logoutBtn: {
    background: '#ff3bff',
    color: 'var(--bg)',
    border: 'none',
    padding: '0.6rem 1rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '0.5rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: '100%',
  },
};

// Add desktop styles via CSS-in-JS media query workaround
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media (min-width: 768px) {
      nav > div:first-child button { display: none !important; }
      nav > div:last-child { 
        display: flex !important; 
        flex-direction: row !important; 
        align-items: center !important;
        border-top: none !important;
        padding-top: 0 !important;
        margin-top: 0 !important;
        justify-content: center;
        gap: 0.5rem !important;
      }
      nav > div:last-child > div {
        flex-direction: row !important;
        border-top: none !important;
        padding-top: 0 !important;
        margin-top: 0 !important;
        margin-left: auto;
      }
      nav > div:last-child > div button {
        width: auto !important;
      }
      nav { 
        display: flex !important;
        justify-content: space-between;
        align-items: center;
      }
    }
  `;
  if (!document.getElementById('nav-responsive-styles')) {
    style.id = 'nav-responsive-styles';
    document.head.appendChild(style);
  }
}
