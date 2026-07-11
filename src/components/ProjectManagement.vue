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
        v-for="status in statusFilters"
        :key="status"
        type="button"
        :class="['btn', selectedStatus === status ? 'btn-primary' : 'btn-outline-primary']"
        @click="selectedStatus = status"
      >
        {{ getStatusLabel(status) }}
      </button>
      <button type="button" class="btn btn-outline-secondary ms-auto" :disabled="loading" @click="fetchProjects">
        <i class="fas fa-sync-alt me-1"></i> Refresh
      </button>
    </div>

    <div v-if="loading" class="text-center my-5" role="status">
      <div class="spinner-border text-primary"></div>
      <p class="mt-2">Loading projects...</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else-if="paginatedProjects.length" class="row g-4">
      <div v-for="project in paginatedProjects" :key="project.id || project.projectId" class="col-sm-6 col-lg-4 col-xl-3">
        <article class="card h-100 project-card">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
              <h5 class="card-title mb-0">#{{ shortId(project.projectId || project.id) }}</h5>
              <span class="badge" :style="{ backgroundColor: getStatusColor(project.status) }">
                {{ getStatusLabel(project.status) }}
              </span>
            </div>

            <div class="flex-grow-1">
              <p class="mb-1"><strong>Customer:</strong> {{ project.customerName || 'N/A' }}</p>
              <p class="mb-1"><strong>Phone:</strong> {{ project.customerPhone || 'N/A' }}</p>
              <p class="mb-1 text-truncate" :title="project.address"><strong>Address:</strong> {{ project.address || 'N/A' }}</p>
              <p class="mb-1"><strong>Panels:</strong> {{ numberValue(project.panelCount) }}</p>
              <p class="mb-1"><strong>Created:</strong> {{ formatDate(project.createdAt) }}</p>
            </div>

            <div class="border-top pt-3 mt-3">
              <p class="mb-1"><strong>Quote:</strong> Rs {{ formatCurrency(project.quotedPrice) }}</p>
              <p class="mb-3"><strong>Payment:</strong> <span :class="getPaymentClass(project.paymentStatus)">{{ getPaymentLabel(project.paymentStatus) }}</span></p>
              <button type="button" class="btn btn-sm btn-outline-primary w-100" @click="viewProject(project.projectId || project.id)">
                View & Update
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <div v-else class="text-center my-5 text-muted">No projects found for this filter.</div>

    <nav v-if="totalPages > 1" class="d-flex justify-content-center mt-4" aria-label="Project pages">
      <ul class="pagination">
        <li :class="['page-item', { disabled: currentPage === 1 }]">
          <button class="page-link" :disabled="currentPage === 1" @click="currentPage -= 1">Previous</button>
        </li>
        <li class="page-item disabled"><span class="page-link">Page {{ currentPage }} of {{ totalPages }}</span></li>
        <li :class="['page-item', { disabled: currentPage === totalPages }]">
          <button class="page-link" :disabled="currentPage === totalPages" @click="currentPage += 1">Next</button>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script>
import { getAllProjects } from '@/models/projectModel';
import {
  PAYMENT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS
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
      statusFilters: ['all', 'quote_pending', 'quote_sent', 'approved', 'installation_scheduled', 'in_progress', 'completed', 'cancelled']
    };
  },
  computed: {
    filteredProjects() {
      if (this.selectedStatus === 'all') return this.projects;
      return this.projects.filter(project => project.status === this.selectedStatus);
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.filteredProjects.length / this.pageSize));
    },
    paginatedProjects() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredProjects.slice(start, start + this.pageSize);
    }
  },
  watch: {
    selectedStatus() {
      this.currentPage = 1;
    },
    totalPages(newTotal) {
      if (this.currentPage > newTotal) this.currentPage = newTotal;
    }
  },
  created() {
    this.fetchProjects();
  },
  methods: {
    numberValue(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    },
    async fetchProjects() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getAllProjects();
        if (!result.success) throw new Error(result.error || 'Failed to load projects');
        this.projects = result.projects.filter(project => project.projectId && project.status);
        this.currentPage = 1;
      } catch (error) {
        this.error = error.message || 'Unable to load projects.';
      } finally {
        this.loading = false;
      }
    },
    viewProject(projectId) {
      if (!projectId) {
        this.error = 'This project has no valid project ID.';
        return;
      }
      this.$router.push({ name: 'ProjectApproval', params: { projectId: String(projectId) } });
    },
    shortId(value) {
      return String(value || 'unknown').slice(0, 12);
    },
    getStatusLabel(status) {
      if (status === 'all') return 'All';
      return PROJECT_STATUS_LABELS[status] || status || 'Unknown';
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
      return 'text-muted';
    },
    formatCurrency(value) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(this.numberValue(value));
    },
    formatDate(timestamp) {
      if (!timestamp) return 'N/A';
      const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
      return Number.isNaN(date.getTime()) ? 'N/A' : new Intl.DateTimeFormat('en-IN').format(date);
    }
  }
};
</script>

<style scoped>
.project-card {
  border: 1px solid #e5e5e5;
  transition: transform 0.2s, box-shadow 0.2s;
}
.project-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 18px rgba(0, 0, 0, 0.12);
}
.badge { white-space: normal; text-align: center; }
</style>
