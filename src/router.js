// src/router.js
import { createRouter, createWebHistory } from 'vue-router';
import { onAuthStateChanged } from 'firebase/auth';
import HomePage from '@/components/HomePage.vue';
import SolerCalculator from '@/components/SolerForm.vue';
import AdminControl from '@/components/AdminEntry.vue';
import AboutPage from '@/components/AboutPage.vue';
import ContactPage from '@/components/ContactPage.vue';
import LoginPage from '@/components/LoginPage.vue';
import SignUpPage from '@/components/SignUpPage.vue';
import AccessDenied from '@/components/AccessDenied.vue';
import AuditLog from '@/components/AuditLog.vue';
import { auth } from '@/firebase';
import { getUserAccess, hasEveryPermission, hasPermission } from '@/utils/accessControl';
import { ensureActiveSession } from '@/utils/sessionManager';
import { PERMISSIONS } from '@/constants/rbac';
import SubmitQuotation from '@/components/SubmitQuotation.vue';
import ManageInventory from '@/components/ManageInventory.vue';
import ProjectManagement from '@/components/ProjectManagement.vue';
import UserManagement from '@/components/UserManagement.vue';
import AdminInvestigate from '@/components/AdminInvestigate.vue';
import ProjectApproval from '@/components/ProjectApproval.vue';
import CustomerProjects from '@/components/CustomerProjects.vue';
import CustomProjectForm from '@/components/CustomProjectForm.vue';

function protectedMeta(requiredPermission, title, description) {
  return {
    requiresAuth: true,
    requiredPermission,
    layout: 'admin',
    title,
    description
  };
}

const routes = [
  { path: '/', name: 'Home', component: HomePage, meta: { title: 'Solar solutions made practical' } },
  { path: '/solercalc', name: 'SolerCalculator', component: SolerCalculator, meta: { title: 'Solar Calculator' } },
  { path: '/about', name: 'AboutPage', component: AboutPage, meta: { title: 'About ANT Solar' } },
  { path: '/contact', name: 'ContactPage', component: ContactPage, meta: { title: 'Contact ANT Solar' } },
  { path: '/login', name: 'LoginPage', component: LoginPage, meta: { requiresGuest: true, title: 'Sign in' } },
  { path: '/signup', name: 'SignUpPage', component: SignUpPage, meta: { requiresGuest: true, title: 'Create account' } },
  { path: '/forbidden', name: 'AccessDenied', component: AccessDenied, meta: { requiresAuth: true, title: 'Access denied' } },
  {
    path: '/submit-quotation',
    alias: '/Submitquotation',
    name: 'SubmitQuotation',
    component: SubmitQuotation,
    meta: { requiresAuth: true, title: 'Submit quotation request' }
  },
  {
    path: '/admin',
    name: 'AdminControl',
    component: AdminControl,
    meta: protectedMeta(
      PERMISSIONS.DASHBOARD_ACCESS,
      'Overview',
      'Your permitted administration modules and operational shortcuts.'
    )
  },
  {
    path: '/admin/inventory',
    name: 'ManageInventory',
    component: ManageInventory,
    meta: protectedMeta(
      PERMISSIONS.INVENTORY_READ,
      'Smart Inventory & Equipment',
      'Manage equipment, quotation demand, shortfalls and restock priority.'
    )
  },
  {
    path: '/admin/equipment',
    name: 'EquipmentCatalog',
    redirect: { name: 'ManageInventory' },
    meta: protectedMeta(
      PERMISSIONS.INVENTORY_READ,
      'Smart Inventory & Equipment',
      'Equipment and stock use one controlled source of truth.'
    )
  },
  {
    path: '/admin/projects',
    name: 'ProjectManagement',
    component: ProjectManagement,
    meta: protectedMeta(
      PERMISSIONS.PROJECTS_READ,
      'Projects',
      'Review quotations, payments, installations and customer progress.'
    )
  },
  {
    path: '/admin/projects/new',
    name: 'AddCustomProject',
    component: CustomProjectForm,
    meta: protectedMeta(
      PERMISSIONS.PROJECTS_CREATE,
      'Create Project',
      'Create a managed solar project for a customer.'
    )
  },
  {
    path: '/admin/projects/:projectId',
    name: 'ProjectApproval',
    component: ProjectApproval,
    props: true,
    meta: protectedMeta(
      PERMISSIONS.PROJECTS_READ,
      'Project Workspace',
      'Review project specifications, supply readiness, payments and authorized actions.'
    )
  },
  {
    path: '/admin/projects/:projectId/detail',
    redirect: to => ({ name: 'ProjectApproval', params: { projectId: to.params.projectId } }),
    meta: protectedMeta(PERMISSIONS.PROJECTS_READ, 'Project Workspace', 'Project details and activity.')
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: protectedMeta(
      PERMISSIONS.USERS_READ,
      'Users & Access',
      'Review identities, assign roles and revoke active sessions.'
    )
  },
  {
    path: '/admin/audit',
    name: 'AuditLog',
    component: AuditLog,
    meta: protectedMeta(
      PERMISSIONS.AUDIT_READ,
      'Security Audit',
      'Review append-only role and session security activity.'
    )
  },
  {
    path: '/admin/investigate',
    name: 'AdminInvestigate',
    component: AdminInvestigate,
    meta: protectedMeta(
      PERMISSIONS.ANALYTICS_READ,
      'Analytics',
      'Monitor project, payment, revenue and operational performance.'
    )
  },
  {
    path: '/customer/my-projects',
    name: 'CustomerProjects',
    component: CustomerProjects,
    meta: { requiresAuth: true, title: 'My Projects' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: 'smooth' };
    return { top: 0 };
  }
});

let authInitialized = false;
const initialAuthPromise = new Promise(resolve => {
  const unsubscribe = onAuthStateChanged(
    auth,
    user => {
      authInitialized = true;
      unsubscribe();
      resolve(user);
    },
    () => {
      authInitialized = true;
      unsubscribe();
      resolve(null);
    }
  );
});

async function getCurrentUser() {
  if (!authInitialized) await initialAuthPromise;
  return auth.currentUser;
}

router.beforeEach(async to => {
  const currentUser = await getCurrentUser();
  const isAdministrationRoute = to.meta.layout === 'admin';
  let routeAccess = null;

  if (to.meta.requiresGuest && currentUser) return { name: 'Home' };

  // Public visitors are not redirected to an administration-specific login or
  // error page. Unknown administration URLs behave like unavailable pages.
  if (isAdministrationRoute && !currentUser) return { name: 'Home' };

  if (isAdministrationRoute && currentUser) {
    try {
      routeAccess = await getUserAccess(currentUser.uid, { force: true });
      if (!hasPermission(routeAccess, PERMISSIONS.DASHBOARD_ACCESS)) return { name: 'Home' };
    } catch (error) {
      console.error('Unable to resolve protected workspace access:', error);
      return { name: 'Home' };
    }
  }

  if (to.meta.requiresAuth && !currentUser) {
    return {
      name: 'LoginPage',
      query: { redirect: to.fullPath }
    };
  }

  if (to.meta.requiresAuth && currentUser) {
    const session = await ensureActiveSession({
      serverCheck: Boolean(to.meta.requiredPermission)
    });

    if (!session.active) {
      if (session.reason === 'session-validation-unavailable') {
        return isAdministrationRoute
          ? { name: 'Home' }
          : {
            name: 'AccessDenied',
            query: { reason: session.reason, from: to.fullPath }
          };
      }

      return {
        name: 'LoginPage',
        query: {
          reason: session.reason || 'session-expired',
          redirect: isAdministrationRoute ? '/' : to.fullPath
        }
      };
    }
  }

  if (to.meta.requiredPermission) {
    const requiredPermissions = Array.isArray(to.meta.requiredPermission)
      ? to.meta.requiredPermission
      : [to.meta.requiredPermission];

    try {
      const access = routeAccess || await getUserAccess(currentUser.uid, { force: true });
      if (!hasEveryPermission(access, requiredPermissions)) {
        return {
          name: 'AccessDenied',
          query: {
            permission: requiredPermissions.join(', '),
            from: to.fullPath
          }
        };
      }
    } catch (error) {
      console.error('Route authorization failed:', error);
      return isAdministrationRoute
        ? { name: 'Home' }
        : {
          name: 'AccessDenied',
          query: { permission: requiredPermissions.join(', '), reason: 'access-check-failed' }
        };
    }
  }

  return true;
});

router.afterEach(to => {
  const pageTitle = String(to.meta.title || 'ANT Solar');
  document.title = pageTitle === 'ANT Solar' ? pageTitle : `${pageTitle} | ANT Solar`;
});

export default router;
