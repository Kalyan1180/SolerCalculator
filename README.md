# ANT Solar Calculator

A Vue 3 application for sizing residential/commercial solar systems, submitting quotations, tracking customer projects and payments, managing calculator equipment, monitoring stock, and reviewing business analytics.

## Main application areas

- Solar sizing from monthly units, electricity bill, or appliance load
- Inverter and battery selection from the Firebase equipment catalog
- Customer quotation/project submission
- Admin quotation approval, payment milestones, installation progress, notes, site photos, email/SMS notifications, quotations, and invoices
- Customer project-status dashboard
- Stock inventory, user-role management, and analytics

## Requirements

- Node.js 18 or newer; Node.js 20 is used in CI and Netlify
- Firebase Authentication, Firestore, and Storage
- Netlify Functions
- Optional SMTP account for email and Twilio account for SMS

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and enter values for your own Firebase project:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

3. Start the Vue development server:

```bash
npm run serve
```

The plain Vue development server does not emulate Netlify Functions. For complete local testing, install the Netlify CLI and run the project through Netlify Dev:

```bash
npx netlify dev
```

## Environment variables

Use `.env.example` as the complete variable-name reference.

- Variables beginning with `VUE_APP_` are compiled into browser JavaScript. Never place private credentials in them.
- `FB_*`, `EMAIL_*`, and `TWILIO_*` values are server-side Netlify environment variables.
- Do not commit `.env`, `.env.local`, service-account JSON, SMTP passwords, or Twilio tokens.

## Firebase setup

Deploy the repository-managed Firestore and Storage rules after selecting the intended Firebase project:

```bash
npx firebase-tools login
npx firebase-tools use <your-firebase-project-id>
npx firebase-tools deploy --only firestore:rules,storage
```

Create the first administrator securely in Firestore by setting the corresponding `users/{firebaseAuthUid}` document role to `admin` using the Firebase Console or a trusted administrative script. Public sign-up always creates a `customer` role.

The application uses these collections:

- `users`
- `projects`
- `inventory`
- `inverters`
- `batteries`

## Netlify deployment

The included `netlify.toml` configures:

- `npm run build`
- the `dist` publish directory
- `netlify/functions`
- Node.js 20
- Vue Router SPA fallback
- basic browser security headers

Before deployment, configure every required variable from `.env.example` in Netlify's environment-variable settings.

## Validation

```bash
npm run lint
npm run build
```

GitHub Actions executes dependency installation, linting, and a production build on pushes and pull requests.

## Security warning

A Firebase Admin service-account private key was previously committed to this repository's Git history. Removing the current `.env` file does not revoke that credential. Revoke/delete the exposed key in Google Cloud IAM, create a replacement if still required, and update the Netlify `FB_*` variables before deploying.

See [SECURITY.md](SECURITY.md) for the mandatory rotation steps and safe deployment rules.

## Legacy data

Earlier versions wrote project documents using a different schema. Current project screens and analytics use the canonical schema containing fields such as `projectId`, `customerId`, `status`, `quotedPrice`, and `paymentStatus`. Legacy malformed records are excluded from analytics and may require a one-time manual migration before they appear in current workflows.
