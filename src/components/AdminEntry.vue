<template>
  <div class="admin-entry container-fluid py-4">
    <section class="dashboard-hero mb-4">
      <div class="row align-items-center g-4">
        <div class="col-lg-8">
          <span class="marketing-eyebrow text-white mb-2">
            <i class="fas fa-sparkles" aria-hidden="true"></i>Operations workspace
          </span>
          <h2 class="display-6 mb-2">Welcome to ANT Solar administration</h2>
          <p class="mb-0 opacity-75">
            Access only the operational modules assigned to your role. Navigation and actions are automatically filtered by permission.
          </p>
        </div>
        <div class="col-lg-4 text-lg-end">
          <span class="dashboard-role">
            <i class="fas fa-shield" aria-hidden="true"></i>{{ userAccess.roleLabel }}
          </span>
          <p class="small mt-2 mb-0 opacity-75">{{ userAccess.roleDescription }}</p>
        </div>
      </div>
    </section>

    <div v-if="accessLoading" class="text-center my-5" role="status">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-3">Loading your workspace…</p>
    </div>

    <template v-else-if="visibleDashboardItems.length">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-3">
        <div>
          <h3 class="h5 mb-1">Available modules</h3>
          <p class="text-muted mb-0">Only modules authorized for {{ userAccess.roleLabel }} are shown.</p>
        </div>
        <span class="badge bg-light text-dark border">{{ visibleDashboardItems.length }} module{{ visibleDashboardItems.length === 1 ? '' : 's' }}</span>
      </div>

      <div class="row g-3 g-xl-4">
        <div v-for="item in visibleDashboardItems" :key="item.routeName" class="col-md-6 col-xl-4">
          <router-link :to="{ name: item.routeName }" class="dashboard-module">
            <span class="dashboard-module__icon"><i :class="item.fallbackIcon" aria-hidden="true"></i></span>
            <h4 class="h5 mb-2">{{ item.title }}</h4>
            <p class="text-muted mb-4">{{ item.description }}</p>
            <span class="dashboard-module__arrow">
              Open module <i class="fas fa-arrow-right ms-1" aria-hidden="true"></i>
            </span>
          </router-link>
        </div>
      </div>
    </template>

    <section v-else class="enterprise-empty-state card">
      <div class="enterprise-empty-state__icon"><i class="fas fa-lock" aria-hidden="true"></i></div>
      <h3 class="h5">No modules assigned</h3>
      <p class="text-muted mb-0">Your role can open the administration workspace but currently has no module permissions.</p>
    </section>
  </div>
</template>

<script>
import rbacMixin from '@/mixins/rbacMixin';
import { flattenedAdminNavigation } from '@/constants/adminNavigation';

export default {
  name: 'AdminEntry',
  mixins: [rbacMixin],
  computed: {
    visibleDashboardItems() {
      return flattenedAdminNavigation()
        .filter(item => item.routeName !== 'AdminControl')
        .filter(item => this.can(item.permission));
    }
  }
};
</script>
