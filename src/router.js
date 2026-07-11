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
import SubmitQuotation from '@/components/SubmitQuotation.vue';
import ManageInventory from '@/components/ManageInventory.vue';
import ProjectManagement from '@/components/ProjectManagement.vue';
import UserManagement from '@/components/UserManagement.vue';
import AdminInvestigate from '@/components/AdminInvestigate.vue';
import ProjectDetail from '@/components/ProjectDetail.vue';
import ProjectApproval from '@/components/ProjectApproval.vue';
import CustomerProjects from '@/components/CustomerProjects.vue';
import CustomProjectForm from '@/components/CustomProjectForm.vue';
import { auth } from '@/firebase';
import { getUserRole } from '@/utils/firebaseHelpers';

const adminMeta = { requiresAuth: true, requiresRole: 'admin' };

const routes = [
  { path: '/', name: 'Home', component: HomePage },
  { path: '/solercalc', name: 'SolerCalculator', component: SolerCalculator },
  { path: '/about', name: 'AboutPage', component: AboutPage },
  { path: '/contact', name: 'ContactPage', component: ContactPage },
  { path: '/login', name: 'LoginPage', component: LoginPage, meta: { guestOnly: true } },
  { path: '/signup', name: 'SignUpPage', component: SignUpPage, meta: { guestOnly: true } },
  {
    path: '/submit-quotation',
    alias: '/Submitquotation',
    name: 'SubmitQuotation',
    component: SubmitQuotation,
    meta: { requiresAuth: true }
  },
  { path: '/customer/my-projects', name: 'CustomerProjects', component: CustomerProjects, meta: { requiresAuth: true } },
  { path: '/admin', name: 'AdminControl', component: AdminControl, meta: adminMeta },
  { path: '/admin/inventory', name: 'ManageInventory', component: ManageInventory, meta: adminMeta },
  { path: '/admin/projects', name: 'ProjectManagement', component: ProjectManagement, meta: adminMeta },
  { path: '/admin/projects/new', name: 'AddCustomProject', component: CustomProjectForm, meta: adminMeta },
  {
    path: '/admin/projects/:projectId',
    name: 'ProjectApproval',
    component: ProjectApproval,
    props: true,
    meta: adminMeta
  },
  {
    path: '/admin/projects/:projectId/detail',
    name: 'ProjectDetail',
    component: ProjectDetail,
    props: true,
    meta: adminMeta
  },
  { path: '/admin/users', name: 'UserManagement', component: UserManagement, meta: adminMeta },
  { path: '/admin/investigate', name: 'AdminInvestigate', component: AdminInvestigate, meta: adminMeta },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

let authInitialized = false;
const initialAuthState = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(
    auth,
    () => {
      authInitialized = true;
      unsubscribe();
      resolve();
    },
    () => {
      authInitialized = true;
      unsubscribe();
      resolve();
    }
  );
});

async function getCurrentUser() {
  if (!authInitialized) await initialAuthState;
  return auth.currentUser;
}

router.beforeEach(async (to) => {
  const currentUser = await getCurrentUser();

  if (to.meta.guestOnly && currentUser) {
    return { name: 'Home' };
  }

  if (to.meta.requiresAuth && !currentUser) {
    return { name: 'LoginPage', query: { redirect: to.fullPath } };
  }

  if (to.meta.requiresRole) {
    const role = await getUserRole(currentUser.uid);
    if (role !== to.meta.requiresRole) {
      return { name: 'Home', query: { error: 'access-denied' } };
    }
  }

  return true;
});

export default router;
