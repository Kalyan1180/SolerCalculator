# Security Notes

## Immediate action required

A Firebase Admin service-account private key was committed to this repository's Git history before the current cleanup. Removing the `.env` file from the latest branch does **not** invalidate or erase that historical credential.

Before deploying this branch:

1. Open Google Cloud IAM & Admin for the Firebase project.
2. Find the service account previously used by the Netlify functions.
3. Revoke/delete the exposed private key and create a replacement key only if service-account JSON credentials are still required.
4. Replace all `FB_*` values in Netlify environment variables with the new credential.
5. Rotate any SMTP, Twilio, or other secrets that were ever committed or shared outside the deployment secret store.
6. Consider rewriting repository history with `git filter-repo` or BFG, then force-pushing coordinated branches. Credential rotation is still mandatory even after a history rewrite.

## Deployment rules

- Never commit `.env`, service-account JSON, app passwords, or Twilio auth tokens.
- Use `.env.example` only as a variable-name template.
- Client variables prefixed with `VUE_APP_` are bundled into browser JavaScript and must never contain private credentials.
- Netlify email and SMS functions require a valid Firebase ID token belonging to a Firestore user whose role is `admin`.
- Firestore and Firebase Storage security rules must enforce the same authorization server-side; browser route guards are not a security boundary.

## Reporting

Do not include credentials, customer information, or production database exports in GitHub issues. Report security problems privately to the repository owner.
