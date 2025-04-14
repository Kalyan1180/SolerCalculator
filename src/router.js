// src/router.js
import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '@/components/HomePage.vue';
import SolerCalculator from '@/components/SolerForm.vue';
import AdminControl from '@/components/AdminEntry.vue';
import AboutPage from '@/components/AboutPage.vue';
import ContactPage from '@/components/ContactPage.vue';
import LoginPage from '@/components/LoginPage.vue';
import SignUpPage from '@/components/SignUpPage.vue';
import { auth } from '@/firebase';
import { getUserRole } from '@/utils/firebaseHelpers';
import SubmitQuotation from './components/SubmitQuotation.vue';

const routes = [
  { path: '/', name: 'Home', component: HomePage },
  { path: '/solercalc', name: 'SolerCalculator', component: SolerCalculator },
  { path: '/admin', name: 'AdminControl', component: AdminControl },
  { path: '/about', name: 'AboutPage', component: AboutPage },
  { path: '/contact', name: 'ContactPage', component: ContactPage },
  { path: '/login', name: 'LoginPage', component: LoginPage },
  { path: '/signup', name: 'SignUpPage', component: SignUpPage },
  { path: '/Submitquotation', name: 'SubmitQuotation', component: SubmitQuotation}
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const currentUser = auth.currentUser;
  if (to.meta.requiresRole) {
    if (!currentUser) {
      next('/login');
    } else {
      const role = await getUserRole(currentUser.uid);
      if (role === to.meta.requiresRole) {
        next();
      } else {
        alert('Access Denied!');
        next('/');
      }
    }
  } else {
    next();
  }
});

export default router;
