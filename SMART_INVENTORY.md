# ANT Solar Smart Inventory

## Purpose

Equipment and stock use the same Firestore `inventory` collection. An inverter, battery, panel, cable or mounting kit is entered once and can simultaneously provide:

- calculator technical specifications;
- purchasing and selling prices;
- on-hand stock;
- supplier and lead-time information;
- quotation and committed-project demand;
- stock shortfall and restock priority.

The old `inverters` and `batteries` collections are retained only as a temporary migration source. They are no longer editable by the application.

## Privacy boundary

Operational planning is confidential business information.

Customers and public visitors receive only:

- their calculated energy and peak-load requirement;
- recommended panel quantity;
- recommended inverter and battery configuration;
- required equipment quantities;
- estimated installed price and offer estimate.

They do **not** receive:

- on-hand or available quantities;
- committed-project or quotation demand;
- shortages, shortfalls or restock priority;
- supplier, lead-time, SKU or purchasing information;
- cost price, labour cost, margin or profit data;
- administration links or administration-route error messages.

The public calculator calls `recommendSystem`, which performs planning with the Firebase Admin SDK and returns a sanitized customer response. Detailed planning fields never enter the customer browser state. The older detailed `getData` endpoint now requires `inventory.read`.

A full recommendation is stored temporarily in the server-only `recommendations` collection. The browser receives only an unpredictable recommendation reference. When the customer submits a request, the authenticated `createQuotation` function consumes that reference and creates the project with the protected bill of materials. Browser clients cannot create projects directly.

## Inventory record

Every managed item contains these common fields:

| Field | Purpose |
|---|---|
| `itemId` | Firestore document ID and immutable item identity |
| `sku` | Human-facing unique stock code |
| `type` | `panel`, `inverter`, `battery`, `wiring`, `mounting` or `other` |
| `name` | Display and quotation name |
| `costPrice` / `sellingPrice` | Costing and margin calculation |
| `quantity` | Physical on-hand quantity |
| `reorderPoint` | Low-stock trigger after committed demand |
| `targetStock` | Desired closing stock after known demand is covered |
| `leadTimeDays` | Supplier lead time used in urgency scoring |
| `supplier` | Purchasing source |
| `unit` | Piece, kit, set or meter |
| `activeForCalculator` | Allows the recommendation engine to select the item |
| `discontinued` | Removes the item from recommendations and restock orders |
| `specs` | Type-specific technical attributes |

### Technical specifications

- **Panel:** wattage and technology.
- **Inverter:** peak load in KVA, maximum panel count and supported battery-bank voltage. Battery voltage `0` represents a grid-tie/no-battery system.
- **Battery:** Ah capacity, usable kWh and nominal voltage.
- **Accessories:** fixed quantity per system, quantity per panel and whether to include automatically.

An item cannot be enabled for calculator use until its required technical values are present.

## Recommendation behaviour

The server first identifies technically compatible equipment, then ranks candidates by:

1. shortfall after committed-project demand;
2. whether the record is a temporary legacy fallback;
3. total equipment cost.

Out-of-stock equipment can still be selected internally when it is the best or only technically valid option. Customers receive the valid system requirement without operational availability commentary. Authorized project and inventory workspaces show the detailed quantities and purchasing implications.

The generated quotation stores an immutable `billOfMaterials` snapshot so later catalogue edits do not silently change an existing quotation.

## Demand classification

| Project status | Planning treatment |
|---|---|
| `approved` | Committed demand |
| `installation_scheduled` | Committed demand |
| `in_progress` | Committed demand |
| `quote_pending` | Forecast quotation demand |
| `quote_sent` | Forecast quotation demand |
| `quote_rejected` | Excluded |
| `completed` | Excluded from future demand |
| `cancelled` | Excluded |

Definitions:

```text
available after committed = max(0, on hand - committed demand)
committed shortfall       = max(0, committed demand - on hand)
quotation shortfall       = max(0, quotation demand - available after committed)
projected shortfall       = max(0, committed + quotation demand - on hand)
recommended order         = max(0, committed + quotation demand + target stock - on hand)
```

## Restock priority

Every inventory item receives a score and one of four priorities:

- **Critical:** committed projects cannot be supplied, or an urgent zero-stock demand exists.
- **High:** quotations produce a material projected shortage.
- **Medium:** stock is at/below the reorder point or the projected balance is below target.
- **Low:** sufficient stock remains and only routine replenishment may be appropriate.

The score also increases for longer supplier lead times and more urgent project statuses. The Restock Planner is ordered by this score, then shortfall.

The recommendation quantity restores stock to the configured target **after both committed and current quotation demand are covered**. This intentionally provides a safety buffer rather than ordering only the immediate shortage.

## Project supply readiness

Every new calculator or managed-project quotation stores its internal BOM. The authorized project workspace recalculates live availability and shows:

- each required SKU;
- quantity needed for the quotation;
- quantity available after other committed projects;
- project-specific shortfall;
- current restock priority.

Older projects that have no inventory IDs cannot be reliably matched by name. They are marked **Inventory mapping required** instead of using unsafe fuzzy matching.

## Managed-project workflow

The administration managed-project form uses `recommendSystem` with `mode: staff`. The request requires `projects.create` or `inventory.read`, and the response may include internal planning details. The resulting recommendation is bound to the staff user and can be consumed only by that same identity.

## Migrating existing equipment

1. Merge and deploy the application.
2. Deploy the matching Firestore Rules.
3. Sign in as an administrator or inventory manager.
4. Open **Smart Inventory & Equipment**.
5. Select **Import legacy equipment** once.
6. Enter the real quantity, supplier, reorder point, target stock and lead time for every imported record.
7. Add at least one real panel inventory item and enable it for calculator use.
8. Add optional cables, mounting or accessories and configure automatic quantities.

Imported records deliberately start at quantity `0`; the old catalogue had prices and specifications but no trustworthy physical stock count.

## Firestore Rules deployment

This change updates the inventory schema, blocks browser project creation, protects recommendation drafts and disables browser writes to old equipment collections. Publish the rules after merging:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
```

Deploying only the Netlify frontend is not sufficient.

## Validation

Run:

```bash
npm run validate:rbac
npm run validate:session
npm run validate:ui-access
npm run validate:inventory
npm run validate:customer-privacy
npm run lint
npm run build
```

The privacy validator checks that public calculator and quotation pages contain no operational availability, purchasing, cost or administration details; that detailed planning endpoints require authorization; and that project creation goes through the protected server workflow.

## Operational test matrix

1. Add an enabled panel, inverter and battery.
2. Calculate as a signed-out visitor and confirm only system requirements and customer pricing are shown.
3. Inspect the public recommendation response and confirm it contains no SKU, quantity-on-hand, availability, shortfall, supplier, cost or margin fields.
4. Sign in as a customer and submit the requirement; confirm the project contains the internal BOM while the customer page does not show operational planning.
5. Visit an administration URL as a customer and confirm the application returns to the public home page without an administration-specific message.
6. Generate a managed-project recommendation as a project manager and confirm authorized shortage details are visible.
7. Approve the project and confirm demand moves from quotation to committed without being double-counted.
8. Verify Restock Planner rank, recommended order, supplier and lead time.
9. Complete or cancel a project and confirm its future demand is removed.
10. Confirm an analyst sees planning information but no add, edit, delete or migration controls.
11. Confirm discontinued items disappear from recommendations and restock orders.
