import { auth } from '@/firebase';
import { endSession, getFreshIdToken } from '@/utils/sessionManager';

const TERMINAL_SESSION_CODES = new Set([
  'SESSION_REVOKED',
  'REAUTHENTICATION_REQUIRED',
  'SESSION_EXPIRED'
]);

async function executeRequest(url, options, forceRefresh) {
  const token = await getFreshIdToken(forceRefresh);
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    },
    cache: 'no-store'
  });
}

async function responsePayload(response) {
  return response.json().catch(() => ({}));
}

async function terminateRejectedSession(payload) {
  const reason = payload.code || 'server-session-rejected';
  await endSession(reason, { redirectToLogin: true });
  const error = new Error(payload.error || 'Your session is no longer valid. Please sign in again.');
  error.code = reason;
  error.status = 401;
  throw error;
}

export async function authenticatedJsonRequest(url, options = {}) {
  if (!auth.currentUser) throw new Error('Please sign in before performing this action');

  let response = await executeRequest(url, options, false);
  let payload = await responsePayload(response);

  if (response.status === 401) {
    if (TERMINAL_SESSION_CODES.has(payload.code)) await terminateRejectedSession(payload);

    // A one-time retry handles an ID token that expired between retrieval and
    // server verification. A 401 response means the protected action did not run.
    response = await executeRequest(url, options, true);
    payload = await responsePayload(response);
    if (response.status === 401) await terminateRejectedSession(payload);
  }

  if (!response.ok) {
    const error = new Error(payload.error || `Request failed with status ${response.status}`);
    error.code = payload.code || 'REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }

  return payload;
}
