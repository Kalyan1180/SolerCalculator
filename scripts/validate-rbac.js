const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'config', 'rbac.json');
const rulesPath = path.join(root, 'firestore.rules');
const roleFunctionPath = path.join(root, 'netlify', 'functions', 'updateUserRole.js');
const revokeFunctionPath = path.join(root, 'netlify', 'functions', 'revokeUserSessions.js');

function fail(message) {
  throw new Error(`RBAC validation failed: ${message}`);
}

function unique(values) {
  return new Set(values).size === values.length;
}

function includesAny(values, candidates) {
  return candidates.some(candidate => values.includes(candidate));
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const firestoreRules = fs.readFileSync(rulesPath, 'utf8');
const roleFunction = fs.readFileSync(roleFunctionPath, 'utf8');
const revokeFunction = fs.readFileSync(revokeFunctionPath, 'utf8');

if (!Number.isInteger(config.version) || config.version < 1) {
  fail('version must be a positive integer');
}
if (!config.permissions || typeof config.permissions !== 'object' || Array.isArray(config.permissions)) {
  fail('permissions must be an object');
}
if (!config.roles || typeof config.roles !== 'object' || Array.isArray(config.roles)) {
  fail('roles must be an object');
}

const permissionNames = Object.keys(config.permissions);
const permissionSet = new Set(permissionNames);
const permissionPattern = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;
if (!permissionNames.length) fail('at least one permission is required');
permissionNames.forEach(permission => {
  if (!permissionPattern.test(permission)) fail(`invalid permission name: ${permission}`);
  const description = config.permissions[permission];
  if (typeof description !== 'string' || !description.trim()) {
    fail(`permission ${permission} requires a description`);
  }
});

const requiredRoles = ['customer', 'analyst', 'inventory_manager', 'project_manager', 'admin'];
requiredRoles.forEach(role => {
  if (!config.roles[role]) fail(`missing required role: ${role}`);
});

for (const [role, definition] of Object.entries(config.roles)) {
  if (!/^[a-z][a-z0-9_]*$/.test(role)) fail(`invalid role name: ${role}`);
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) {
    fail(`role ${role} must be an object`);
  }
  if (typeof definition.label !== 'string' || !definition.label.trim()) {
    fail(`role ${role} requires a label`);
  }
  if (typeof definition.description !== 'string' || !definition.description.trim()) {
    fail(`role ${role} requires a description`);
  }
  if (!Array.isArray(definition.permissions)) fail(`role ${role} permissions must be an array`);
  if (!unique(definition.permissions)) fail(`role ${role} contains duplicate permissions`);

  definition.permissions.forEach(permission => {
    if (permission !== '*' && !permissionSet.has(permission)) {
      fail(`role ${role} references unknown permission ${permission}`);
    }
  });

  if (role === 'admin') {
    if (definition.permissions.length !== 1 || definition.permissions[0] !== '*') {
      fail('administrator must use exactly the wildcard permission');
    }
  } else if (definition.permissions.includes('*')) {
    fail(`only administrator may use the wildcard permission; found on ${role}`);
  }
}

if (config.roles.customer.permissions.length !== 0) {
  fail('customer must not receive administration permissions');
}

const analystForbidden = [
  'projects.create',
  'projects.update',
  'projects.payments',
  'projects.delete',
  'notifications.send',
  'inventory.write',
  'equipment.write',
  'users.roles.write',
  'users.sessions.revoke'
];
if (includesAny(config.roles.analyst.permissions, analystForbidden)) {
  fail('analyst must remain read-only');
}

const securityPermissions = [
  'users.read',
  'users.roles.write',
  'users.sessions.revoke',
  'audit.read'
];
for (const [role, definition] of Object.entries(config.roles)) {
  if (role !== 'admin' && includesAny(definition.permissions, securityPermissions)) {
    fail(`security administration permission assigned to non-administrator role ${role}`);
  }
}

const projectManagerForbidden = [
  'inventory.write',
  'equipment.write',
  'users.read',
  'users.roles.write',
  'users.sessions.revoke',
  'audit.read'
];
if (includesAny(config.roles.project_manager.permissions, projectManagerForbidden)) {
  fail('project manager violates separation of duties');
}

const inventoryManagerForbidden = [
  'projects.create',
  'projects.update',
  'projects.payments',
  'projects.delete',
  'notifications.send',
  'users.read',
  'users.roles.write',
  'users.sessions.revoke',
  'audit.read'
];
if (includesAny(config.roles.inventory_manager.permissions, inventoryManagerForbidden)) {
  fail('inventory manager violates separation of duties');
}

// The rules file intentionally mirrors roles that access Firestore from the browser.
for (const role of requiredRoles.filter(role => !['customer', 'admin'].includes(role))) {
  if (!firestoreRules.includes(`currentRole() == '${role}'`)) {
    fail(`Firestore rules are missing role ${role}`);
  }
  for (const permission of config.roles[role].permissions) {
    if (!firestoreRules.includes(`'${permission}'`)) {
      fail(`Firestore rules are missing permission ${permission} for ${role}`);
    }
  }
}

if (!permissionSet.has('users.roles.write')) fail('required server security permission users.roles.write is missing');
if (!roleFunction.includes("requirePermission(event, 'users.roles.write')")) {
  fail('role administration function does not enforce users.roles.write');
}
if (!permissionSet.has('users.sessions.revoke')) {
  fail('required server security permission users.sessions.revoke is missing');
}
if (!revokeFunction.includes("requirePermission(event, 'users.sessions.revoke')")) {
  fail('session revocation function does not enforce users.sessions.revoke');
}
if (!firestoreRules.includes("hasPermission('audit.read')")) {
  fail('Firestore rules do not enforce audit.read for audit log access');
}
if (!firestoreRules.includes('allow create, update, delete: if false;')) {
  fail('audit logs are not append-only from browser clients');
}

console.log(`RBAC policy v${config.version} is valid: ${Object.keys(config.roles).length} roles, ${permissionNames.length} permissions.`);
