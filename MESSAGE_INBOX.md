# ANT Solar Message Inbox and Completion Gate

## Customer enquiry workflow

The public Contact page does not send an automatic email when a visitor submits a message.

The submission is validated by `netlify/functions/sendEnquiry.js` and stored in the Firestore `enquiries` collection. The visitor receives a reference number such as:

```text
ENQ-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

The submission function does not import Nodemailer, open an SMTP connection, or use `EMAIL_HOST`, `EMAIL_PASSWORD`, or `CONTACT_TO`.

## Authorised inbox access

The Message Inbox is available at:

```text
/admin/messages
```

It is displayed only when the current role has `messages.read`.

| Role | View messages | Manage messages |
|---|---:|---:|
| Administrator | Yes | Yes |
| Project Manager | Yes | Yes |
| Analyst | No | No |
| Inventory Manager | No | No |
| Customer | No | No |

The route, central administration navigation and server functions all enforce the same permissions.

Direct browser access to the `enquiries` Firestore collection is denied. The inbox reads and writes through Firebase-ID-token-protected Netlify functions.

## Inbox filters

Authorised staff can filter by:

- free-text search across reference, name, email, phone and message;
- status;
- priority;
- enquiry type.

Summary cards show new, in-progress, urgent and resolved counts.

## Statuses

| Status | Meaning |
|---|---|
| `new` | Not yet reviewed |
| `in_progress` | Assigned or actively being handled |
| `contacted` | Customer contact has been attempted or completed |
| `resolved` | No further action is required |
| `spam` | Invalid or unwanted submission |

## Priorities

| Priority | Meaning |
|---|---|
| `low` | No immediate action required |
| `normal` | Standard follow-up |
| `high` | Important or time-sensitive |
| `urgent` | Requires immediate attention |

Staff can assign the enquiry, add internal notes and update its status or priority. Each action is written to the enquiry activity history and the central audit log.

The inbox provides explicit **Open email client** and **Call** actions. These actions are initiated by the operator; receiving a website message never sends an automatic email.

## Installation completion payment gate

A project cannot move from `in_progress` to `completed` until at least 50% of the quoted price has been recorded as received.

```text
minimum completion payment = quoted price × 0.50
remaining for completion    = max(0, minimum completion payment - amount paid)
```

The rule is enforced twice:

1. the Project Workspace disables the completion action and shows the remaining amount;
2. `netlify/functions/updateProjectStatus.js` rechecks the current project inside the Firestore transaction.

The backend check is authoritative. Bypassing or modifying the browser interface cannot complete an underpaid project.

The gate accepts cumulative partial payments. For example, on a quotation of Rs 100,000, payments of Rs 20,000 and Rs 30,000 satisfy the completion threshold.

Full payment is not required to record installation completion; the minimum is exactly 50%. The remaining balance continues to appear as due.

## Deployment

Deploy the application and Firestore rules together:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

The rules keep the enquiry collection server-only and mirror the new message permissions for Project Manager access.

## Validation

Run:

```bash
npm run validate:rbac
npm run validate:ui-access
npm run validate:operations
npm run validate:messages
npm run lint
npm run build
```

`validate:messages` fails when:

- automatic contact-form email code is reintroduced;
- inbox endpoints lose their required permissions;
- unauthorised roles receive message permissions;
- direct Firestore enquiry access is enabled;
- the Message Inbox route or visibility guard is removed;
- the backend or UI 50% completion gate is removed.

## Operational test checklist

1. Submit the Contact form and confirm an enquiry reference is displayed.
2. Confirm no SMTP request or contact notification email is generated.
3. Sign in as a Project Manager and confirm Message Inbox is visible.
4. Sign in as an Inventory Manager, Analyst or Customer and confirm it is absent.
5. Search and filter the inbox by status, priority and enquiry type.
6. Assign a message, add an internal note and mark it contacted or resolved.
7. Confirm the action appears in the activity history.
8. Open an in-progress project with less than 50% paid and confirm completion is disabled.
9. Attempt the completion endpoint directly and confirm `MINIMUM_PAYMENT_REQUIRED` is returned.
10. Record cumulative payments reaching 50% and confirm completion becomes available.
