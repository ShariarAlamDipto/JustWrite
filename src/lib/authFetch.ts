import { supabase } from './supabase';

/**
 * Fetch wrapper that always sends a live Supabase access token.
 *
 * Access tokens in this project expire after 60 minutes. Reading the token from
 * React state (the `token` returned by useAuth) means a tab left open past that
 * window sends a dead token and the API answers 401 "Invalid or expired token".
 * `getSession()` refreshes a stale token before returning it, so the token is
 * resolved per-request rather than per-render. The 401 retry covers the case
 * where the token expired between resolution and the server verifying it.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const request = async (token: string | null) =>
    fetch(input, {
      ...init,
      headers: {
        ...(init.headers as Record<string, string> | undefined),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  if (!supabase) {
    return request(null);
  }

  const { data: { session } } = await supabase.auth.getSession();
  const response = await request(session?.access_token ?? null);

  if (response.status !== 401) {
    return response;
  }

  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  if (!refreshed?.access_token) {
    return response;
  }

  return request(refreshed.access_token);
}
