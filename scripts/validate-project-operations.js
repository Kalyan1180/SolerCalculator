const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  throw new Error(`Project operations validation failed: ${message}`);
}

function requireText(relativePath, snippets) {
  const value = source(relativePath);
  snippets.forEach(snippet => {
    if (!value.includes(snippet)) fail(`${relativePath} is missing ${snippet}`);
  });
  return value;
}

const workspace = requireText('src/components/ProjectApproval.vue', [
  'v-if="canUpdateProject"',
  'v-if="canManagePayments"',
  'v-if="canDeleteProject"',
  'optionLabel(item',
  'Out of stock',
  'advanceMode',
  'advancePercentage',
  'advanceAmount',
  '/.netlify/functions/updateProjectDetails',
  '/.netlify/functions/updateProjectStatus',
  '/.netlify/functions/recordProjectPayment',
  '/.netlify/functions/deleteProject',
  '/.netlify/functions/retryProjectNotification'
]);
if (workspace.includes("from '@/models/projectModel'")) {
  fail('project workspace bypasses server-only mutation functions');
}

requireText('netlify/functions/getProjectWorkspace.js', [
  "requirePermission(event, 'projects.read')",
  'equipmentOptions',
  'projectStockPlan',
  'capabilities'
]);
requireText('netlify/functions/updateProjectDetails.js', [
  "requirePermission(event, 'projects.update')",
  'expectedRevision',
  'PAYMENTS_LOCK_COMMERCIALS',
  'activityLog',
  "action: 'project.updated'"
]);
requireText('netlify/functions/updateProjectStatus.js', [
  "requirePermission(event, 'projects.update')",
  'STATUS_TRANSITIONS',
  'statusHistory',
  'sendProjectNotification(notification)',
  "type: 'status_changed'"
]);
requireText('netlify/functions/recordProjectPayment.js', [
  "requirePermission(event, 'projects.payments')",
  'PAYMENT_EXCEEDS_BALANCE',
  'paymentHistory',
  'paymentLedger',
  "type: 'payment_received'"
]);
requireText('netlify/functions/deleteProject.js', [
  "requirePermission(event, 'projects.delete')",
  'confirmation !== projectId',
  "db.collection('deletedProjects').doc(projectId)",
  "action: 'project.deleted'"
]);
requireText('netlify/functions/retryProjectNotification.js', [
  "requirePermission(event, 'notifications.send')",
  'sendProjectNotification(notification)',
  "status: 'failed'"
]);
requireText('netlify/functions/_projectMailer.js', [
  'statusEmail(notification)',
  'projectChangedEmail(notification)',
  'paymentEmail(notification)',
  'System summary',
  'Commercial summary',
  'Next step'
]);

const privacy = requireText('netlify/functions/_projectPrivacy.js', [
  'amountPaid',
  'amountDue',
  'sanitizePaymentHistory',
  'sanitizeStatusHistory'
]);
const customerSanitizer = privacy.slice(
  privacy.indexOf('function sanitizeCustomerProject'),
  privacy.indexOf('function mergeProjectOperations')
);
['adminNotes', 'technicalNotes', 'billOfMaterials', 'inventoryAssessment', 'materialCost'].forEach(field => {
  if (customerSanitizer.includes(field)) fail(`customer sanitizer exposes ${field}`);
});

const rules = requireText('firestore.rules', [
  'match /projects/{projectId}',
  'match /projectOperations/{projectId}',
  'match /projectNotifications/{notificationId}',
  'match /deletedProjects/{projectId}',
  'allow create: if false;',
  'allow update: if false;',
  'allow delete: if false;'
]);
if (!rules.includes('All later editing')) fail('server-only project mutation boundary is not documented');

const customerWorkspace = requireText('src/components/CustomerProjects.vue', [
  'Payment summary',
  'Project updates',
  'amountPaid(project)',
  'statusHistory'
]);
['inventory', 'shortfall', 'supplier', 'adminNotes', 'technicalNotes'].forEach(term => {
  if (customerWorkspace.toLowerCase().includes(term.toLowerCase())) {
    fail(`customer workspace exposes internal term ${term}`);
  }
});

console.log('Project operations are valid: editable systems, flexible payments, audited deletion, automatic email and customer-safe progress tracking are enforced.');
