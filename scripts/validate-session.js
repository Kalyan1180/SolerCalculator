const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config', 'session.json'), 'utf8'));
const firestoreRules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const clientManager = fs.readFileSync(path.join(root, 'src', 'utils', 'sessionManager.js'), 'utf8');
const backendAuth = fs.readFileSync(path.join(root, 'netlify', 'functions', '_firebaseAdmin.js'), 'utf8');
const statusFunction = fs.readFileSync(path.join(root, 'netlify', 'functions', 'sessionStatus.js'), 'utf8');
const revokeFunction = fs.readFileSync(path.join(root, 'netlify', 'functions', 'revokeUserSessions.js'), 'utf8');

function fail(message) {
  throw new Error(`Session validation failed: ${message}`);
}

function positiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) fail(`${name} must be a positive integer`);
}

positiveInteger(config.version, 'version');
positiveInteger(config.tokenRefreshWindowMinutes, 'tokenRefreshWindowMinutes');
positiveInteger(config.warningMinutes, 'warningMinutes');
positiveInteger(config.activityWriteThrottleSeconds, 'activityWriteThrottleSeconds');
positiveInteger(config.serverValidationCacheSeconds, 'serverValidationCacheSeconds');
positiveInteger(config.privileged?.idleMinutes, 'privileged.idleMinutes');
positiveInteger(config.privileged?.absoluteHours, 'privileged.absoluteHours');
positiveInteger(config.customer?.idleMinutes, 'customer.idleMinutes');
positiveInteger(config.customer?.sessionAbsoluteHours, 'customer.sessionAbsoluteHours');
positiveInteger(config.customer?.rememberedAbsoluteDays, 'customer.rememberedAbsoluteDays');

if (config.warningMinutes >= config.privileged.idleMinutes) {
  fail('warning window must be shorter than the privileged idle timeout');
}
if (config.privileged.idleMinutes >= config.privileged.absoluteHours * 60) {
  fail('privileged idle timeout must be shorter than the absolute timeout');
}
if (config.customer.sessionAbsoluteHours >= config.customer.rememberedAbsoluteDays * 24) {
  fail('remembered customer sessions must outlast non-remembered customer sessions');
}
if (config.tokenRefreshWindowMinutes >= 60) {
  fail('token refresh window must remain below the Firebase ID token lifetime');
}

const privilegedAbsoluteMs = config.privileged.absoluteHours * 60 * 60 * 1000;
if (!firestoreRules.includes(String(privilegedAbsoluteMs))) {
  fail('Firestore rules do not match the configured privileged absolute timeout');
}
if (!firestoreRules.includes('request.auth.token.auth_time > currentUserProfile().tokensValidAfterSeconds')) {
  fail('Firestore rules do not enforce the per-user revocation boundary');
}
if (!firestoreRules.includes('request.time.toMillis()')) {
  fail('Firestore rules do not enforce server-time session expiry');
}
if (!backendAuth.includes('verifyIdToken(match[1], true)')) {
  fail('backend JWT verification is not checking Firebase revocation');
}
if (!backendAuth.includes("code: 'REAUTHENTICATION_REQUIRED'")) {
  fail('backend does not enforce privileged absolute reauthentication');
}
if (!statusFunction.includes('const authorization = await authorize(event)')) {
  fail('session status endpoint is not using centralized authorization');
}
if (!revokeFunction.includes('auth.revokeRefreshTokens(uid)')) {
  fail('session revocation endpoint does not revoke Firebase refresh tokens');
}
if (!revokeFunction.includes('tokensValidAfterSeconds')) {
  fail('session revocation endpoint does not publish the rules revocation boundary');
}
if (!clientManager.includes('browserSessionPersistence') || !clientManager.includes('browserLocalPersistence')) {
  fail('client does not implement explicit session persistence modes');
}
if (!clientManager.includes('getIdTokenResult') || !clientManager.includes('getIdToken(shouldRefresh)')) {
  fail('client does not refresh expiring Firebase ID tokens');
}
if (/localStorage[^\n]*token|setItem\([^\n]*(?:idToken|jwt|accessToken)/i.test(clientManager)) {
  fail('JWT material must not be written manually to browser storage');
}

console.log(
  `Session policy v${config.version} is valid: ${config.privileged.idleMinutes}m privileged idle, `
  + `${config.privileged.absoluteHours}h privileged absolute.`
);
