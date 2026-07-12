# Enquiry, Site Survey and Document Email Workflow

## Public enquiry

The Contact page submits to `/.netlify/functions/sendEnquiry` instead of posting to the SPA root.

Each valid enquiry is first stored in the protected Firestore `enquiries` collection and then emailed to the business. This prevents an SMTP interruption from losing the customer's request.

Required Netlify environment variables:

```text
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=sender@example.com
EMAIL_PASSWORD=google_app_password
EMAIL_FROM=ANT Solar <sender@example.com>
```

Optional:

```text
CONTACT_TO=enquiries@example.com
```

When `CONTACT_TO` is omitted, enquiries are sent to `EMAIL_USER`.

## Panel catalogue

Inventory supports two explicit panel categories:

- `bifacial`
- `non_bifacial`

Use **Smart Inventory & Equipment → Add panel starters** to create one starter record for each category. Starter records deliberately have zero stock, zero prices and calculator use disabled. Edit them with the actual brand, cell technology, wattage, supplier, cost, selling price and stock before enabling calculator recommendations.

## Site survey gate

A project starts with:

```text
siteSurveyStatus = not_scheduled
```

The operational sequence is:

1. Prepare and send the quotation.
2. Schedule the site survey.
3. Record technical findings and mark the survey complete.
4. Approve the quotation.
5. Record payment and schedule installation.

The server rejects quotation approval with `SITE_SURVEY_REQUIRED` until the survey is complete. Disabling the browser button does not bypass this rule.

Internal survey information includes roof type, meter type, shadow assessment, sanctioned load, recommended capacity and detailed technical findings. Customers receive only the survey status, dates and the customer-safe message.

## Email and PDF matrix

| Event | PDF attachment | System summary in email | Commercial summary in email |
|---|---|---:|---:|
| Quotation sent | Quotation PDF | Yes | Yes |
| Site survey scheduled | None | No | No |
| Site survey completed | None | No | No |
| Quotation approved | Invoice PDF | Yes | Yes |
| Payment recorded | Payment receipt PDF | No | Yes |
| Installation scheduled | None | No | No |
| Installation started | None | No | No |
| Installation completed | None | Yes | No |
| Rejected or cancelled | None | No | No |
| Project details revised | None | Only when equipment changed | Only when price/advance changed |

Failed messages remain in Project Workspace communication history and can be retried. Retrying regenerates the required PDF from the protected notification payload.

## Deployment

Deploy the Netlify site after merging so the new functions and `pdfkit` dependency are installed.

No new browser permission is granted. Enquiries, project notifications and internal survey details remain inaccessible to customer browser code.

## Operational checks

1. Submit a Contact enquiry and verify a Firestore enquiry record and business email.
2. Create panel starters, edit real specifications and enable calculator use only after stock and prices are set.
3. Send a quotation and verify the quotation PDF attachment.
4. Attempt approval before survey completion and verify it is rejected.
5. Schedule and complete the survey, then approve and verify the invoice PDF attachment.
6. Record a partial payment and verify the payment receipt PDF.
7. Change only an installation date and verify the email does not include an unnecessary commercial summary.
8. Temporarily use an invalid SMTP password, verify the operation remains saved, then restore SMTP and retry the failed notification.
