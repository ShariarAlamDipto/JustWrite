import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './useAuth';

export function ProtectedPage({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--fg)', fontFamily: '"Press Start 2P", monospace' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push(`/auth/login?redirect=${encodeURIComponent(router.pathname)}`);
    return null;
  }

  return <>{children}</>;
}
