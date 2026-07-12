const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const componentsDir = path.join(root, 'src', 'components');
const routerSource = fs.readFileSync(path.join(root, 'src', 'router.js'), 'utf8');
const navigationSource = fs.readFileSync(path.join(root, 'src', 'constants', 'adminNavigation.js'), 'utf8');
const permissionSource = fs.readFileSync(path.join(root, 'src', 'constants', 'rbac.js'), 'utf8');
const adminShellSource = fs.readFileSync(path.join(componentsDir, 'AdminShell.vue'), 'utf8');
const adminEntrySource = fs.readFileSync(path.join(componentsDir, 'AdminEntry.vue'), 'utf8');
const navbarSource = fs.readFileSync(path.join(componentsDir, 'NavbarComponent.vue'), 'utf8');

function fail(message) {
  throw new Error(`UI access validation failed: ${message}`);
}

function vueFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return vueFiles(absolute);
    return entry.isFile() && entry.name.endsWith('.vue') ? [absolute] : [];
  });
}

const permissionConstants = new Set(
  [...permissionSource.matchAll(/^\s*([A-Z][A-Z0-9_]+):\s*['"][^'"]+['"]/gm)].map(match => match[1])
);
const navigationPermissions = [
  ...navigationSource.matchAll(/permission:\s*PERMISSIONS\.([A-Z][A-Z0-9_]+)/g)
].map(match => match[1]);

if (!navigationPermissions.length) fail('central admin navigation has no permission assignments');
for (const permission of navigationPermissions) {
  if (!permissionConstants.has(permission)) {
    fail(`admin navigation references unknown permission constant ${permission}`);
  }
}

const navigationRouteNames = new Set(
  [...navigationSource.matchAll(/routeName:\s*['"]([^'"]+)['"]/g)].map(match => match[1])
);
const requiredNavigationRoutes = [
  'AdminControl',
  'ProjectManagement',
  'ManageInventory',
  'AdminInvestigate',
  'UserManagement',
  'AuditLog'
];
for (const routeName of requiredNavigationRoutes) {
  if (!navigationRouteNames.has(routeName)) fail(`protected module ${routeName} is missing from central navigation`);
  if (!routerSource.includes(`name: '${routeName}'`)) fail(`central navigation route ${routeName} is missing from router`);
}

if (navigationRouteNames.has('EquipmentCatalog')) {
  fail('equipment must not be exposed as a separate administration module');
}
if (!routerSource.includes("name: 'EquipmentCatalog'") || !routerSource.includes("redirect: { name: 'ManageInventory' }")) {
  fail('legacy equipment URL must redirect to unified inventory');
}

if (!adminShellSource.includes('group.items.filter(item => this.can(item.permission))')) {
  fail('administration sidebar is not permission-filtered');
}
if (!adminEntrySource.includes('.filter(item => this.can(item.permission))')) {
  fail('administration overview is not permission-filtered');
}
if (!navbarSource.includes('v-if="canOpenDashboard"')) {
  fail('public account navigation does not hide the administration link');
}

const forbiddenRoleChecks = [
  /\buserRole\s*={2,3}\s*['"]admin['"]/,
  /\bcurrentRole\s*={2,3}\s*['"]admin['"]/,
  /(?:^|[^.])\brole\s*={2,3}\s*['"]admin['"]/m
];
for (const file of vueFiles(componentsDir)) {
  const source = fs.readFileSync(file, 'utf8');
  if (forbiddenRoleChecks.some(pattern => pattern.test(source))) {
    fail(`${path.relative(root, file)} contains a hard-coded administrator UI check; use RBAC permissions`);
  }
}

const requiredVisibilityChecks = {
  'src/components/ProjectManagement.vue': [
    'v-if="canCreateProjects"'
  ],
  'src/components/ManageInventory.vue': [
    'v-if="canWriteInventory"'
  ],
  'src/components/ProjectApproval.vue': [
    'v-if="canUpdateProject"',
    'v-if="canManagePayments"',
    'v-if="canGenerateDocuments || canSendNotifications"'
  ],
  'src/components/UserManagement.vue': [
    'v-if="canManageRoles"',
    'v-if="canRevokeSessions"'
  ],
  'src/components/SolerForm.vue': [
    'v-if="canCreateProjects"'
  ]
};

for (const [relativePath, snippets] of Object.entries(requiredVisibilityChecks)) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  for (const snippet of snippets) {
    if (!source.includes(snippet)) fail(`${relativePath} is missing visibility guard ${snippet}`);
  }
}

if (!routerSource.includes("layout: 'admin'")) fail('router does not assign the administration layout');
if (!routerSource.includes('requiredPermission')) fail('router is missing permission-aware route metadata');

console.log(
  `UI access policy is valid: ${navigationRouteNames.size} centralized admin routes, `
  + `${navigationPermissions.length} permission-gated navigation entries.`
);
