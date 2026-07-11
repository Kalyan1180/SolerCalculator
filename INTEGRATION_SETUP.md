# Integration Setup Guide

## Netlify environment variables

Open the Netlify site, then go to **Site configuration → Environment variables**. Add the variables for the integrations you use and redeploy the site after changing them.

## Email through Gmail SMTP

```text
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-google-app-password
EMAIL_FROM=ANT Solar <your-email@gmail.com>
```

Important:

- `EMAIL_PASSWORD` must be a Google App Password, not the normal Gmail password.
- The Gmail account must have two-step verification enabled before an App Password can be created.
- The application removes spaces from Gmail App Passwords automatically, so either grouped or ungrouped input is accepted.
- `EMAIL_FROM` should normally use the same Gmail address as `EMAIL_USER` unless the SMTP account is authorized to send as another address.
- Environment-variable changes do not affect an already-built deployment. Trigger a new Netlify deploy after saving them.

### Troubleshooting

The admin project page now reports the class of email failure:

- **Missing Netlify environment variables**: add the named variables and redeploy.
- **Email provider rejected the login**: replace `EMAIL_PASSWORD` with a valid App Password.
- **Unable to connect to the email provider**: verify `EMAIL_HOST=smtp.gmail.com` and `EMAIL_PORT=587`.
- **Sender or recipient rejected**: check `EMAIL_FROM`, `EMAIL_USER`, and the customer email address.

For additional details, open **Netlify → Logs & Metrics → Functions → sendEmail** and inspect the latest invocation.

## Firebase Admin for protected Netlify functions

Email, SMS, equipment administration, and user-role functions verify Firebase ID tokens on the server. Configure the following service-account values in Netlify:

```text
FB_TYPE=service_account
FB_PROJECT_ID=your-project-id
FB_PRIVATE_KEY_ID=your-private-key-id
FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nREPLACE_ME\n-----END PRIVATE KEY-----\n"
FB_CLIENT_EMAIL=firebase-adminsdk@example.iam.gserviceaccount.com
FB_CLIENT_ID=your-client-id
FB_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FB_TOKEN_URI=https://oauth2.googleapis.com/token
FB_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FB_CLIENT_X509_CERT_URL=your-client-certificate-url
```

Never add these server-side values with a `VUE_APP_` prefix and never commit the private key.

## SMS through Twilio

```text
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+10000000000
```

## Firebase services used

The application uses:

- Firebase Authentication
- Cloud Firestore

Firebase Storage and site-photo uploads are disabled, so the Firebase project can remain on the Spark plan.

## Validation after deployment

1. Sign in with an admin profile.
2. Open a project.
3. Select **Send email update**.
4. Confirm that the customer receives the message.
5. When it fails, read the visible error and the `sendEmail` Netlify function log.
