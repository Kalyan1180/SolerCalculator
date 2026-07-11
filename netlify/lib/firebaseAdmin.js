// Shared Firebase Admin helpers for Netlify functions.
const admin = require('firebase-admin');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new HttpError(500, `Server configuration is missing ${name}.`);
  }
  return value;
}

function getAdminApp() {
  if (admin.apps.length) {
    return admin.app();
  }

  const privateKey = getRequiredEnv('FB_PRIVATE_KEY').replace(/\\n/g, '\n');

  return admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FB_TYPE || 'service_account',
      project_id: getRequiredEnv('FB_PROJECT_ID'),
      private_key_id: getRequiredEnv('FB_PRIVATE_KEY_ID'),
      private_key: privateKey,
      client_email: getRequiredEnv('FB_CLIENT_EMAIL'),
      client_id: getRequiredEnv('FB_CLIENT_ID'),
      auth_uri: process.env.FB_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
      token_uri: process.env.FB_TOKEN_URI || 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: getRequiredEnv('FB_CLIENT_X509_CERT_URL')
    })
  });
}

function getDb() {
  getAdminApp();
  return admin.firestore();
}

function getAuth() {
  getAdminApp();
  return admin.auth();
}

function parseJsonBody(event, maxBytes = 100000) {
  if (!event.body) {
    throw new HttpError(400, 'Request body is required.');
  }

  if (Buffer.byteLength(event.body, 'utf8') > maxBytes) {
    throw new HttpError(413, 'Request body is too large.');
  }

  try {
    return JSON.parse(event.body);
  } catch (error) {
    throw new HttpError(400, 'Request body must contain valid JSON.');
  }
}

function getBearerToken(event) {
  const headers = event.headers || {};
  const authorization = headers.authorization || headers.Authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function requireUser(event, options = {}) {
  const token = getBearerToken(event);
  if (!token) {
    throw new HttpError(401, 'Authentication is required.');
  }

  let decodedToken;
  try {
    decodedToken = await getAuth().verifyIdToken(token, true);
  } catch (error) {
    throw new HttpError(401, 'Your session is invalid or expired. Please sign in again.');
  }

  const userSnapshot = await getDb().collection('users').doc(decodedToken.uid).get();
  const role = userSnapshot.exists && userSnapshot.data().role
    ? userSnapshot.data().role
    : 'user';

  const allowedRoles = options.roles || [];
  if (allowedRoles.length && !allowedRoles.includes(role)) {
    throw new HttpError(403, 'You do not have permission to perform this action.');
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email || '',
    name: decodedToken.name || '',
    role,
    decodedToken
  };
}

function toPublicError(error) {
  if (error instanceof HttpError) {
    return json(error.statusCode, { error: error.message });
  }

  console.error(error);
  return json(500, { error: 'Internal server error.' });
}

module.exports = {
  admin,
  HttpError,
  json,
  getAdminApp,
  getDb,
  getAuth,
  parseJsonBody,
  requireUser,
  toPublicError
};
