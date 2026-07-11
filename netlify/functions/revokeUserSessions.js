const {
  getAdminServices,
  jsonResponse,
  requirePermission,
  sessionConfig
} = require('./_firebaseAdmin');

function validUid(value) {
  const uid = String(value || '').trim();
  return uid && uid.length <= 128 ? uid : null;
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'POST' });
  }

  const authorization = await requirePermission(event, 'users.sessions.revoke');
  if (!authorization.authorized) return authorization.response;

  try {
    const payload = JSON.parse(event.body || '{}');
    const uid = validUid(payload.uid);
    if (!uid) return jsonResponse(400, { error: 'A valid user UID is required' });

    const { auth, db, fieldValue } = getAdminServices();
    const targetUser = await auth.getUser(uid);
    const revokedAfterSeconds = Math.floor(Date.now() / 1000);
    const targetRef = db.collection('users').doc(uid);
    const auditRef = db.collection('auditLogs').doc();

    // Store the boundary first so Firestore Rules and Netlify functions reject
    // existing JWTs even if the Firebase revocation API is temporarily unavailable.
    await db.runTransaction(async transaction => {
      transaction.set(targetRef, {
        uid,
        email: targetUser.email || '',
        displayName: targetUser.displayName || '',
        tokensValidAfterSeconds: revokedAfterSeconds,
        sessionsRevokedAt: fieldValue.serverTimestamp(),
        sessionsRevokedBy: authorization.user.uid,
        sessionPolicyVersion: sessionConfig.version,
        updatedAt: fieldValue.serverTimestamp()
      }, { merge: true });

      transaction.set(auditRef, {
        action: 'user.sessions.revoked',
        actorUid: authorization.user.uid,
        actorEmail: authorization.user.email || '',
        targetUid: uid,
        targetEmail: targetUser.email || '',
        revokedAfterSeconds,
        sessionPolicyVersion: sessionConfig.version,
        createdAt: fieldValue.serverTimestamp()
      });
    });

    let warning = null;
    try {
      await auth.revokeRefreshTokens(uid);
    } catch (error) {
      warning = 'The application session boundary was updated, but Firebase refresh-token revocation could not be confirmed.';
      console.error('Firebase refresh-token revocation failed:', error);
    }

    return jsonResponse(200, {
      success: true,
      message: `All active sessions for ${targetUser.email || uid} were revoked.`,
      uid,
      revokedAfterSeconds,
      auditId: auditRef.id,
      warning
    });
  } catch (error) {
    console.error('Error revoking user sessions:', error);
    if (error instanceof SyntaxError) return jsonResponse(400, { error: 'Invalid JSON request body' });
    if (error.code === 'auth/user-not-found') return jsonResponse(404, { error: 'User not found' });
    return jsonResponse(500, { error: 'Unable to revoke user sessions' });
  }
};
