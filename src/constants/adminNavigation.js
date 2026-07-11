import { PERMISSIONS } from '@/constants/rbac';

export const ADMIN_NAVIGATION_GROUPS = Object.freeze([
  {
    label: 'Workspace',
    items: [
      {
        routeName: 'AdminControl',
        path: '/admin',
        permission: PERMISSIONS.DASHBOARD_ACCESS,
        icon: 'fas fa-grid-2',
        fallbackIcon: 'fas fa-th-large',
        title: 'Overview',
        shortTitle: 'Overview',
        description: 'Your permitted administration modules and shortcuts.'
      },
      {
        routeName: 'ProjectManagement',
        path: '/admin/projects',
        permission: PERMISSIONS.PROJECTS_READ,
        icon: 'fas fa-diagram-project',
        fallbackIcon: 'fas fa-tasks',
        title: 'Projects',
        shortTitle: 'Projects',
        description: 'Quotations, payments, installations and customer progress.'
      }
    ]
  },
  {
    label: 'Operations',
    items: [
      {
        routeName: 'ManageInventory',
        path: '/admin/inventory',
        permission: PERMISSIONS.INVENTORY_READ,
        icon: 'fas fa-boxes-stacked',
        fallbackIcon: 'fas fa-boxes',
        title: 'Stock Inventory',
        shortTitle: 'Inventory',
        description: 'Stock levels, suppliers, buying cost and selling price.'
      },
      {
        routeName: 'EquipmentCatalog',
        path: '/admin/equipment',
        permission: PERMISSIONS.EQUIPMENT_READ,
        icon: 'fas fa-solar-panel',
        fallbackIcon: 'fas fa-solar-panel',
        title: 'Equipment Catalog',
        shortTitle: 'Equipment',
        description: 'Inverters and batteries used by the solar calculator.'
      }
    ]
  },
  {
    label: 'Intelligence',
    items: [
      {
        routeName: 'AdminInvestigate',
        path: '/admin/investigate',
        permission: PERMISSIONS.ANALYTICS_READ,
        icon: 'fas fa-chart-column',
        fallbackIcon: 'fas fa-chart-line',
        title: 'Analytics',
        shortTitle: 'Analytics',
        description: 'Business performance, revenue, payments and stock health.'
      }
    ]
  },
  {
    label: 'Security',
    items: [
      {
        routeName: 'UserManagement',
        path: '/admin/users',
        permission: PERMISSIONS.USERS_READ,
        icon: 'fas fa-user-shield',
        fallbackIcon: 'fas fa-users-cog',
        title: 'Users & Access',
        shortTitle: 'Users & Access',
        description: 'Roles, user access and active-session revocation.'
      },
      {
        routeName: 'AuditLog',
        path: '/admin/audit',
        permission: PERMISSIONS.AUDIT_READ,
        icon: 'fas fa-shield-halved',
        fallbackIcon: 'fas fa-clipboard-list',
        title: 'Security Audit',
        shortTitle: 'Audit Log',
        description: 'Append-only role and session security activity.'
      }
    ]
  }
]);

export function flattenedAdminNavigation() {
  return ADMIN_NAVIGATION_GROUPS.flatMap(group => group.items);
}

export function adminNavigationItemForRoute(routeName) {
  return flattenedAdminNavigation().find(item => item.routeName === routeName) || null;
}
