import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import {
  hasAnyPermission,
  hasEveryPermission,
  hasPermission,
  normalizeRole,
  permissionsForRole,
  roleDescription,
  roleLabel
} from '@/constants/rbac';

const CACHE_TTL_MS = 30 * 1000;
const accessCache = new Map();

function buildAccess(uid, profile = {}) {
  const role = normalizeRole(profile.role);
  return Object.freeze({
    uid,
    role,
    roleLabel: roleLabel(role),
    roleDescription: roleDescription(role),
    permissions: Object.freeze(permissionsForRole(role)),
    profileExists: Boolean(profile.profileExists)
  });
}

export function customerAccess(uid = '') {
  return buildAccess(uid, { role: 'customer', profileExists: false });
}

export async function getUserAccess(uid, options = {}) {
  if (!uid) return customerAccess();

  const force = Boolean(options.force);
  const cached = accessCache.get(uid);
  if (!force && cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.access;

  const snapshot = await getDoc(doc(db, 'users', uid));
  const data = snapshot.exists() ? snapshot.data() : {};
  const access = buildAccess(uid, {
    ...data,
    profileExists: snapshot.exists()
  });
  accessCache.set(uid, { access, cachedAt: Date.now() });
  return access;
}

export function clearUserAccessCache(uid) {
  if (uid) accessCache.delete(uid);
  else accessCache.clear();
}

export { hasPermission, hasEveryPermission, hasAnyPermission };
