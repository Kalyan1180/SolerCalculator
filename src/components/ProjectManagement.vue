<template>
  <div class="project-management container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <h2 class="mb-0">Project Management</h2>
      <router-link :to="{ name: 'AddCustomProject' }" class="btn btn-success">
        <i class="fas fa-plus me-1"></i> Add Custom Project
      </router-link>
    </div>

    <div class="d-flex flex-wrap gap-2 mb-4">
      <button
        v-for="status in filters"
        :key="status"
        @click="selectStatus(status)"
        :class="['btn', selectedStatus === status ? 'btn-primary' : 'btn-outline-primary']"
      >
        {{ getStatusLabel(status) }}
      </button>
    </div>

    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading projects...</p>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="!loading && !error && paginatedProjects.length" class="row g-4">
      <div v-for="project in paginatedProjects" :key="project.id || project.projectId" class="col-sm-6 col-md-4 col-lg-3">
        <div class="card h-100 shadow-sm project-card">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
              <h5 class="card-title mb-0">#{{ String(project.projectId || project.id).slice(0, 12) }}</h5>
              <span class="badge" :style="{ backgroundColor: getStatusColor(project.status) }">
                {{ getStatusLabel(project.status) }}
              </span>
            </div>

            <p class="card-text flex-grow-1">
              <strong>Customer:</strong> {{ project.customerName || 'N/A' }}<br>
              <strong>Address:</strong> {{ project.address || 'N/A' }}<br>
              <strong>Phone:</strong> {{ project.customerPhone || 'N/A' }}
            </p>

            <div class="mb-3 pb-3 border-bottom">
              <small class="text-muted">Quoted Price:
                <strong class="text-primary">₹{{ formatCurrency(project.finalPrice || project.quotedPrice) }}</strong>
              </small><br>
              <small class="text-muted">Payment:
                <strong :class="getPaymentClass(project.paymentStatus)">{{ getPaymentLabel(project.paymentStatus) }}</strong>
              </small>
            </div>

            <button class="btn btn-sm btn-outline-primary" @click="viewProject(project.projectId || project.id)">
              View & Update <i class="fas fa-arrow-right ms-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && !error && !filteredProjects.length" class="text-center my-5 text-muted">
      No projects found.
    </div>

    <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-4" aria-label="Project pages">
      <ul class="pagination">
        <li :class="['page-item', { disabled: currentPage === 1 }]">
          <button class="page-link" @click="currentPage--" :disabled="currentPage === 1">Previous</button>
        </li>
        <li class="page-item disabled">
          <span class="page-link">Page {{ currentPage }} of {{ totalPages }}</span>
        </li>
        <li :class="['page-item', { disabled: currentPage === totalPages }]">
          <button class="page-link" @click="currentPage++" :disabled="currentPage === totalPages">Next</button>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script>
import { getAllProjects } from '@/models/projectModel';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS
} from '@/constants/businessConstants';

export default {
  name: 'ProjectManagement',
  data() {
    return {
      projects: [],
      loading: false,
      error: '',
      currentPage: 1,
      pageSize: 8,
      selectedStatus: 'all',
      filters: ['all', 'quote_pending', 'quote_sent', 'approved', 'installation_scheduled', 'in_progress', 'completed', 'cancelled']
    };
  },
  computed: {
    filteredProjects() {
      return this.selectedStatus === 'all'
        ? this.projects
        : this.projects.filter((project) => project.status === this.selectedStatus);
    },
    paginatedProjects() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredProjects.slice(start, start + this.pageSize);
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.filteredProjects.length / this.pageSize));
    }
  },
  created() {
    this.fetchProjects();
  },
  methods: {
    selectStatus(status) {
      this.selectedStatus = status;
      this.currentPage = 1;
    },
    async fetchProjects() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getAllProjects();
        if (!result.success) throw new Error(result.error || 'Failed to load projects.');
        this.projects = result.projects;
      } catch (error) {
        console.error('Error loading projects:', error);
        this.error = error.message || 'Error loading projects.';
      } finally {
        this.loading = false;
      }
    },
    viewProject(projectId) {
      this.$router.push({ name: 'ProjectApproval', params: { projectId } });
    },
    getStatusLabel(status) {
      return status === 'all' ? 'All' : (PROJECT_STATUS_LABELS[status] || status);
    },
    getStatusColor(status) {
      return PROJECT_STATUS_COLORS[status] || '#6c757d';
    },
    getPaymentLabel(status) {
      return PAYMENT_STATUS_LABELS[status] || 'Not Started';
    },
    getPaymentClass(status) {
      if (status === 'balance_paid') return 'text-success';
      if (status === 'advance_paid') return 'text-warning';
      return 'text-danger';
    },
    formatCurrency(value) {
      const number = Number(value);
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number.isFinite(number) ? number : 0);
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
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}
.badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
}
</style>
