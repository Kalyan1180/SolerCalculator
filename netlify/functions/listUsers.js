const {
  getAdminServices,
  getRoleDefinition,
  jsonResponse,
  normalizeRole,
  requirePermission
} = require('./_firebaseAdmin');

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const authorization = await requirePermission(event, 'users.read');
  if (!authorization.authorized) return authorization.response;

  try {
    const { auth, db } = getAdminServices();
    const [authResult, roleSnapshot] = await Promise.all([
      auth.listUsers(1000),
      db.collection('users').get()
    ]);
    const roles = new Map(roleSnapshot.docs.map(userDoc => [userDoc.id, userDoc.data()]));
    const users = authResult.users.map(user => {
      const profile = roles.get(user.uid) || {};
      const role = normalizeRole(profile.role);
      const roleDefinition = getRoleDefinition(role);
      return {
        uid: user.uid,
        email: user.email || profile.email || '',
        displayName: user.displayName || profile.displayName || '',
        role,
        roleLabel: roleDefinition.label,
        disabled: user.disabled,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime || null,
        lastSignInAt: user.metadata.lastSignInTime || null
      };
    });
    users.sort((a, b) => String(a.email || a.uid).localeCompare(String(b.email || b.uid)));
    return jsonResponse(200, { users, truncated: Boolean(authResult.pageToken) });
  } catch (error) {
    console.error('Error listing users:', error);
    return jsonResponse(500, { error: 'Unable to load users' });
  }
};
