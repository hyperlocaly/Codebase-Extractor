import { setAuthTokenGetter } from '@workspace/api-client-react';
import { MARKETPLACE_SLUG, TOKEN_STORAGE_KEY } from '@/lib/constants';

setAuthTokenGetter(() => localStorage.getItem(TOKEN_STORAGE_KEY));

const _originalFetch = window.fetch.bind(window);

window.fetch = function patchedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;

  if (url.includes('/api/')) {
    const headers = new Headers(init?.headers);
    if (!headers.has('X-Marketplace-Slug')) {
      headers.set('X-Marketplace-Slug', MARKETPLACE_SLUG);
    }
    return _originalFetch(input, { ...init, headers });
  }

  return _originalFetch(input, init);
};

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function saveAuthToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}
