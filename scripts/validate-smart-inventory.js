const fs = require('fs');
const path = require('path');
const {
  buildInventoryPlan,
  projectStockPlan
} = require('../netlify/functions/_inventoryPlanning');
const { buildSystemRecommendation } = require('../netlify/functions/_systemRecommendation');
const {
  calculateTerms,
  equipmentOptions,
  paymentStatusFor
} = require('../netlify/functions/_projectWorkflow');

const root = path.resolve(__dirname, '..');

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  throw new Error(`Smart inventory validation failed: ${message}`);
}

function requireText(relativePath, snippets) {
  const fileSource = source(relativePath);
  snippets.forEach(snippet => {
    if (!fileSource.includes(snippet)) fail(`${relativePath} is missing ${snippet}`);
  });
  return fileSource;
}

const inventoryModel = requireText('src/models/inventoryModel.js', [
  'activeForCalculator',
  'reorderPoint',
  'targetStock',
  'leadTimeDays',
  'normalizeSpecs',
  'calculatorEligible'
]);
if (inventoryModel.includes("collection(db, 'inverters')") || inventoryModel.includes("collection(db, 'batteries')")) {
  fail('client inventory model still writes separate equipment collections');
}

requireText('netlify/functions/getData.js', [
  "requirePermission(event, 'inventory.read')",
  "db.collection('inventory').get()",
  "db.collection('projectOperations').get()",
  'mergeProjectOperations',
  'buildInventoryPlan',
  'calculatorCatalog'
]);
requireText('netlify/functions/recommendSystem.js', [
  'buildInventoryPlan',
  'calculatorCatalog',
  'buildSystemRecommendation',
  'customerRecommendation',
  "db.collection('projectOperations').get()",
  'mergeProjectOperations'
]);
requireText('netlify/functions/createQuotation.js', [
  'billOfMaterials: recommendation.billOfMaterials',
  'inventoryAssessment: recommendation.inventoryAssessment',
  "db.collection('projectOperations').doc(projectId)",
  'advancePercentage',
  'amountPaid',
  'revision'
]);
requireText('netlify/functions/getProjectWorkspace.js', [
  "requirePermission(event, 'projects.read')",
  'equipmentOptions',
  'projectStockPlan',
  'notifications'
]);
requireText('netlify/functions/updateProjectDetails.js', [
  "requirePermission(event, 'projects.update')",
  'buildEditedSystem',
  'PAYMENTS_LOCK_COMMERCIALS',
  'customerVisibleChanges'
]);
requireText('netlify/functions/updateProjectStatus.js', [
  "requirePermission(event, 'projects.update')",
  'STATUS_TRANSITIONS',
  'sendProjectNotification',
  'statusHistory'
]);
requireText('netlify/functions/recordProjectPayment.js', [
  "requirePermission(event, 'projects.payments')",
  'PAYMENT_EXCEEDS_BALANCE',
  'paymentLedger',
  'paymentStatusFor'
]);
requireText('netlify/functions/deleteProject.js', [
  "requirePermission(event, 'projects.delete')",
  "db.collection('deletedProjects').doc(projectId)",
  'transaction.delete(projectRef)'
]);
requireText('netlify/functions/retryProjectNotification.js', [
  "requirePermission(event, 'notifications.send')",
  'sendProjectNotification'
]);
requireText('src/components/ManageInventory.vue', [
  'getInventoryPlan',
  'recommendedOrder',
  'quotationShortfall',
  'Restock planner'
]);
requireText('src/components/ProjectApproval.vue', [
  '/.netlify/functions/getProjectWorkspace',
  '/.netlify/functions/updateProjectDetails',
  '/.netlify/functions/updateProjectStatus',
  '/.netlify/functions/recordProjectPayment',
  'Quotation stock readiness',
  'Out of stock'
]);

const router = requireText('src/router.js', [
  "name: 'EquipmentCatalog'",
  "redirect: { name: 'ManageInventory' }"
]);
if (router.includes('import EquipmentCatalog')) fail('router still imports the removed duplicate equipment screen');

const navigation = source('src/constants/adminNavigation.js');
if (navigation.includes("routeName: 'EquipmentCatalog'")) fail('equipment is still exposed as a separate navigation module');
if (!navigation.includes('Smart Inventory & Equipment')) fail('unified inventory navigation title is missing');

const rules = requireText('firestore.rules', [
  'validInventoryItem',
  "match /inventory/{itemId}",
  "match /projectOperations/{projectId}",
  "match /projectNotifications/{notificationId}",
  "match /deletedProjects/{projectId}",
  'allow create, update, delete: if false;'
]);
if (!rules.includes('request.resource.data.reorderPoint is int')) fail('Firestore does not validate restock policy fields');

[
  'src/components/EquipmentCatalog.vue',
  'netlify/functions/addInverter.js',
  'netlify/functions/updateInverter.js',
  'netlify/functions/deleteInverter.js',
  'netlify/functions/addBattery.js',
  'netlify/functions/updateBattery.js',
  'netlify/functions/deleteBattery.js'
].forEach(relativePath => {
  if (fs.existsSync(path.join(root, relativePath))) fail(`${relativePath} must be removed to preserve one source of truth`);
});

const inventory = [
  {
    id: 'PANEL-1', itemId: 'PANEL-1', sku: 'PNL-001', type: 'panel', name: 'Panel',
    quantity: 5, reorderPoint: 2, targetStock: 4, leadTimeDays: 7,
    costPrice: 100, sellingPrice: 120, activeForCalculator: true, discontinued: false,
    specs: { wattage: 550 }
  },
  {
    id: 'INV-1', itemId: 'INV-1', sku: 'INV-001', type: 'inverter', name: 'Inverter',
    quantity: 0, reorderPoint: 1, targetStock: 2, leadTimeDays: 7,
    costPrice: 500, sellingPrice: 600, activeForCalculator: true, discontinued: false,
    specs: { peakLoad: 3, maxPanels: 6, batterySupported: 0 }
  }
];
const projects = [
  { projectId: 'COMMITTED', status: 'approved', billOfMaterials: [{ itemId: 'PANEL-1', type: 'panel', name: 'Panel', requiredQuantity: 4 }] },
  { projectId: 'QUOTE', status: 'quote_sent', billOfMaterials: [{ itemId: 'PANEL-1', type: 'panel', name: 'Panel', requiredQuantity: 3 }] }
];
const plan = buildInventoryPlan(inventory, projects);
const panel = plan.items.find(item => item.id === 'PANEL-1');
if (panel.committedDemand !== 4) fail('committed demand aggregation is incorrect');
if (panel.quotationDemand !== 3) fail('quotation demand aggregation is incorrect');
if (panel.availableAfterCommitted !== 1) fail('available stock calculation is incorrect');
if (panel.quotationShortfall !== 2 || panel.projectedShortfall !== 2) fail('shortfall calculation is incorrect');
if (panel.recommendedOrder !== 6) fail(`recommended order expected 6 but received ${panel.recommendedOrder}`);

const quotePlan = projectStockPlan(projects[1], plan);
if (quotePlan.totalShortfall !== 2 || quotePlan.lines[0].availableQuantity !== 1) fail('quotation-specific stock planning is incorrect');

const options = equipmentOptions(plan);
if (!options.inverters.some(item => item.id === 'INV-1' && item.outOfStock)) {
  fail('out-of-stock equipment is missing from project edit options');
}

const recommendation = buildSystemRecommendation({
  unitPerDay: 4,
  peakLoad: 2,
  panelCount: 4,
  catalog: plan.items.map(item => ({ ...item, inventoryId: item.id, availableQuantity: item.availableAfterCommitted }))
});
if (!recommendation.success) fail(`server-side recommendation failed: ${recommendation.error}`);
if (recommendation.billOfMaterials.length !== 2) fail('server-side recommendation bill of materials is incomplete');

const fifty = calculateTerms({ quotedPrice: 100000, advancePercentage: 50 });
const hundred = calculateTerms({ quotedPrice: 100000, advanceAmount: 100000, mode: 'amount' });
if (fifty.advanceAmount !== 50000 || fifty.balanceAmount !== 50000) fail('50% advance terms are incorrect');
if (hundred.advancePercentage !== 100 || hundred.balanceAmount !== 0) fail('100% advance terms are incorrect');
let invalidAdvanceRejected = false;
try { calculateTerms({ quotedPrice: 100000, advancePercentage: 49 }); } catch (error) { invalidAdvanceRejected = error.code === 'INVALID_ADVANCE'; }
if (!invalidAdvanceRejected) fail('advance below 50% was not rejected');
if (paymentStatusFor(50000, 100000, 50000) !== 'advance_paid') fail('advance payment status is incorrect');
if (paymentStatusFor(100000, 100000, 50000) !== 'balance_paid') fail('full payment status is incorrect');

console.log(`Smart operations valid: shortfall=${panel.projectedShortfall}, order=${panel.recommendedOrder}, out-of-stock options preserved, flexible advances validated.`);
