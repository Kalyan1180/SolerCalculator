<template>
  <div class="admin-entry container my-5">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h2 class="mb-1">Administration Dashboard</h2>
        <p class="text-muted mb-0">Only modules permitted for your assigned role are displayed.</p>
      </div>
      <div class="text-md-end">
        <span class="badge bg-primary fs-6">{{ userAccess.roleLabel }}</span>
        <div class="small text-muted mt-1">{{ userAccess.roleDescription }}</div>
      </div>
    </div>

    <div v-if="accessLoading" class="text-center my-5" role="status">
      <div class="spinner-border text-primary"></div>
    </div>

    <div v-else-if="visibleDashboardItems.length" class="row g-4">
      <div v-for="item in visibleDashboardItems" :key="item.route" class="col-md-6 col-xl-4">
        <router-link :to="item.route" class="card h-100 text-center text-decoration-none">
          <div class="card-body">
            <i :class="[item.icon, 'fa-3x', 'mb-3']"></i>
            <h5 class="card-title">{{ item.title }}</h5>
            <p class="card-text text-muted">{{ item.description }}</p>
          </div>
        </router-link>
      </div>
    </div>

    <div v-else class="alert alert-warning">
      Your role can open the dashboard but has no module permissions. Ask an administrator to review the role assignment.
    </div>
  </div>
</template>

<script>
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

export default {
  name: 'AdminEntry',
  mixins: [rbacMixin],
  data() {
    return {
      dashboardItems: [
        {
          route: '/admin/projects',
          permission: PERMISSIONS.PROJECTS_READ,
          icon: 'fas fa-tasks',
          title: 'Project Management',
          description: 'Review quotations, payments, installations, documents and customer updates.'
        },
        {
          route: '/admin/inventory',
          permission: PERMISSIONS.INVENTORY_READ,
          icon: 'fas fa-boxes',
          title: 'Stock Inventory',
          description: 'Track costs, selling prices, suppliers and stock levels.'
        },
        {
          route: '/admin/equipment',
          permission: PERMISSIONS.EQUIPMENT_READ,
          icon: 'fas fa-solar-panel',
          title: 'Calculator Catalog',
          description: 'View or manage inverter and battery options used by the calculator.'
        },
        {
          route: '/admin/investigate',
          permission: PERMISSIONS.ANALYTICS_READ,
          icon: 'fas fa-chart-line',
          title: 'Analytics',
          description: 'Review business metrics, projects and inventory health.'
        },
        {
          route: '/admin/users',
          permission: PERMISSIONS.USERS_READ,
          icon: 'fas fa-users-cog',
          title: 'Users & Roles',
          description: 'Review registered users and manage role assignments.'
        }
      ]
    };
  },
  computed: {
    visibleDashboardItems() {
      return this.dashboardItems.filter(item => this.can(item.permission));
    }
  }
};
</script>

<style scoped>
.card {
  border: 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.14);
}
.card-body i, .card-title { color: #0d6efd; }
</style>
