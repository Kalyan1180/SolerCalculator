# ANT Solar Role-Based Access Control

## Purpose

The administration area uses least-privilege role-based access control (RBAC). Access is enforced at every relevant layer:

1. Dashboard modules are shown only when the signed-in role has the required permission.
2. Vue Router checks the permission before opening a protected route.
3. Netlify functions verify the Firebase ID token and required permission before privileged server actions.
4. Firestore Security Rules enforce permissions for all browser database operations.

Frontend visibility is a usability feature, not the security boundary. Firestore Rules and Netlify functions remain authoritative.

## Roles

| Role | Intended user | Access |
|---|---|---|
| `admin` | Business owner or trusted system administrator | Full operational and security administration |
| `project_manager` | Sales/project operations staff | Quotations, projects, status, payments, documents and customer notifications |
| `inventory_manager` | Procurement/store staff | Stock inventory and calculator equipment management |
| `analyst` | Accountant, auditor or reporting user | Read-only projects, inventory, equipment and analytics |
| `customer` | Public customer account | Calculator and only the customer's own projects |

## Separation of duties

- Project managers cannot manage inventory, equipment, users or roles.
- Inventory managers cannot change projects, payments, users or roles.
- Analysts cannot perform write operations.
- Only administrators can list users, assign roles or read the security audit log.
- Public registration always creates a `customer` role.

The canonical policy is stored in `config/rbac.json`. Do not duplicate or invent role names in components or functions.

## Role assignment safeguards

Role changes are performed by `netlify/functions/updateUserRole.js` and include these safeguards:

- the caller must have `users.roles.write`;
- an administrator cannot demote their own account;
- the last administrator cannot be demoted;
- the user document and audit entry are written in one Firestore transaction;
- every successful role change is recorded in the append-only `auditLogs` collection;
- Firebase custom claims receive a defence-in-depth copy of the role, while Firestore remains authoritative for immediate revocation.

## Existing administrator

Existing user documents containing:

```text
role: admin
```

continue to receive full access. No migration is required for the current administrator account.

All unrecognized or missing roles are treated as `customer` by the application and server functions. Firestore Rules fail closed for unsupported role values.

## Assigning a role

1. Sign in as an administrator.
2. Open **Administration Dashboard → Users & Roles**.
3. Select the least-privilege role needed by the user.
4. Select **Save** and confirm the assignment.
5. Review **Administration Dashboard → Security Audit Log** when an audit check is required.

The backend and Firestore permissions change immediately. The affected user should refresh the application or sign out and sign back in to refresh visible navigation and Firebase custom claims.

## Firestore deployment

Updating the website on Netlify does not deploy Firestore Security Rules. After merging an RBAC change, deploy the rules to the `ant-soler` Firebase project:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

The repository `.firebaserc` maps the default project to `ant-soler`.

The RBAC application code and new role assignments should not be used in production until the matching `firestore.rules` version has been published.

## Validation

Run locally:

```bash
npm run validate:rbac
npm run lint
npm run build
```

`npm run validate:rbac` checks:

- required roles and permissions;
- role/permission naming and references;
- administrator wildcard policy;
- read-only analyst restrictions;
- separation of project and inventory duties;
- administrator-only security permissions;
- representation of configured roles and permissions in `firestore.rules`.

GitHub Actions runs these checks on pull requests and pushes to `master` or `agent/**` branches.

## Adding or changing permissions

When changing RBAC:

1. Update `config/rbac.json` first.
2. Add an explicit constant in `src/constants/rbac.js` when introducing a permission.
3. Apply the permission to the relevant route and component UI.
4. Enforce it in every related Netlify function.
5. Mirror it in `firestore.rules` for browser database operations.
6. Update this document and run the full validation suite.
7. Deploy the updated Firestore Rules after merge.

Never authorize privileged operations from a role value supplied by the browser request body. Always resolve the caller from the verified Firebase ID token and the server-side `users/{uid}` document.
