import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';

type User = { id: string; email?: string } | null;

interface AuthContextType {
  user: User;
  loading: boolean;
  token: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): React.ReactNode {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const initializeAuth = async () => {
      try {
        // First, check if there's a hash with tokens (from magic link redirect)
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          // Let Supabase process the URL hash automatically
          // The onAuthStateChange will pick up the new session
          console.log('Processing auth tokens from URL...');
        }

        // Get the current session (from localStorage or freshly established)
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          if (session) {
            console.log('Session found, user:', session.user.email);
            setUser(session.user);
            setToken(session.access_token);
          } else {
            console.log('No active session');
            setUser(null);
            setToken(null);
          }
          setLoading(false);
        }

        // Clean up hash from URL if present (for cleaner URLs)
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (mounted) {
          if (session) {
            setUser(session.user);
            setToken(session.access_token);
          } else {
            setUser(null);
            setToken(null);
          }
          setLoading(false);
        }
      }
    );

    // Initialize after a small delay to ensure client is ready
    initializeAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setToken(null);
    // Clear any stored auth data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('justwrite-auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
