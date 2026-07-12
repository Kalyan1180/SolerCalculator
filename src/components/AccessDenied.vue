<template>
  <main class="auth-page d-flex align-items-center">
    <section class="access-denied-card mx-auto text-center p-4 p-md-5">
      <div class="enterprise-empty-state__icon mb-3"><i class="fas fa-shield-halved" aria-hidden="true"></i></div>
      <span class="marketing-eyebrow mb-2">Protected workspace</span>
      <h1 class="h2">This page is not available for your role</h1>
      <p class="text-muted mb-4">
        Your account is signed in, but the requested module is outside your assigned responsibilities. Items you cannot access are hidden from the dashboard and navigation.
      </p>
      <div class="d-flex flex-wrap justify-content-center gap-2">
        <router-link to="/" class="btn btn-outline-secondary">Return to website</router-link>
        <router-link v-if="canOpenDashboard" to="/admin" class="btn btn-primary">Open my dashboard</router-link>
      </div>
    </section>
  </main>
</template>

<script>
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

export default {
  name: 'AccessDenied',
  mixins: [rbacMixin],
  computed: {
    canOpenDashboard() {
      return this.can(PERMISSIONS.DASHBOARD_ACCESS);
    }
  }
};
</script>

<style scoped>
.access-denied-card {
  max-width: 680px;
  border: 1px solid var(--ant-slate-200);
  border-radius: var(--ant-radius-lg);
  background: #fff;
  box-shadow: var(--ant-shadow-md);
}
</style>
