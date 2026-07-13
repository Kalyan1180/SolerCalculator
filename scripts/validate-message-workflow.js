const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  throw new Error(`Message workflow validation failed: ${message}`);
}

function requireText(relativePath, snippets) {
  const value = read(relativePath);
  snippets.forEach(snippet => {
    if (!value.includes(snippet)) fail(`${relativePath} is missing ${snippet}`);
  });
  return value;
}

const submission = requireText('netlify/functions/sendEnquiry.js', [
  "db.collection('enquiries')",
  "status: 'new'",
  "priority: 'normal'",
  'activityHistory',
  'ipHash',
  'serverTimestamp()'
]);
[
  'nodemailer',
  'createTransport',
  'sendMail(',
  'EMAIL_HOST',
  'EMAIL_PASSWORD',
  'CONTACT_TO',
  'emailDelivery'
].forEach(forbidden => {
  if (submission.includes(forbidden)) fail(`contact submission must not contain automatic email code: ${forbidden}`);
});

requireText('netlify/functions/listEnquiries.js', [
  "requirePermission(event, 'messages.read')",
  ".collection('enquiries')",
  ".orderBy('createdAt', 'desc')",
  'limit(500)',
  'summary'
]);
requireText('netlify/functions/updateEnquiry.js', [
  "requirePermission(event, 'messages.manage')",
  "new Set(['new', 'in_progress', 'contacted', 'resolved', 'spam'])",
  "new Set(['low', 'normal', 'high', 'urgent'])",
  'internalNotes',
  'activityHistory',
  "action: 'contact.message.updated'"
]);

const inbox = requireText('src/components/MessageInbox.vue', [
  'Message Inbox',
  'filteredMessages',
  'filters: { search:',
  'v-if="canManageMessages"',
  'PERMISSIONS.MESSAGES_MANAGE',
  '/.netlify/functions/listEnquiries',
  '/.netlify/functions/updateEnquiry',
  'Open email client',
  'No automatic customer email is sent'
]);
if (inbox.includes('sendEmail') || inbox.includes('sendMail')) {
  fail('message inbox must use explicit operator actions rather than automatic email delivery');
}

const contact = requireText('src/components/ContactPage.vue', [
  'Submit enquiry',
  'Recording enquiry',
  'team inbox',
  '/.netlify/functions/sendEnquiry'
]);
if (/email notification|sent to the ANT Solar team/i.test(contact)) {
  fail('contact page still implies an automatic email notification');
}

const rbac = JSON.parse(read('config/rbac.json'));
if (!rbac.permissions['messages.read'] || !rbac.permissions['messages.manage']) {
  fail('message permissions are missing from RBAC');
}
const projectManagerPermissions = rbac.roles?.project_manager?.permissions || [];
if (!projectManagerPermissions.includes('messages.read') || !projectManagerPermissions.includes('messages.manage')) {
  fail('project manager does not have message inbox permissions');
}
['customer', 'analyst', 'inventory_manager'].forEach(role => {
  const permissions = rbac.roles?.[role]?.permissions || [];
  if (permissions.includes('messages.read') || permissions.includes('messages.manage')) {
    fail(`${role} must not receive contact message permissions`);
  }
});

requireText('src/constants/adminNavigation.js', [
  "routeName: 'MessageInbox'",
  'permission: PERMISSIONS.MESSAGES_READ'
]);
requireText('src/router.js', [
  "path: '/admin/messages'",
  "name: 'MessageInbox'",
  'PERMISSIONS.MESSAGES_READ'
]);
const rules = requireText('firestore.rules', [
  "'messages.read'",
  "'messages.manage'",
  'match /enquiries/{enquiryId}',
  'allow read, write: if false;'
]);
if (!rules.includes("currentRole() == 'project_manager'")) {
  fail('Firestore role matrix is missing project manager message permissions');
}

const statusFunction = requireText('netlify/functions/updateProjectStatus.js', [
  'function minimumCompletionPayment(project)',
  'function assertCompletionPayment(project)',
  'MINIMUM_PAYMENT_REQUIRED',
  "newStatus === 'completed'",
  'assertCompletionPayment(liveProject)'
]);
const checks = statusFunction.match(/assertCompletionPayment\(/g) || [];
if (checks.length < 3) {
  fail('completion payment validation must run before and inside the transaction');
}
if (!statusFunction.includes('* 0.5')) {
  fail('completion payment threshold is not fixed at 50 percent');
}

requireText('src/components/ProjectApproval.vue', [
  'minimumCompletionPayment',
  'completionPaymentRemaining',
  'completionBlocked',
  'Completion locked',
  '50% payment required',
  "disabled: this.completionBlocked"
]);

console.log('Message workflow is valid: enquiries stay in the protected inbox, role-based actions are enforced, and completion requires at least 50% payment.');
