const { authorize, jsonResponse } = require('./_firebaseAdmin');

exports.handler = async event => {
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  }

  const authorization = await authorize(event);
  if (!authorization.authorized) return authorization.response;

  return jsonResponse(200, {
    active: true,
    uid: authorization.user.uid,
    email: authorization.user.email || '',
    role: authorization.role,
    roleLabel: authorization.roleLabel,
    permissions: authorization.permissions,
    session: authorization.session
  });
};
