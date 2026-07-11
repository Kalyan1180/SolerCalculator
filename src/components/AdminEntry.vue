<template>
  <div class="admin-entry container my-5">
    <h2 class="text-center mb-4">Admin Dashboard</h2>
    <div class="row g-4">
      <div v-for="item in dashboardItems" :key="item.route" class="col-md-6 col-xl-4">
        <router-link :to="item.route" class="card h-100 text-center text-decoration-none">
          <div class="card-body">
            <i :class="[item.icon, 'fa-3x', 'mb-3']"></i>
            <h5 class="card-title">{{ item.title }}</h5>
            <p class="card-text text-muted">{{ item.description }}</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AdminEntry',
  data() {
    return {
      dashboardItems: [
        {
          route: '/admin/equipment',
          icon: 'fas fa-solar-panel',
          title: 'Calculator Catalog',
          description: 'Manage inverter and battery options used by the calculator.'
        },
        {
          route: '/admin/inventory',
          icon: 'fas fa-boxes',
          title: 'Stock Inventory',
          description: 'Track costs, selling prices, suppliers, and stock levels.'
        },
        {
          route: '/admin/projects',
          icon: 'fas fa-tasks',
          title: 'Project Management',
          description: 'Review quotations, payments, installations, and documents.'
        },
        {
          route: '/admin/users',
          icon: 'fas fa-users-cog',
          title: 'User Management',
          description: 'Review users and administrative access.'
        },
        {
          route: '/admin/investigate',
          icon: 'fas fa-chart-line',
          title: 'Analytics',
          description: 'Review business metrics, projects, and inventory health.'
        }
      ]
    };
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
