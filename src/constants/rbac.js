import rbacConfig from '../../config/rbac.json';

export const RBAC_VERSION = rbacConfig.version;

export const PERMISSIONS = Object.freeze({
  DASHBOARD_ACCESS: 'dashboard.access',
  PROJECTS_READ: 'projects.read',
  PROJECTS_CREATE: 'projects.create',
  PROJECTS_UPDATE: 'projects.update',
  PROJECTS_PAYMENTS: 'projects.payments',
  PROJECTS_DOCUMENTS: 'projects.documents',
  PROJECTS_DELETE: 'projects.delete',
  NOTIFICATIONS_SEND: 'notifications.send',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_WRITE: 'inventory.write',
  EQUIPMENT_READ: 'equipment.read',
  EQUIPMENT_WRITE: 'equipment.write',
  ANALYTICS_READ: 'analytics.read',
  USERS_READ: 'users.read',
  USERS_ROLES_WRITE: 'users.roles.write',
  USERS_SESSIONS_REVOKE: 'users.sessions.revoke',
  AUDIT_READ: 'audit.read'
});

export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  ANALYST: 'analyst',
  INVENTORY_MANAGER: 'inventory_manager',
  PROJECT_MANAGER: 'project_manager',
  ADMIN: 'admin'
});

export const ROLE_DEFINITIONS = Object.freeze(rbacConfig.roles);

export const ROLE_OPTIONS = Object.freeze(Object.entries(ROLE_DEFINITIONS).map(([value, definition]) => ({
  value,
  label: definition.label,
  description: definition.description,
  permissions: [...definition.permissions]
})));

export function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return ROLE_DEFINITIONS[normalized] ? normalized : ROLES.CUSTOMER;
}

export function permissionsForRole(role) {
  const definition = ROLE_DEFINITIONS[normalizeRole(role)];
  return definition.permissions.includes('*')
    ? Object.keys(rbacConfig.permissions)
    : [...definition.permissions];
}

export function roleLabel(role) {
  return ROLE_DEFINITIONS[normalizeRole(role)].label;
}

export function roleDescription(role) {
  return ROLE_DEFINITIONS[normalizeRole(role)].description;
}

export function hasPermission(accessOrRole, permission) {
  if (!permission) return true;
  const role = typeof accessOrRole === 'string'
    ? normalizeRole(accessOrRole)
    : normalizeRole(accessOrRole?.role);
  const assignedPermissions = ROLE_DEFINITIONS[role].permissions;
  return assignedPermissions.includes('*') || assignedPermissions.includes(permission);
}

export function hasEveryPermission(accessOrRole, permissions = []) {
  return permissions.every(permission => hasPermission(accessOrRole, permission));
}

export function hasAnyPermission(accessOrRole, permissions = []) {
  return permissions.some(permission => hasPermission(accessOrRole, permission));
}

export default rbacConfig;
