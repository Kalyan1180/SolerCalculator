import { auth } from '@/firebase';

export async function authenticatedJsonRequest(url, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in before performing this action');

  const token = await user.getIdToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed with status ${response.status}`);
  return payload;
}
