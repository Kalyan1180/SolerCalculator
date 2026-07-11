const { getAdminServices, jsonResponse, requireAdmin } = require('./_firebaseAdmin');

const ALLOWED_ROLES = new Set(['customer', 'admin']);

function validUid(value) {
  const uid = String(value || '').trim();
  return uid && uid.length <= 128 ? uid : null;
}

exports.handler = async event => {
  if (event.httpMethod !== 'PUT') return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'PUT' });
  const authorization = await requireAdmin(event);
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const uid = validUid(payload.uid);
    const role = String(payload.role || '').trim();
    if (!uid || !ALLOWED_ROLES.has(role)) {
      return jsonResponse(400, { error: 'A valid user UID and supported role are required' });
    }
    if (uid === authorization.user.uid && role !== 'admin') {
      return jsonResponse(400, { error: 'You cannot remove your own administrator access' });
    }

    const { auth, db } = getAdminServices();
    const user = await auth.getUser(uid);
    await db.collection('users').doc(uid).set({
      uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return jsonResponse(200, { message: `Role updated to ${role}`, uid, role });
  } catch (error) {
    console.error('Error updating user role:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    if (error.code === 'auth/user-not-found') return jsonResponse(404, { error: 'User not found' });
    return jsonResponse(500, { error: 'Unable to update user role' });
  }
};
