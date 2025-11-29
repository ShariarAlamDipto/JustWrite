import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/useAuth';
import { useTheme } from '@/lib/ThemeContext';
import { useState, useEffect } from 'react';

export function Nav() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
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
          <span style={styles.logoText}>JustWrite</span>
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
            href="/locked" 
            style={{...styles.navLink, ...(isActive('/locked') ? styles.navLinkActive : {})}}
          >
            Private
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
          <Link 
            href="/prompts" 
            style={{...styles.navLink, ...(isActive('/prompts') ? styles.navLinkActive : {})}}
          >
            Prompts
          </Link>
          <Link 
            href="/insights" 
            style={{...styles.navLink, ...(isActive('/insights') ? styles.navLinkActive : {})}}
          >
            Insights
          </Link>
        </div>

        {/* User / Auth / Theme */}
        <div style={styles.rightSection}>
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme} 
            className="theme-toggle"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? '◐' : '◑'}
          </button>

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
          <Link href="/locked" style={{...styles.mobileLink, ...(isActive('/locked') ? styles.mobileLinkActive : {})}}>
            Private
          </Link>
          <Link href="/tasks" style={{...styles.mobileLink, ...(isActive('/tasks') ? styles.mobileLinkActive : {})}}>
            Tasks
          </Link>
          <Link href="/brainstorm" style={{...styles.mobileLink, ...(isActive('/brainstorm') ? styles.mobileLinkActive : {})}}>
            Ideas
          </Link>
          <Link href="/prompts" style={{...styles.mobileLink, ...(isActive('/prompts') ? styles.mobileLinkActive : {})}}>
            Prompts
          </Link>
          <Link href="/insights" style={{...styles.mobileLink, ...(isActive('/insights') ? styles.mobileLinkActive : {})}}>
            Insights
          </Link>
          <div style={styles.mobileDivider} />
          <button onClick={toggleTheme} style={styles.mobileLink}>
            {isDark ? 'Light Mode' : 'Dark Mode'}
          </button>
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
    fontFamily: 'inherit',
    fontSize: '14px',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
  },
  inner: {
    maxWidth: '800px',
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
    color: 'var(--fg)',
    textDecoration: 'none',
  },
  logoText: {
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  desktopNav: {
    display: 'none',
    gap: '0.25rem',
  },
  navLink: {
    color: 'var(--muted)',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.15s ease',
    fontWeight: 500,
    fontSize: '14px',
  },
  navLinkActive: {
    color: 'var(--fg)',
    background: 'var(--bg-card)',
    fontWeight: 600,
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
    color: 'var(--fg-dim)',
    fontSize: '13px',
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  logoutBtn: {
    background: 'transparent',
    color: 'var(--muted)',
    border: '1px solid var(--border)',
    width: '26px',
    height: '26px',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    padding: 0,
    transition: 'all 0.15s ease',
  },
  signInLink: {
    color: 'var(--accent-bright)',
    textDecoration: 'none',
    padding: '0.375rem 0.75rem',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.15s ease',
    fontWeight: 500,
    fontSize: '13px',
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
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.15s ease',
  },
  menuIcon: {
    fontSize: '18px',
    lineHeight: 1,
    transition: 'transform 0.2s ease',
  },
  mobileMenu: {
    display: 'flex',
    flexDirection: 'column',
    padding: '0.5rem 1rem 1rem',
    borderTop: '1px solid var(--border)',
    animation: 'slideUp 0.15s ease-out',
  },
  mobileLink: {
    color: 'var(--fg-dim)',
    textDecoration: 'none',
    padding: '0.875rem 0.5rem',
    borderBottom: '1px solid var(--border)',
    transition: 'color 0.15s ease',
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '15px',
  },
  mobileLinkActive: {
    color: 'var(--fg)',
    fontWeight: 600,
  },
  mobileDivider: {
    height: '1px',
    margin: '0.25rem 0',
  },
  mobileLogout: {
    background: 'transparent',
    border: 'none',
    color: 'var(--danger)',
    padding: '0.875rem 0.5rem',
    fontFamily: 'inherit',
    fontSize: '15px',
    cursor: 'pointer',
    textAlign: 'left',
    fontWeight: 500,
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
