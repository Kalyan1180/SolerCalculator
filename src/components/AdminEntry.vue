<template>
  <div class="admin-entry container my-5">
    <h2 class="text-center mb-4">Admin Dashboard</h2>
    <div class="row">
      <!-- Card: Manage Inventory -->
      <div class="col-md-6 col-lg-3 mb-4">
        <router-link to="/admin/inventory" class="card h-100 text-center text-decoration-none">
          <div class="card-body">
            <i class="fas fa-boxes fa-3x mb-3"></i>
            <h5 class="card-title">Manage Inventory</h5>
            <p class="card-text">Add, update, and delete inverters & batteries</p>
          </div>
        </router-link>
      </div>
      <!-- Card: Project Management -->
      <div class="col-md-6 col-lg-3 mb-4">
        <router-link to="/admin/projects" class="card h-100 text-center text-decoration-none">
          <div class="card-body">
            <i class="fas fa-tasks fa-3x mb-3"></i>
            <h5 class="card-title">Project Management</h5>
            <p class="card-text">View and update project details</p>
          </div>
        </router-link>
      </div>
      <!-- Card: User Management -->
      <div class="col-md-6 col-lg-3 mb-4">
        <router-link to="/admin/users" class="card h-100 text-center text-decoration-none">
          <div class="card-body">
            <i class="fas fa-users-cog fa-3x mb-3"></i>
            <h5 class="card-title">User Management</h5>
            <p class="card-text">Manage users and roles</p>
          </div>
        </router-link>
      </div>
      <!-- Card: Investigate -->
      <div class="col-md-6 col-lg-3 mb-4">
        <router-link to="/admin/investigate" class="card h-100 text-center text-decoration-none">
          <div class="card-body">
            <i class="fas fa-search fa-3x mb-3"></i>
            <h5 class="card-title">Investigate</h5>
            <p class="card-text">View logs and system details</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "AdminEntry"
};
</script>

<style scoped>
.admin-entry {
  /* Customize container styling as needed */
}
.card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: none;
  border-radius: 8px;
}
.card:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
.card-body i {
  color: #007bff;
}
.card-title {
  color: #007bff;
  font-weight: bold;
}
</style>
