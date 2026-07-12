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

const contactPage = requireText('src/components/ContactPage.vue', [
  '/.netlify/functions/sendEnquiry',
  'Send an enquiry',
  'enquiryId'
]);
if (contactPage.includes("fetch('/',")) fail('contact page still depends on the unreliable SPA root form post');
requireText('netlify/functions/sendEnquiry.js', [
  "db.collection('enquiries')",
  'replyTo: enquiry.email',
  'emailDelivery',
  'CONTACT_TO'
]);

const inventoryModel = requireText('src/models/inventoryModel.js', [
  "const PANEL_TYPES = new Set(['bifacial', 'non_bifacial'])",
  'normalizePanelType',
  'normalized.panelType'
]);
if (!inventoryModel.includes('non_bifacial')) fail('non-bifacial inventory category is missing');
requireText('src/components/ManageInventory.vue', [
  'Panel category',
  'Bifacial',
  'Non-bifacial',
  '/.netlify/functions/seedPanelTypes'
]);
requireText('netlify/functions/seedPanelTypes.js', [
  'PANEL-BIFACIAL-STARTER',
  'PANEL-NON-BIFACIAL-STARTER',
  "panelType: 'bifacial'",
  "panelType: 'non_bifacial'",
  "requirePermission(event, 'inventory.write')"
]);

const workspace = requireText('src/components/ProjectApproval.vue', [
  'v-if="canUpdateProject"',
  'v-if="canManagePayments"',
  'v-if="canDeleteProject"',
  'optionLabel(item',
  'Out of stock',
  'advanceMode',
  'advancePercentage',
  'advanceAmount',
  'SiteSurveyPanel',
  'Send quotation with PDF',
  'Approve and email invoice',
  'PDF receipt',
  '/.netlify/functions/updateProjectDetails',
  '/.netlify/functions/updateProjectStatus',
  '/.netlify/functions/recordProjectPayment',
  '/.netlify/functions/deleteProject',
  '/.netlify/functions/retryProjectNotification'
]);
if (workspace.includes("from '@/models/projectModel'")) {
  fail('project workspace bypasses server-only mutation functions');
}

requireText('src/components/SiteSurveyPanel.vue', [
  '/.netlify/functions/updateSiteSurvey',
  'Schedule survey',
  'Mark survey complete',
  'Technical findings'
]);
requireText('netlify/functions/updateSiteSurvey.js', [
  "requirePermission(event, 'projects.update')",
  "action === 'schedule'",
  "action === 'complete'",
  'siteSurveyStatus',
  'siteSurveyHistory',
  "type: action === 'schedule' ? 'site_survey_scheduled' : 'site_survey_completed'",
  'sendProjectNotification(notification)'
]);

requireText('netlify/functions/getProjectWorkspace.js', [
  "requirePermission(event, 'projects.read')",
  'equipmentOptions',
  'projectStockPlan',
  'canSeedPanels',
  'panelModels'
]);
requireText('netlify/functions/updateProjectDetails.js', [
  "requirePermission(event, 'projects.update')",
  'expectedRevision',
  'PAYMENTS_LOCK_COMMERCIALS',
  'activityLog',
  "action: 'project.updated'"
]);
const statusFunction = requireText('netlify/functions/updateProjectStatus.js', [
  "requirePermission(event, 'projects.update')",
  'STATUS_TRANSITIONS',
  'statusHistory',
  'sendProjectNotification(notification)',
  "type: 'status_changed'",
  'SITE_SURVEY_REQUIRED',
  "project.siteSurveyStatus !== 'completed'",
  'attachmentName'
]);
if (!statusFunction.includes("newStatus === 'approved'")) fail('approval does not enforce the survey gate');

requireText('netlify/functions/recordProjectPayment.js', [
  "requirePermission(event, 'projects.payments')",
  'PAYMENT_EXCEEDS_BALANCE',
  'paymentHistory',
  'paymentLedger',
  "type: 'payment_received'",
  'attachmentName'
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
  "status: 'failed'",
  'attachmentName'
]);

const documents = requireText('netlify/functions/_projectDocuments.js', [
  'quotationAttachment',
  'invoiceAttachment',
  'receiptAttachment',
  "notification.payload?.newStatus === 'quote_sent'",
  "notification.payload?.newStatus === 'approved'",
  "notification.type === 'payment_received'",
  "contentType: 'application/pdf'"
]);
if (!documents.includes('PDFDocument')) fail('server-side PDF generation is missing');

const mailer = requireText('netlify/functions/_projectMailer.js', [
  'statusEmail(notification)',
  'projectChangedEmail(notification)',
  'paymentEmail(notification)',
  'surveyEmail(notification)',
  'includeSystemSummary',
  'includeCommercialSummary',
  'attachmentForNotification(notification)',
  'attachments: attachment ? [attachment] : []',
  'Next step'
]);
if (mailer.includes('${commercialRows(project)}</table>\n        ${nextStep')) {
  fail('commercial summary appears to be unconditional');
}

const privacy = requireText('netlify/functions/_projectPrivacy.js', [
  'amountPaid',
  'amountDue',
  'sanitizePaymentHistory',
  'sanitizeStatusHistory',
  'sanitizeSurveyHistory',
  'siteSurveyStatus',
  'panelType'
]);
const customerSanitizer = privacy.slice(
  privacy.indexOf('function sanitizeCustomerProject'),
  privacy.indexOf('function mergeProjectOperations')
);
['adminNotes', 'technicalNotes', 'billOfMaterials', 'inventoryAssessment', 'materialCost', 'siteSurvey:'].forEach(field => {
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
  'Site survey',
  'amountPaid(project)',
  'statusHistory',
  'siteSurveyStatus'
]);
['inventory', 'shortfall', 'supplier', 'adminNotes', 'technicalNotes', 'siteSurvey.findings'].forEach(term => {
  if (customerWorkspace.toLowerCase().includes(term.toLowerCase())) {
    fail(`customer workspace exposes internal term ${term}`);
  }
});

console.log('Project operations are valid: enquiry intake, panel categories, mandatory survey, selective summaries and event-specific PDF emails are enforced.');
