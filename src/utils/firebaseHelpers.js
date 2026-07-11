// src/utils/firebaseHelpers.js
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';

const DEFAULT_ROLE = 'user';

export async function createUserWithRole(user, role = DEFAULT_ROLE) {
  if (!user?.uid) throw new Error('A valid authenticated user is required.');

  const safeRole = role === DEFAULT_ROLE ? DEFAULT_ROLE : DEFAULT_ROLE;
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role: safeRole,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  return { success: true };
}

export async function getUserRole(uid) {
  if (!uid) return null;

  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    return userSnap.exists() ? (userSnap.data().role || DEFAULT_ROLE) : null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}
