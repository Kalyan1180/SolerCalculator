# ANT Solar Enterprise UI and UX Standards

## Purpose

The ANT Solar interface uses one visual system across the public website, customer workspace and administration console. The design prioritizes clarity, responsive operation, accessible interaction and least-privilege visibility.

Frontend visibility is not the security boundary. Vue Router, Netlify functions and Firestore Security Rules continue to enforce authorization. Hiding unauthorized items prevents confusion and accidental disclosure of unavailable workflows.

## Application layouts

### Public and customer layout

The public layout provides:

- a sticky, responsive navigation bar;
- clear sign-in and account actions;
- marketing pages with consistent typography, spacing and calls to action;
- customer calculator, quotation and project-tracking workflows;
- an administration link only when the signed-in user has `dashboard.access`.

### Administration layout

The administration console provides:

- a fixed desktop sidebar and mobile navigation drawer;
- sticky page context and account controls;
- route-aware page title and description;
- grouped modules for workspace, operations, intelligence and security;
- role information without exposing internal permission codes;
- responsive content suitable for desktop, tablet and mobile use.

## Permission-driven visibility

The canonical admin navigation model is stored in:

```text
src/constants/adminNavigation.js
```

Every module has an explicit RBAC permission. Both the sidebar and dashboard overview filter the same navigation model using `can(permission)`.

Unauthorized modules are not rendered. They are not displayed as disabled cards, menu items or placeholder messages.

Examples:

| UI capability | Required permission |
|---|---|
| Administration entry | `dashboard.access` |
| Project portfolio | `projects.read` |
| Create project | `projects.create` |
| Update project status and notes | `projects.update` |
| Record payments | `projects.payments` |
| Generate project documents | `projects.documents` |
| Send customer notifications | `notifications.send` |
| View stock inventory | `inventory.read` |
| Change stock inventory | `inventory.write` |
| View calculator equipment | `equipment.read` |
| Change calculator equipment | `equipment.write` |
| View analytics | `analytics.read` |
| View users | `users.read` |
| Assign roles | `users.roles.write` |
| Revoke sessions | `users.sessions.revoke` |
| View security audit | `audit.read` |

A user with read-only access sees the permitted information but does not see unavailable create, edit, delete, payment, document, notification or security controls.

Directly entering an unauthorized URL is still denied by the router and backend security layers.

## Design system

The global design tokens and component rules are stored in:

```text
src/assets/styles/enterprise.css
```

The system defines:

- brand, semantic and neutral colors;
- spacing and border-radius conventions;
- card and overlay shadows;
- button, form, table, badge and alert styles;
- public navigation and marketing patterns;
- administration shell and sidebar patterns;
- responsive behaviour and reduced-motion support.

Components should use CSS variables such as:

```css
var(--ant-blue-700)
var(--ant-slate-500)
var(--ant-radius-md)
var(--ant-shadow-sm)
```

Avoid introducing unrelated color palettes, arbitrary shadows or one-off page backgrounds.

## Page conventions

### Headers

Administration pages receive their title and supporting description from Vue Router metadata. Page content should start with task-specific actions or summaries instead of repeating a large marketing-style title.

### Forms

- Always use visible labels.
- Mark required fields in supporting copy where appropriate.
- Keep related fields in logical cards or numbered sections.
- Place the primary action first and provide an explicit cancel/back action.
- Display loading state and prevent duplicate submission.
- Preserve entered values when a recoverable error occurs.

### Data lists

- Provide search and relevant filters for operational tables.
- Keep action columns hidden when the user lacks the corresponding permission.
- Use meaningful empty states instead of blank tables.
- Format Indian currency using `Intl.NumberFormat('en-IN')`.
- Keep destructive actions visually distinct and confirm them before execution.

### Status and feedback

- Use semantic chips for status rather than raw codes.
- Show success and failure messages close to the workflow.
- Do not expose internal permission identifiers or stack traces to users.
- Session expiry uses a persistent, accessible warning with countdown and explicit actions.

## Responsive behaviour

The interface supports:

- desktop administration with a fixed sidebar;
- tablet and mobile administration with a drawer and backdrop;
- horizontally scrollable operational tables;
- stacked form grids on narrow displays;
- mobile-safe buttons and touch targets;
- reduced animations when the operating system requests reduced motion.

## Automated validation

Run:

```bash
npm run validate:rbac
npm run validate:session
npm run validate:ui-access
npm run lint
npm run build
```

`validate:ui-access` checks that:

- every central navigation permission exists;
- all major protected modules are represented in the navigation model;
- the sidebar and overview filter modules by permission;
- the public account menu hides administration without dashboard access;
- Vue components do not use legacy hard-coded administrator access checks;
- sensitive project, inventory, equipment and user actions have explicit visibility guards;
- administration routes use permission metadata and the administration layout.

GitHub Actions runs the same validation for pull requests and protected branches.

## Manual test matrix

Test at least these roles after a UI or RBAC change:

### Administrator

- sees every administration module;
- sees every authorized create, update, payment, document, notification and security action;
- can use role and session administration.

### Project Manager

- sees Overview and Projects;
- does not see Inventory, Equipment, Analytics, Users or Audit;
- sees project update, payment, document and notification actions;
- does not see inventory or security actions.

### Inventory Manager

- sees Overview, Stock Inventory and Equipment Catalog;
- does not see Projects, Analytics, Users or Audit;
- sees stock and equipment editing controls.

### Analyst

- sees Overview, Projects, Inventory, Equipment and Analytics;
- does not see Users or Audit;
- does not see create, edit, delete, payment, document or notification controls.

### Customer

- does not see the Administration link;
- can use the calculator and quotation workflow;
- sees only their own customer projects.
