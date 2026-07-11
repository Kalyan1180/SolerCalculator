const admin = require('firebase-admin');
const rbacConfig = require('../../config/rbac.json');
const sessionConfig = require('../../config/session.json');

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
    db: admin.firestore(),
    fieldValue: admin.firestore.FieldValue
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

function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return rbacConfig.roles[normalized] ? normalized : 'customer';
}

function getRoleDefinition(role) {
  const normalizedRole = normalizeRole(role);
  return {
    role: normalizedRole,
    ...rbacConfig.roles[normalizedRole]
  };
}

function getRolePermissions(role) {
  const definition = getRoleDefinition(role);
  return definition.permissions.includes('*')
    ? Object.keys(rbacConfig.permissions)
    : [...definition.permissions];
}

function roleHasPermission(role, permission) {
  if (!rbacConfig.permissions[permission]) return false;
  const definition = getRoleDefinition(role);
  return definition.permissions.includes('*') || definition.permissions.includes(permission);
}

function unauthorizedSession(code, error) {
  return {
    authorized: false,
    response: jsonResponse(401, { code, error })
  };
}

function validateDecodedSession(decodedToken, profile, role) {
  const authTime = Number(decodedToken.auth_time);
  if (!Number.isFinite(authTime) || authTime <= 0) {
    return {
      code: 'INVALID_TOKEN',
      error: 'Authentication token is missing its sign-in timestamp'
    };
  }

  const tokensValidAfterSeconds = Number(profile.tokensValidAfterSeconds || 0);
  if (Number.isFinite(tokensValidAfterSeconds) && tokensValidAfterSeconds > 0 && authTime < tokensValidAfterSeconds) {
    return {
      code: 'SESSION_REVOKED',
      error: 'This session has been revoked. Please sign in again.'
    };
  }

  const privileged = roleHasPermission(role, 'dashboard.access');
  const absoluteSeconds = sessionConfig.privileged.absoluteHours * 60 * 60;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (privileged && nowSeconds - authTime >= absoluteSeconds) {
    return {
      code: 'REAUTHENTICATION_REQUIRED',
      error: 'The maximum administration session duration has been reached. Please sign in again.'
    };
  }

  return null;
}

function authenticationErrorResponse(error) {
  const code = String(error?.code || '');
  if (code === 'auth/id-token-revoked') {
    return unauthorizedSession('SESSION_REVOKED', 'This session has been revoked. Please sign in again.');
  }
  if (code === 'auth/id-token-expired') {
    return unauthorizedSession('SESSION_EXPIRED', 'The authentication token expired. Please sign in again.');
  }
  if (code === 'auth/user-disabled' || code === 'auth/user-not-found') {
    return unauthorizedSession('SESSION_REVOKED', 'This account is no longer available.');
  }
  return unauthorizedSession('INVALID_TOKEN', 'Invalid authentication token');
}

async function authorize(event) {
  const authorization = event.headers?.authorization || event.headers?.Authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return unauthorizedSession('AUTHENTICATION_REQUIRED', 'Authentication required');

  try {
    const { auth, db } = getAdminServices();
    // checkRevoked=true checks the Firebase refresh-token revocation boundary.
    const decodedToken = await auth.verifyIdToken(match[1], true);
    const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
    const profile = userSnapshot.exists ? userSnapshot.data() : {};
    const role = normalizeRole(profile.role);
    const roleDefinition = getRoleDefinition(role);
    const sessionIssue = validateDecodedSession(decodedToken, profile, role);
    if (sessionIssue) return unauthorizedSession(sessionIssue.code, sessionIssue.error);

    const authTimeSeconds = Number(decodedToken.auth_time);
    const privileged = roleHasPermission(role, 'dashboard.access');
    const absoluteExpiresAt = privileged
      ? new Date((authTimeSeconds + sessionConfig.privileged.absoluteHours * 60 * 60) * 1000).toISOString()
      : null;

    return {
      authorized: true,
      user: decodedToken,
      db,
      profile,
      role,
      roleLabel: roleDefinition.label,
      permissions: getRolePermissions(role),
      session: {
        authenticatedAt: new Date(authTimeSeconds * 1000).toISOString(),
        absoluteExpiresAt,
        privileged,
        policyVersion: sessionConfig.version
      }
    };
  } catch (error) {
    console.error('Authorization failed:', error.message);
    return authenticationErrorResponse(error);
  }
}

async function requirePermission(event, permission) {
  if (!rbacConfig.permissions[permission]) {
    console.error(`Unknown RBAC permission requested by function: ${permission}`);
    return {
      authorized: false,
      response: jsonResponse(500, { error: 'Authorization policy is misconfigured' })
    };
  }

  const authorization = await authorize(event);
  if (!authorization.authorized) return authorization;
  if (!roleHasPermission(authorization.role, permission)) {
    return {
      authorized: false,
      response: jsonResponse(403, {
        code: 'PERMISSION_DENIED',
        error: 'You do not have permission to perform this action',
        requiredPermission: permission
      })
    };
  }
  return { ...authorization, requiredPermission: permission };
}

async function requireAnyPermission(event, permissions) {
  const requestedPermissions = Array.isArray(permissions) ? permissions : [permissions];
  const authorization = await authorize(event);
  if (!authorization.authorized) return authorization;

  const allowed = requestedPermissions.some(permission => roleHasPermission(authorization.role, permission));
  if (!allowed) {
    return {
      authorized: false,
      response: jsonResponse(403, {
        code: 'PERMISSION_DENIED',
        error: 'You do not have permission to perform this action',
        requiredPermissions: requestedPermissions
      })
    };
  }
  return { ...authorization, requiredPermissions: requestedPermissions };
}

async function requireAdmin(event) {
  const authorization = await authorize(event);
  if (!authorization.authorized) return authorization;
  if (authorization.role !== 'admin') {
    return {
      authorized: false,
      response: jsonResponse(403, {
        code: 'PERMISSION_DENIED',
        error: 'Administrator access required'
      })
    };
  }
  return authorization;
}

module.exports = {
  authorize,
  getAdminServices,
  getRoleDefinition,
  getRolePermissions,
  jsonResponse,
  normalizeRole,
  requireAdmin,
  requireAnyPermission,
  requirePermission,
  rbacConfig,
  roleHasPermission,
  sessionConfig
};
