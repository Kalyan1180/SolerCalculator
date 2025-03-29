// src/utils/firebaseHelpers.js
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

export async function createUserWithRole(user, role = 'user') {
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      role: role
    });
    console.log("User role set successfully!");
  } catch (error) {
    console.error("Error setting user role:", error);
  }
}

export async function getUserRole(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data().role;
    } else {
      console.error("No user role found for", uid);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}
