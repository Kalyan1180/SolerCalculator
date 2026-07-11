# ANT Solar Authentication and Session Security

## Authentication model

ANT Solar uses Firebase Authentication as the identity provider. It does not create or sign a second application-specific JWT.

After a successful email/password or Google sign-in, Firebase provides:

- a short-lived Firebase ID token, which is a signed JWT;
- a Firebase refresh token managed by the Firebase Web SDK;
- an authenticated Firebase user used by Firestore Security Rules.

The ID token is sent to protected Netlify functions as:

```http
Authorization: Bearer <firebase-id-token>
```

The application never writes an ID token, access token, refresh token or JWT to its own `localStorage` or `sessionStorage` keys. Firebase owns token persistence and rotation.

## Browser persistence

The login and signup screens explicitly select one of Firebase's supported persistence modes before authentication:

| User choice | Firebase persistence | Behaviour |
|---|---|---|
| **Keep me signed in** unchecked | `browserSessionPersistence` | The Firebase session is scoped to the current browser tab/session |
| **Keep me signed in** checked | `browserLocalPersistence` | Firebase can restore the user after the browser is reopened |

The application stores only the non-secret persistence preference and the last-activity timestamp. It does not store token material itself.

## Session policy

The canonical policy is in `config/session.json`.

| Account type | Idle timeout | Absolute timeout |
|---|---:|---:|
| Administrator and staff roles with dashboard access | 30 minutes | 8 hours from the original sign-in |
| Customer, not remembered | 120 minutes | 24 hours |
| Customer, remembered | 120 minutes | 30 days |

A warning appears two minutes before the next timeout. Activity can extend the idle deadline, but it cannot extend the absolute administration deadline. Staff must authenticate again after eight hours.

## Enforcement layers

### Firebase Web SDK

`src/utils/sessionManager.js`:

- initializes the selected Firebase persistence mode before the router restores the user;
- listens with `onIdTokenChanged`;
- tracks user activity without storing token material;
- refreshes an ID token when it is within five minutes of expiry;
- applies idle and absolute deadlines;
- displays a warning through `SessionStatus.vue`;
- signs the user out when a session is expired or rejected;
- validates protected dashboard navigation against the server once per configured cache window.

### Vue Router

Every authenticated route checks that the local session is active. Dashboard routes additionally call `/.netlify/functions/sessionStatus` before applying RBAC permissions.

If the validation service is unavailable, privileged navigation fails closed instead of opening the administration page without a server check.

### Netlify functions

`netlify/functions/_firebaseAdmin.js` verifies every protected bearer token using:

```js
auth.verifyIdToken(idToken, true)
```

The second argument enables Firebase revocation checking. The function then:

1. loads the current `users/{uid}` profile;
2. checks the application revocation boundary;
3. resolves the current role and permissions;
4. enforces the eight-hour absolute limit for privileged roles;
5. returns structured `401` session error codes when reauthentication is required.

Protected requests retry only once with a forced fresh ID token. Revoked and absolute-expiry responses are not repeatedly retried.

### Firestore Security Rules

Firestore Rules independently enforce:

- the Firebase `auth_time` claim is present;
- the token was issued after `users/{uid}.tokensValidAfterSeconds`;
- privileged requests occur within eight hours of the original sign-in;
- the existing RBAC permission matrix and field-level update restrictions.

This prevents an old administration token from bypassing the browser timer by calling Firestore directly.

## Revoking sessions

Administrators have a dedicated **Revoke Sessions** action under **Administration Dashboard → Users, Roles & Sessions**.

The action:

1. requires the `users.sessions.revoke` permission;
2. writes `tokensValidAfterSeconds` and revocation metadata to the user profile;
3. creates an append-only `user.sessions.revoked` audit entry;
4. calls Firebase Admin `revokeRefreshTokens(uid)`;
5. causes existing browser and API sessions to require a new sign-in.

An administrator may revoke their own sessions. The current browser is signed out after the operation succeeds.

## Idle timeout boundary

Idle time is a browser activity concept and is enforced by the central client session manager. Revocation and the eight-hour privileged absolute timeout are also enforced by Netlify and Firestore, where they cannot be bypassed by removing UI code.

Implementing a server-authoritative idle timeout would require a server-side session record and a write/heartbeat for user activity. That additional database traffic is intentionally avoided for this Firebase SPA; the absolute and revocation boundaries remain server-authoritative.

## Deployment

Session application code, Netlify functions and Firestore Rules should be deployed together.

After merge and Netlify deployment, publish Firestore Rules:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

A previously signed-in staff user whose original `auth_time` is already older than eight hours will be asked to sign in again after the new policy is deployed.

## Validation

Run:

```bash
npm run validate:rbac
npm run validate:session
npm run lint
npm run build
```

`validate:session` verifies that:

- all policy values are positive and internally consistent;
- Firestore contains the configured absolute timeout and revocation boundary;
- backend verification uses Firebase revocation checking;
- the status and revocation functions use centralized authorization;
- the client uses explicit Firebase persistence modes and token refresh;
- application code does not manually store JWT material.

## Operational test checklist

1. Sign in without **Keep me signed in**, close the tab/browser session, and verify the user is not restored.
2. Sign in with **Keep me signed in** and verify the Firebase user is restored after reopening the browser.
3. Assign a staff role and verify the warning appears before idle expiry.
4. Select **Stay signed in** and verify only the idle deadline is extended.
5. Verify a staff token older than eight hours receives `REAUTHENTICATION_REQUIRED`.
6. Revoke another user's sessions and verify their next protected request returns `SESSION_REVOKED`.
7. Verify a revoked token cannot read privileged Firestore collections.
8. Confirm role and session revocation events appear in the Security Audit Log.
