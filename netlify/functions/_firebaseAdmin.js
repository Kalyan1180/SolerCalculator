const admin = require('firebase-admin');

function requireEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  return admin.initializeApp({
    credential: admin.credential.cert({
      type: requireEnvironment('FB_TYPE'),
      project_id: requireEnvironment('FB_PROJECT_ID'),
      private_key_id: requireEnvironment('FB_PRIVATE_KEY_ID'),
      private_key: requireEnvironment('FB_PRIVATE_KEY').replace(/\\n/g, '\n'),
      client_email: requireEnvironment('FB_CLIENT_EMAIL'),
      client_id: requireEnvironment('FB_CLIENT_ID'),
      auth_uri: process.env.FB_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FB_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL
    })
  });
}

function getAdminServices() {
  getAdminApp();
  return {
    auth: admin.auth(),
    db: admin.firestore()
  };
}

function jsonResponse(statusCode, payload, headers = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers
    },
    body: JSON.stringify(payload)
  };
}

async function requireAdmin(event) {
  const authorization = event.headers?.authorization || event.headers?.Authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { authorized: false, response: jsonResponse(401, { error: 'Authentication required' }) };
  }

  try {
    const { auth, db } = getAdminServices();
    const decodedToken = await auth.verifyIdToken(match[1], true);
    const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
    const role = userSnapshot.exists ? userSnapshot.data().role : null;
    if (role !== 'admin') {
      return { authorized: false, response: jsonResponse(403, { error: 'Administrator access required' }) };
    }
    return { authorized: true, user: decodedToken, db };
  } catch (error) {
    console.error('Authorization failed:', error.message);
    return { authorized: false, response: jsonResponse(401, { error: 'Invalid or expired authentication token' }) };
  }
}

module.exports = {
  getAdminServices,
  jsonResponse,
  requireAdmin
};
