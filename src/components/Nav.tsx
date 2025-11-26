import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { useState, useEffect } from 'react';

export function Nav() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/login');
  };

  const isActive = (path: string) => router.pathname === path;

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [router.pathname]);

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <Link href="/" style={styles.logo}>
          <span style={styles.logoIcon}>▶</span>
          <span>JW</span>
        </Link>

        {/* Desktop Nav */}
        <div style={styles.desktopNav}>
          <Link 
            href="/" 
            style={{...styles.navLink, ...(isActive('/') ? styles.navLinkActive : {})}}
          >
            Journal
          </Link>
          <Link 
            href="/tasks" 
            style={{...styles.navLink, ...(isActive('/tasks') ? styles.navLinkActive : {})}}
          >
            Tasks
          </Link>
          <Link 
            href="/brainstorm" 
            style={{...styles.navLink, ...(isActive('/brainstorm') ? styles.navLinkActive : {})}}
          >
            Ideas
          </Link>
        </div>

        {/* User / Auth */}
        <div style={styles.rightSection}>
          {user ? (
            <div style={styles.userArea}>
              <span style={styles.userName}>{user.email?.split('@')[0]}</span>
              <button onClick={handleLogout} style={styles.logoutBtn} aria-label="Sign out">
                ×
              </button>
            </div>
          ) : mounted && (
            <Link href="/auth/login" style={styles.signInLink}>
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          style={styles.menuBtn} 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span style={{
            ...styles.menuIcon,
            transform: menuOpen ? 'rotate(45deg)' : 'none',
          }}>
            {menuOpen ? '+' : '≡'}
          </span>
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div style={styles.mobileMenu}>
          <Link href="/" style={{...styles.mobileLink, ...(isActive('/') ? styles.mobileLinkActive : {})}}>
            Journal
          </Link>
          <Link href="/tasks" style={{...styles.mobileLink, ...(isActive('/tasks') ? styles.mobileLinkActive : {})}}>
            Tasks
          </Link>
          <Link href="/brainstorm" style={{...styles.mobileLink, ...(isActive('/brainstorm') ? styles.mobileLinkActive : {})}}>
            Ideas
          </Link>
          <div style={styles.mobileDivider} />
          {user ? (
            <button onClick={handleLogout} style={styles.mobileLogout}>
              Sign out
            </button>
          ) : (
            <Link href="/auth/login" style={styles.mobileLink}>
              Sign in
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '8px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  inner: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
  },
  logoIcon: {
    fontSize: '8px',
    opacity: 0.7,
  },
  desktopNav: {
    display: 'none',
    gap: '0.25rem',
  },
  navLink: {
    color: 'var(--fg-dim)',
    textDecoration: 'none',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
    letterSpacing: '0.05em',
  },
  navLinkActive: {
    color: 'var(--accent)',
    background: 'var(--accent-glow)',
  },
  rightSection: {
    display: 'none',
    alignItems: 'center',
    gap: '0.75rem',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  userName: {
    color: 'var(--muted)',
    fontSize: '7px',
    maxWidth: '80px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'transparent',
    color: 'var(--accent-2)',
    border: '1px solid var(--accent-2)',
    width: '24px',
    height: '24px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  signInLink: {
    color: 'var(--accent)',
    textDecoration: 'none',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--accent)',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  },
  menuBtn: {
    display: 'flex',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--fg-dim)',
    width: '36px',
    height: '36px',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  },
  menuIcon: {
    fontSize: '16px',
    lineHeight: 1,
    transition: 'transform 0.2s ease',
  },
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.5rem 1rem 1rem',
    borderTop: '1px solid var(--border)',
    animation: 'slideUp 0.2s ease-out',
  },
  mobileLink: {
    color: 'var(--fg-dim)',
    textDecoration: 'none',
    padding: '0.875rem 0.5rem',
    borderBottom: '1px solid var(--border)',
    transition: 'color 0.15s ease',
  },
  mobileLinkActive: {
    color: 'var(--accent)',
  },
  mobileDivider: {
    height: '1px',
    margin: '0.5rem 0',
  },
  mobileLogout: {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent-2)',
    padding: '0.875rem 0.5rem',
    fontFamily: '"Press Start 2P", monospace',
    fontSize: '8px',
    cursor: 'pointer',
    textAlign: 'left',
  },
};

// Desktop responsive styles
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media (min-width: 640px) {
      nav > div > div:nth-child(2) { display: flex !important; }
      nav > div > div:nth-child(3) { display: flex !important; }
      nav > div > button:last-child { display: none !important; }
    }
  `;
  if (!document.getElementById('nav-responsive-v2')) {
    style.id = 'nav-responsive-v2';
    document.head.appendChild(style);
  }
}
