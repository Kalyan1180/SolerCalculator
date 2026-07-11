const {
  getAdminServices,
  getRoleDefinition,
  jsonResponse,
  normalizeRole,
  rbacConfig,
  requirePermission
} = require('./_firebaseAdmin');

function validUid(value) {
  const uid = String(value || '').trim();
  return uid && uid.length <= 128 ? uid : null;
}

function roleChangeError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

exports.handler = async event => {
  if (event.httpMethod !== 'PUT') return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'PUT' });
  const authorization = await requirePermission(event, 'users.roles.write');
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const uid = validUid(payload.uid);
    const requestedRole = String(payload.role || '').trim().toLowerCase();
    if (!uid || !rbacConfig.roles[requestedRole]) {
      return jsonResponse(400, { error: 'A valid user UID and supported role are required' });
    }
    if (uid === authorization.user.uid && requestedRole !== 'admin') {
      return jsonResponse(400, { error: 'You cannot remove your own administrator access' });
    }

    const { auth, db, fieldValue } = getAdminServices();
    const targetUser = await auth.getUser(uid);
    const targetRef = db.collection('users').doc(uid);
    const auditRef = db.collection('auditLogs').doc();
    let previousRole = 'customer';

    await db.runTransaction(async transaction => {
      const targetSnapshot = await transaction.get(targetRef);
      previousRole = normalizeRole(targetSnapshot.exists ? targetSnapshot.data().role : 'customer');

      if (previousRole === 'admin' && requestedRole !== 'admin') {
        const administratorQuery = db.collection('users').where('role', '==', 'admin').limit(2);
        const administratorSnapshot = await transaction.get(administratorQuery);
        if (administratorSnapshot.size <= 1) {
          throw roleChangeError('rbac/last-admin', 'The last administrator cannot be demoted');
        }
      }

      transaction.set(targetRef, {
        uid,
        email: targetUser.email || '',
        displayName: targetUser.displayName || '',
        role: requestedRole,
        rbacVersion: rbacConfig.version,
        updatedAt: fieldValue.serverTimestamp(),
        updatedBy: authorization.user.uid
      }, { merge: true });

      transaction.set(auditRef, {
        action: 'user.role.updated',
        actorUid: authorization.user.uid,
        actorEmail: authorization.user.email || '',
        targetUid: uid,
        targetEmail: targetUser.email || '',
        previousRole,
        newRole: requestedRole,
        rbacVersion: rbacConfig.version,
        createdAt: fieldValue.serverTimestamp()
      });
    });

    // Claims are a defence-in-depth copy of the role. Authorization still reads
    // Firestore so a role change takes effect immediately without trusting stale tokens.
    const existingClaims = targetUser.customClaims || {};
    await auth.setCustomUserClaims(uid, {
      ...existingClaims,
      role: requestedRole,
      rbacVersion: rbacConfig.version
    });

    const roleDefinition = getRoleDefinition(requestedRole);
    return jsonResponse(200, {
      message: `Role updated to ${roleDefinition.label}`,
      uid,
      previousRole,
      role: requestedRole,
      roleLabel: roleDefinition.label,
      auditId: auditRef.id
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    if (error.code === 'auth/user-not-found') return jsonResponse(404, { error: 'User not found' });
    if (error.code === 'rbac/last-admin') return jsonResponse(409, { error: error.message });
    return jsonResponse(500, { error: 'Unable to update user role' });
  }
};
