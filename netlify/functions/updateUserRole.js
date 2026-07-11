// Admin-only user role update endpoint.
const {
  admin,
  HttpError,
  getAuth,
  getDb,
  json,
  parseJsonBody,
  requireUser,
  toPublicError
} = require('../lib/firebaseAdmin');

const ALLOWED_ROLES = new Set(['user', 'admin']);

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'PUT') {
    return json(405, { error: 'Method not allowed.' }, { Allow: 'PUT' });
  }

  try {
    const currentUser = await requireUser(event, { roles: ['admin'] });
    const request = parseJsonBody(event, 10000);
    const uid = typeof request.uid === 'string' ? request.uid.trim() : '';
    const role = typeof request.role === 'string' ? request.role.trim() : '';

    if (!uid || uid.length > 128) throw new HttpError(400, 'A valid user UID is required.');
    if (!ALLOWED_ROLES.has(role)) throw new HttpError(400, 'Role must be user or admin.');
    if (uid === currentUser.uid && role !== 'admin') {
      throw new HttpError(400, 'You cannot remove your own admin access.');
    }

    let targetUser;
    try {
      targetUser = await getAuth().getUser(uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') throw new HttpError(404, 'Firebase user not found.');
      throw error;
    }

    await getDb().collection('users').doc(uid).set({
      uid,
      email: targetUser.email || '',
      displayName: targetUser.displayName || '',
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return json(200, {
      success: true,
      message: `Role updated to ${role}.`,
      user: {
        uid,
        email: targetUser.email || '',
        displayName: targetUser.displayName || '',
        role
      }
    });
  } catch (error) {
    return toPublicError(error);
  }
};
