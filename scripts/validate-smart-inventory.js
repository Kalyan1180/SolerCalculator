const fs = require('fs');
const path = require('path');
const {
  buildInventoryPlan,
  projectStockPlan
} = require('../netlify/functions/_inventoryPlanning');

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
  "db.collection('inventory').get()",
  'buildInventoryPlan',
  'calculatorCatalog',
  'panels',
  'accessories'
]);
requireText('netlify/functions/getInventoryPlan.js', [
  "requirePermission(event, 'inventory.read')",
  'buildInventoryPlan'
]);
requireText('netlify/functions/getProjectStockPlan.js', [
  "requirePermission(event, 'projects.read')",
  'projectStockPlan'
]);
requireText('netlify/functions/migrateLegacyEquipment.js', [
  "requirePermission(event, 'inventory.write')",
  'legacySourceId'
]);
requireText('src/utils/inventoryRecommendation.js', [
  'buildSystemRecommendation',
  'billOfMaterials',
  'inventoryAssessment',
  'shortfall'
]);
requireText('src/models/projectModel.js', [
  'billOfMaterials',
  'inventoryAssessment',
  'sanitizeBomLine'
]);
requireText('src/components/ManageInventory.vue', [
  'getInventoryPlan',
  'recommendedOrder',
  'quotationShortfall',
  'Restock planner'
]);
requireText('src/components/SolerForm.vue', [
  'buildSystemRecommendation',
  'billOfMaterials',
  'Stock ready'
]);
requireText('src/components/ProjectApproval.vue', [
  'getProjectStockPlan',
  'Quotation Stock Readiness'
]);

const router = requireText('src/router.js', [
  "name: 'EquipmentCatalog'",
  "redirect: { name: 'ManageInventory' }"
]);
if (router.includes("import EquipmentCatalog")) fail('router still imports the removed duplicate equipment screen');

const navigation = source('src/constants/adminNavigation.js');
if (navigation.includes("routeName: 'EquipmentCatalog'")) fail('equipment is still exposed as a separate navigation module');
if (!navigation.includes('Smart Inventory & Equipment')) fail('unified inventory navigation title is missing');

const rules = requireText('firestore.rules', [
  'validInventoryItem',
  "match /inventory/{itemId}",
  "match /inverters/{itemId}",
  "match /batteries/{itemId}",
  'allow read, write: if false;'
]);
if (!rules.includes("request.resource.data.reorderPoint is int")) fail('Firestore does not validate restock policy fields');

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

const inventory = [{
  id: 'PANEL-1',
  itemId: 'PANEL-1',
  sku: 'PNL-001',
  type: 'panel',
  name: 'Panel',
  quantity: 5,
  reorderPoint: 2,
  targetStock: 4,
  leadTimeDays: 7,
  costPrice: 100,
  sellingPrice: 120,
  activeForCalculator: true,
  discontinued: false,
  specs: { wattage: 550 }
}];
const projects = [
  {
    projectId: 'COMMITTED',
    status: 'approved',
    billOfMaterials: [{ itemId: 'PANEL-1', type: 'panel', name: 'Panel', requiredQuantity: 4 }]
  },
  {
    projectId: 'QUOTE',
    status: 'quote_sent',
    billOfMaterials: [{ itemId: 'PANEL-1', type: 'panel', name: 'Panel', requiredQuantity: 3 }]
  }
];
const plan = buildInventoryPlan(inventory, projects);
const panel = plan.items[0];
if (panel.committedDemand !== 4) fail('committed demand aggregation is incorrect');
if (panel.quotationDemand !== 3) fail('quotation demand aggregation is incorrect');
if (panel.availableAfterCommitted !== 1) fail('available stock calculation is incorrect');
if (panel.quotationShortfall !== 2 || panel.projectedShortfall !== 2) fail('shortfall calculation is incorrect');
if (panel.recommendedOrder !== 6) fail(`recommended order expected 6 but received ${panel.recommendedOrder}`);

const quotePlan = projectStockPlan(projects[1], plan);
if (quotePlan.totalShortfall !== 2 || quotePlan.lines[0].availableQuantity !== 1) {
  fail('quotation-specific stock planning is incorrect');
}

console.log(
  `Smart inventory is valid: committed=${panel.committedDemand}, quotations=${panel.quotationDemand}, `
  + `shortfall=${panel.projectedShortfall}, recommended order=${panel.recommendedOrder}.`
);
