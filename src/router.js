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
import { getUserAccess, hasEveryPermission } from '@/utils/accessControl';
import { PERMISSIONS } from '@/constants/rbac';
import SubmitQuotation from '@/components/SubmitQuotation.vue';
import ManageInventory from '@/components/ManageInventory.vue';
import EquipmentCatalog from '@/components/EquipmentCatalog.vue';
import ProjectManagement from '@/components/ProjectManagement.vue';
import UserManagement from '@/components/UserManagement.vue';
import AdminInvestigate from '@/components/AdminInvestigate.vue';
import ProjectApproval from '@/components/ProjectApproval.vue';
import CustomerProjects from '@/components/CustomerProjects.vue';
import CustomProjectForm from '@/components/CustomProjectForm.vue';

function protectedMeta(requiredPermission) {
  return { requiresAuth: true, requiredPermission };
}

const routes = [
  { path: '/', name: 'Home', component: HomePage },
  { path: '/solercalc', name: 'SolerCalculator', component: SolerCalculator },
  { path: '/about', name: 'AboutPage', component: AboutPage },
  { path: '/contact', name: 'ContactPage', component: ContactPage },
  { path: '/login', name: 'LoginPage', component: LoginPage, meta: { requiresGuest: true } },
  { path: '/signup', name: 'SignUpPage', component: SignUpPage, meta: { requiresGuest: true } },
  { path: '/forbidden', name: 'AccessDenied', component: AccessDenied, meta: { requiresAuth: true } },
  {
    path: '/submit-quotation',
    alias: '/Submitquotation',
    name: 'SubmitQuotation',
    component: SubmitQuotation,
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'AdminControl',
    component: AdminControl,
    meta: protectedMeta(PERMISSIONS.DASHBOARD_ACCESS)
  },
  {
    path: '/admin/inventory',
    name: 'ManageInventory',
    component: ManageInventory,
    meta: protectedMeta(PERMISSIONS.INVENTORY_READ)
  },
  {
    path: '/admin/equipment',
    name: 'EquipmentCatalog',
    component: EquipmentCatalog,
    meta: protectedMeta(PERMISSIONS.EQUIPMENT_READ)
  },
  {
    path: '/admin/projects',
    name: 'ProjectManagement',
    component: ProjectManagement,
    meta: protectedMeta(PERMISSIONS.PROJECTS_READ)
  },
  {
    path: '/admin/projects/new',
    name: 'AddCustomProject',
    component: CustomProjectForm,
    meta: protectedMeta(PERMISSIONS.PROJECTS_CREATE)
  },
  {
    path: '/admin/projects/:projectId',
    name: 'ProjectApproval',
    component: ProjectApproval,
    props: true,
    meta: protectedMeta(PERMISSIONS.PROJECTS_READ)
  },
  {
    path: '/admin/projects/:projectId/detail',
    redirect: to => ({ name: 'ProjectApproval', params: { projectId: to.params.projectId } }),
    meta: protectedMeta(PERMISSIONS.PROJECTS_READ)
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: UserManagement,
    meta: protectedMeta(PERMISSIONS.USERS_READ)
  },
  {
    path: '/admin/audit',
    name: 'AuditLog',
    component: AuditLog,
    meta: protectedMeta(PERMISSIONS.AUDIT_READ)
  },
  {
    path: '/admin/investigate',
    name: 'AdminInvestigate',
    component: AdminInvestigate,
    meta: protectedMeta(PERMISSIONS.ANALYTICS_READ)
  },
  {
    path: '/customer/my-projects',
    name: 'CustomerProjects',
    component: CustomerProjects,
    meta: { requiresAuth: true }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
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

  if (to.meta.requiresGuest && currentUser) return { name: 'Home' };

  if (to.meta.requiresAuth && !currentUser) {
    return {
      name: 'LoginPage',
      query: { redirect: to.fullPath }
    };
  }

  if (to.meta.requiredPermission) {
    const requiredPermissions = Array.isArray(to.meta.requiredPermission)
      ? to.meta.requiredPermission
      : [to.meta.requiredPermission];

    try {
      // Protected navigation always re-reads the Firestore role. This makes
      // privilege revocation effective immediately instead of waiting for cache expiry.
      const access = await getUserAccess(currentUser.uid, { force: true });
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
      return {
        name: 'AccessDenied',
        query: { permission: requiredPermissions.join(', '), reason: 'access-check-failed' }
      };
    }
  }

  return true;
});

export default router;
