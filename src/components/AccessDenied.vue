<template>
  <main class="container py-5">
    <section class="access-denied-card mx-auto text-center p-4 p-md-5">
      <i class="fas fa-shield-alt fa-4x text-danger mb-4" aria-hidden="true"></i>
      <h1 class="h2">Access denied</h1>
      <p class="text-muted mb-2">Your account is signed in, but its assigned role does not include permission for this page.</p>
      <p v-if="requiredPermission" class="small mb-4"><strong>Required permission:</strong> <code>{{ requiredPermission }}</code></p>
      <div class="d-flex flex-wrap justify-content-center gap-2">
        <router-link to="/" class="btn btn-outline-secondary">Return Home</router-link>
        <router-link v-if="canOpenDashboard" to="/admin" class="btn btn-primary">Admin Dashboard</router-link>
      </div>
    </section>
  </main>
</template>

<script>
import rbacMixin from '@/mixins/rbacMixin';

export default {
  name: 'AccessDenied',
  mixins: [rbacMixin],
  computed: {
    requiredPermission() {
      return String(this.$route.query.permission || '');
    },
    canOpenDashboard() {
      return this.can('dashboard.access');
    }
  }
};
</script>

<style scoped>
.access-denied-card {
  max-width: 680px;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
}
</style>
