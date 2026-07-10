# Integration Setup Guide

## Environment Variables for Netlify

Add these to your Netlify site settings under Build & Deploy > Environment:

### Email Configuration
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@antsolar.com
```

### SMS Configuration (Twilio)
```
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Firebase Storage
Already configured in src/firebase.js

## Installation Steps

1. **Install Dependencies**
   ```bash
   npm install jspdf html2pdf.js twilio
   ```

2. **Add Environment Variables**
   - Go to Netlify Dashboard
   - Site Settings → Build & Deploy → Environment
   - Add all variables above

3. **For Email Service:**
   - Use Gmail App Password (recommended)
   - Enable 2FA on Gmail
   - Generate app password at myaccount.google.com/apppasswords

4. **For SMS Service:**
   - Sign up at twilio.com
   - Get your Account SID and Auth Token
   - Get a Twilio phone number

5. **Test the Functions**
   - After deploy, test email and SMS from ProjectApproval page

## Features Now Available

✅ PDF Quotation/Invoice Downloads
✅ Photo Upload to Firebase Storage
✅ Email Notifications (Project updates, payments, completion)
✅ SMS Notifications (Status updates, reminders)
✅ Netlify Serverless Functions

## Usage in Components

### Download PDF
```javascript
import { downloadQuotationPDF, downloadInvoicePDF } from '@/utils/pdfGenerator';

await downloadQuotationPDF(project);
await downloadInvoicePDF(project);
```

### Upload Photos
```javascript
import { uploadProjectPhoto, getProjectPhotos } from '@/utils/storageService';

const result = await uploadProjectPhoto(projectId, file);
const photos = await getProjectPhotos(projectId);
```

### Send Emails
```javascript
import { sendProjectUpdateEmail } from '@/utils/emailService';

await sendProjectUpdateEmail(project, 'Your status message');
```

### Send SMS
```javascript
import { sendProjectStatusSMS } from '@/utils/smsService';

await sendProjectStatusSMS(phoneNumber, project, status);
```
