// src/utils/apiClient.js
import { auth } from '@/firebase';

function getErrorMessage(payload, fallback) {
  if (payload && typeof payload === 'object' && payload.error) {
    return payload.error;
  }
  return fallback;
}

/**
 * Call a protected Netlify function with the signed-in user's Firebase ID token.
 */
export async function authorizedFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in to continue.');
  }

  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  if (contentType.includes('application/json')) {
    payload = await response.json();
  } else {
    const text = await response.text();
    payload = text ? { message: text } : null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Request failed with status ${response.status}.`));
  }

  return payload;
}
