# ANT Solar Project Operations Workspace

## Purpose

The Project Workspace is the operational control centre for a solar installation from quotation through payment, procurement, installation and completion.

The workflow separates customer-safe project data from internal operations data:

- `projects/{projectId}` contains customer-visible status, system, commercial and payment information.
- `projectOperations/{projectId}` contains the inventory BOM, costs, stock planning, internal notes, assignments and activity history.
- `projectNotifications/{notificationId}` contains protected email-delivery state and retry payloads.
- `deletedProjects/{projectId}` contains the protected recovery archive for projects removed from active operations.

All project mutations are performed by authenticated Netlify functions. Browser clients cannot directly edit or delete project documents.

## Permissions

| Capability | Permission | Default role |
|---|---|---|
| View project workspace | `projects.read` | Analyst, Project Manager, Administrator |
| Edit project and equipment | `projects.update` | Project Manager, Administrator |
| Record payments | `projects.payments` | Project Manager, Administrator |
| Generate quotation/invoice | `projects.documents` | Project Manager, Administrator |
| Retry customer emails | `notifications.send` | Project Manager, Administrator |
| Delete active project | `projects.delete` | Administrator only |

Controls are not rendered when the signed-in role lacks the required permission. The corresponding Netlify function independently verifies the permission.

## Editing a project

Select **Edit project** from the Project Workspace to update:

- customer name, email, phone and installation address;
- sales owner and installation coordinator;
- panel model and quantity;
- inverter model;
- battery model and quantity;
- quoted price;
- advance terms;
- scheduled installation and target completion dates;
- customer, internal and technical notes.

Each save uses an optimistic `revision` number. If another user has changed the project since the page was loaded, the save is rejected and the operator must refresh. This prevents silent overwrites.

### Equipment selection

Panel, inverter and battery choices come from the unified inventory catalogue.

Each option displays one of:

- **Available N**
- **Low stock (N)**
- **Out of stock**
- **Discontinued**

Out-of-stock products remain selectable because they may still be the correct technical product for a quotation or planned procurement. Discontinued products are shown for traceability but cannot normally be selected for a new revision.

Server validation checks:

- inverter peak-load capability;
- inverter maximum panel count;
- grid-tie/no-battery configuration;
- required battery-bank voltage;
- battery series quantity and quantity multiples.

After equipment changes, the internal bill of materials and live shortfall calculation are rebuilt automatically. Any shortfall appears in the protected stock and restock planning workflows, not in the customer interface.

## Commercial terms

Advance terms may be entered as either:

- a percentage from **50% to 100%**; or
- a rupee amount equal to **50% to 100%** of the quoted price.

The system calculates the equivalent percentage, advance amount and remaining contract balance.

Once any payment has been recorded, quoted price and advance terms are locked. This preserves accounting consistency and prevents the payment ledger from becoming detached from the agreed commercial terms.

## Payments

The payment workflow supports:

- partial payments;
- advance and final collection;
- cash, UPI, bank transfer, cheque, card or other method;
- transaction/reference number;
- payment date;
- internal payment note;
- overpayment prevention;
- automatic amount-paid and amount-due calculation;
- an internal immutable payment ledger;
- a customer-safe payment history;
- an automatic customer receipt email.

Payment receipt email failure does not lose the payment. The payment remains recorded and the failed email can be retried from the workspace notification history.

## Status workflow and customer email

Supported transitions are:

```text
Quote pending -> Quote sent -> Approved -> Installation scheduled
-> In progress -> Completed
```

Quotation rejection and cancellation are available from the relevant stages.

Every status change:

1. validates the transition;
2. updates the relevant status date;
3. records customer-safe status history;
4. records internal activity history;
5. creates an audit record;
6. creates a customer notification record;
7. attempts a detailed email immediately.

The email contains:

- previous and current status;
- project ID;
- optional update message from the operator;
- scheduled installation date when relevant;
- current panel, inverter and battery summary;
- quoted price, advance, balance, paid and remaining amounts;
- a status-specific next step.

Failed email deliveries remain visible and can be retried after correcting SMTP configuration.

## Project revision email

When customer-visible project details change, the edit screen can send a revision email. It lists changed fields and includes the latest system and commercial summary.

Internal-only notes and assignments do not trigger a customer email because they are not customer-visible changes.

## Deleting a project

Only an Administrator can delete a project.

The operator must:

1. enter a deletion reason;
2. type the complete project ID;
3. confirm the action.

Deletion removes the project from active `projects` and `projectOperations` collections, while preserving a protected recovery snapshot in `deletedProjects`. An append-only audit record stores the actor, reason, status, price and archive location.

This is intentionally an audited archive workflow rather than an unrecoverable browser delete.

## Customer workspace

Customers see only customer-safe information:

- current status and next step;
- panel, inverter and battery summary;
- quoted price and agreed advance;
- amount received and amount remaining;
- customer-safe payment receipts;
- status history and messages;
- scheduled installation date.

Customers do not receive inventory quantities, shortages, suppliers, product cost, margins, internal notes, employee assignments or administration information.

## Email configuration

Automatic project emails require these Netlify environment variables:

```text
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-sender-email@gmail.com
EMAIL_PASSWORD=your-google-app-password
EMAIL_FROM=ANT Solar <your-sender-email@gmail.com>
```

After changing environment variables, trigger a new Netlify deployment.

## Deployment

Deploy the application and matching Firestore Rules together:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

The updated rules make project creation, editing, status changes, payments and deletion server-only.

## Validation

Run:

```bash
npm run validate:rbac
npm run validate:session
npm run validate:ui-access
npm run validate:inventory
npm run validate:customer-privacy
npm run validate:operations
npm run lint
npm run build
```

The operations validator verifies permission-gated controls, out-of-stock equipment availability, 50–100% advance rules, revision checks, automatic status email, payment receipts, notification retries, audited deletion, server-only writes and customer-safe data boundaries.

## Operational test checklist

1. Open an existing project as an Analyst and verify no edit, payment or delete controls appear.
2. Open it as Project Manager and verify edit/payment/status controls appear but delete does not.
3. Open it as Administrator and verify all controls appear.
4. Select an out-of-stock inverter or battery and confirm the project saves with a visible internal warning and updated restock plan.
5. Attempt an incompatible battery bank and confirm the server rejects it.
6. Save advance terms at 50%, a custom rupee amount and 100%.
7. Record a partial payment and verify amount paid/due and customer receipt.
8. Change status through each allowed transition and verify email content and status history.
9. Break SMTP configuration, change status, confirm the project is still saved and retry appears.
10. Restore SMTP configuration and retry the failed email.
11. Try editing price after a payment and confirm it is blocked.
12. Delete a test project as Administrator and confirm it disappears from active projects and has an audit record.
13. Sign in as the customer and verify only customer-safe status, payment and scheduling details are visible.
