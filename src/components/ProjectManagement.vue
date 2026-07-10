<template>
  <div class="project-management container-fluid py-4">
    <h2 class="mb-4">Project Management</h2>

    <!-- Filter & Add Button -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <button
          v-for="status in ['all', 'quote_pending', 'approved', 'in_progress', 'completed']"
          :key="status"
          @click="selectedStatus = status"
          :class="['btn me-2', selectedStatus === status ? 'btn-primary' : 'btn-outline-primary']"
        >
          {{ getStatusLabel(status) }}
        </button>
      </div>
      <router-link :to="{ name: 'AddCustomProject' }" class="btn btn-success">
        <i class="fas fa-plus me-1"></i> Add Custom Project
      </router-link>
    </div>

    <!-- Loader -->
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading projects, please wait...</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="alert alert-danger text-center">
      {{ error }}
    </div>

    <!-- Projects Grid -->
    <div v-if="!loading && !error && filteredProjects.length" class="row g-4">
      <div v-for="project in paginatedProjects" :key="project.projectId" class="col-sm-6 col-md-4 col-lg-3">
        <div class="card h-100 shadow-sm project-card">
          <div class="card-body d-flex flex-column">
            <!-- Project ID & Status -->
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title mb-0">#{{ project.projectId.substring(0, 8) }}</h5>
              <span class="badge" :style="{ backgroundColor: getStatusColor(project.status) }">
                {{ getStatusLabel(project.status) }}
              </span>
            </div>

            <!-- Customer Info -->
            <p class="card-text flex-grow-1">
              <strong>Customer:</strong> {{ project.customerName }}<br>
              <strong>Address:</strong> {{ project.address }}<br>
              <strong>Phone:</strong> {{ project.customerPhone }}
            </p>

            <!-- Cost & Payment -->
            <div class="mb-3 pb-3 border-bottom">
              <small class="text-muted">Quoted Price: <strong class="text-primary">₹{{ formatCurrency(project.quotedPrice) }}</strong></small><br>
              <small class="text-muted">Payment: <strong :class="getPaymentClass(project.paymentStatus)">{{ project.paymentStatus }}</strong></small>
            </div>

            <!-- Action Button -->
            <button class="btn btn-sm btn-outline-primary" @click="viewProject(project.projectId)">
              View & Update <i class="fas fa-arrow-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- No Projects -->
    <div v-if="!loading && !error && !filteredProjects.length" class="text-center my-5 text-muted">
      No projects found.
    </div>

    <!-- Pagination -->
    <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-4">
      <ul class="pagination">
        <li :class="['page-item', { disabled: currentPage === 1 }]">
          <button class="page-link" @click="prevPage" :disabled="currentPage === 1">Previous</button>
        </li>
        <li class="page-item disabled">
          <span class="page-link">Page {{ currentPage }} of {{ totalPages }}</span>
        </li>
        <li :class="['page-item', { disabled: currentPage === totalPages }]">
          <button class="page-link" @click="nextPage" :disabled="currentPage === totalPages">Next</button>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script>
import { getAllProjects } from '@/models/projectModel';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/constants/businessConstants';

export default {
  name: 'ProjectManagement',
  data() {
    return {
      projects: [],
      loading: false,
      error: '',
      currentPage: 1,
      pageSize: 8,
      selectedStatus: 'all'
    };
  },
  computed: {
    filteredProjects() {
      if (this.selectedStatus === 'all') {
        return this.projects;
      }
      return this.projects.filter(p => p.status === this.selectedStatus);
    },
    paginatedProjects() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredProjects.slice(start, start + this.pageSize);
    },
    totalPages() {
      return Math.ceil(this.filteredProjects.length / this.pageSize);
    }
  },
  created() {
    this.fetchProjects();
  },
  methods: {
    async fetchProjects() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getAllProjects();
        if (result.success) {
          this.projects = result.projects;
        } else {
          this.error = result.error || 'Failed to load projects';
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        this.error = 'Error loading projects';
      } finally {
        this.loading = false;
      }
    },
    viewProject(projectId) {
      this.$router.push({
        name: 'ProjectDetail',
        params: { projectId }
      });
    },
    getStatusLabel(status) {
      return PROJECT_STATUS_LABELS[status] || status;
    },
    getStatusColor(status) {
      return PROJECT_STATUS_COLORS[status] || '#999';
    },
    getPaymentClass(paymentStatus) {
      if (paymentStatus === 'balance_paid') return 'text-success';
      if (paymentStatus === 'advance_paid') return 'text-warning';
      return 'text-danger';
    },
    formatCurrency(value) {
      return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        maximumFractionDigits: 0
      }).format(value);
    },
    prevPage() {
      if (this.currentPage > 1) this.currentPage--;
    },
    nextPage() {
      if (this.currentPage < this.totalPages) this.currentPage++;
    }
  }
};
</script>

<style scoped>
.project-card {
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #e0e0e0;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}

.badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
}
</style>
