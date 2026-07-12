const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  throw new Error(`Customer privacy validation failed: ${message}`);
}

function requireText(relativePath, snippets) {
  const fileSource = source(relativePath);
  snippets.forEach(snippet => {
    if (!fileSource.includes(snippet)) fail(`${relativePath} is missing ${snippet}`);
  });
  return fileSource;
}

const publicComponents = [
  'src/components/SolerForm.vue',
  'src/components/SubmitQuotation.vue'
];
const prohibitedPublicLanguage = [
  /\binventory\b/i,
  /\bstock\b/i,
  /\bshortage\b/i,
  /\bshortfall\b/i,
  /\brestock/i,
  /\breorder/i,
  /\bsupplier\b/i,
  /\badministration\b/i,
  /\badmin dashboard\b/i,
  /\binternal cost\b/i
];
const prohibitedPublicDataIdentifiers = [
  'inventoryAssessment',
  'billOfMaterials',
  'availableQuantity',
  'shortfall',
  'stockStatus',
  'unitCost',
  'materialCost',
  'laborCost',
  'costWithout',
  'profitPercentage'
];

for (const relativePath of publicComponents) {
  const fileSource = source(relativePath);
  prohibitedPublicLanguage.forEach(pattern => {
    if (pattern.test(fileSource)) fail(`${relativePath} exposes internal operational language: ${pattern}`);
  });
  prohibitedPublicDataIdentifiers.forEach(identifier => {
    if (fileSource.includes(identifier)) fail(`${relativePath} references protected field ${identifier}`);
  });
}

const calculatorSource = requireText('src/components/SolerForm.vue', [
  '/.netlify/functions/recommendSystem',
  "mode: 'customer'",
  'recommendationId',
  'recommendation.requirements',
  'Calculate my requirement',
  'Request a quotation'
]);
if (calculatorSource.includes('/.netlify/functions/getData')) {
  fail('public calculator still downloads detailed planning data');
}
if (calculatorSource.includes('@/constants/rbac') || calculatorSource.includes('rbacMixin')) {
  fail('public calculator contains staff-role presentation logic');
}

const quotationSource = requireText('src/components/SubmitQuotation.vue', [
  '/.netlify/functions/createQuotation',
  'recommendationId: this.solerResults.recommendationId',
  'managedProject: false'
]);
if (quotationSource.includes("from '@/models/projectModel'")) {
  fail('customer quotation page bypasses the protected server workflow');
}

requireText('netlify/functions/getData.js', [
  "requirePermission(event, 'inventory.read')"
]);
requireText('netlify/functions/recommendSystem.js', [
  "mode === 'staff'",
  "requireAnyPermission(event, ['projects.create', 'inventory.read'])",
  'customerRecommendation(fullRecommendation, recommendationId, input)',
  'return jsonResponse(200, { recommendation: publicView })'
]);
requireText('netlify/functions/createQuotation.js', [
  'const authorization = await authorize(event)',
  "db.collection('recommendations').doc(recommendationId)",
  'stored.fullRecommendation',
  'transaction.set(projectRef, newProject)',
  'transaction.update(recommendationRef'
]);

const recommendationCore = requireText('netlify/functions/_systemRecommendation.js', [
  'function publicRequirement(line)',
  'function customerRecommendation(fullRecommendation, recommendationId, calculationInput)',
  'requirements: fullRecommendation.billOfMaterials.map(publicRequirement)'
]);
const publicRequirementBody = recommendationCore.slice(
  recommendationCore.indexOf('function publicRequirement(line)'),
  recommendationCore.indexOf('function customerRecommendation')
);
['itemId', 'sku', 'availableQuantity', 'shortfall', 'stockStatus', 'unitCost', 'sellingPrice'].forEach(field => {
  if (publicRequirementBody.includes(field)) fail(`public requirement serializer exposes ${field}`);
});

const rulesSource = requireText('firestore.rules', [
  'match /recommendations/{recommendationId}',
  'allow read, write: if false;',
  'allow create: if false;'
]);
if (!rulesSource.includes('createQuotation Netlify function')) {
  fail('Firestore project creation policy is not documented as server-only');
}

const routerSource = requireText('src/router.js', [
  "if (isAdministrationRoute && !currentUser) return { name: 'Home' }",
  '!hasPermission(routeAccess, PERMISSIONS.DASHBOARD_ACCESS)'
]);
if (!routerSource.includes("return { name: 'Home' }")) {
  fail('customer administration route concealment is missing');
}

console.log('Customer privacy is valid: public requirement views contain no operational availability, purchasing, pricing-cost or administration details.');
