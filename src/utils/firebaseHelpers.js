// src/utils/firebaseHelpers.js
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';

const DEFAULT_ROLE = 'customer';

/**
 * Ensure a signed-in user has a Firestore profile.
 * The browser is never allowed to choose an elevated role.
 */
export async function createUserWithRole(user) {
  if (!user?.uid) throw new Error('A signed-in user is required');

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) return { created: false, role: userSnap.data().role || null };

  await setDoc(userRef, {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    role: DEFAULT_ROLE,
    createdAt: serverTimestamp()
  });
  return { created: true, role: DEFAULT_ROLE };
}

export async function getUserRole(uid) {
  if (!uid) return null;
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    return userSnap.exists() ? userSnap.data().role || null : null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}
