<template>
  <div class="project-management container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Project portfolio</h2>
        <p class="text-muted mb-0">Monitor quotations, payments and installation progress.</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-outline-secondary" :disabled="loading" @click="fetchProjects">
          <i class="fas fa-rotate me-2" :class="{ 'fa-spin': loading }" aria-hidden="true"></i>Refresh
        </button>
        <router-link v-if="canCreateProjects" :to="{ name: 'AddCustomProject' }" class="btn btn-primary">
          <i class="fas fa-plus me-2" aria-hidden="true"></i>Create project
        </router-link>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div v-for="metric in portfolioMetrics" :key="metric.label" class="col-6 col-xl-3">
        <article class="portfolio-metric card h-100">
          <div class="card-body">
            <span class="portfolio-metric__icon" :class="metric.iconClass"><i :class="metric.icon" aria-hidden="true"></i></span>
            <div><small class="text-muted">{{ metric.label }}</small><strong>{{ metric.value }}</strong></div>
          </div>
        </article>
      </div>
    </div>

    <section class="card mb-4">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-lg-5">
            <label for="projectSearch" class="form-label">Search projects</label>
            <div class="input-group">
              <span class="input-group-text bg-white"><i class="fas fa-magnifying-glass text-muted" aria-hidden="true"></i></span>
              <input
                id="projectSearch"
                v-model.trim="searchQuery"
                type="search"
                class="form-control"
                placeholder="Project ID, customer, phone or address"
              />
            </div>
          </div>
          <div class="col-lg-7">
            <label class="form-label">Status</label>
            <div class="status-filter" role="group" aria-label="Filter projects by status">
              <button
                v-for="status in statusFilters"
                :key="status"
                type="button"
                class="status-filter__button"
                :class="{ active: selectedStatus === status }"
                @click="selectedStatus = status"
              >
                <span>{{ getStatusLabel(status) }}</span>
                <small>{{ statusCount(status) }}</small>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="text-center my-5" role="status">
      <div class="spinner-border text-primary"></div>
      <p class="mt-3 text-muted">Loading projects…</p>
    </div>

    <div v-else-if="error" class="alert alert-danger">
      <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ error }}
    </div>

    <div v-else-if="paginatedProjects.length" class="row g-3 g-xl-4">
      <div v-for="project in paginatedProjects" :key="project.id || project.projectId" class="col-md-6 col-xl-4 col-xxl-3">
        <article class="card h-100 project-card">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
              <div class="min-w-0">
                <small class="text-muted d-block">Project</small>
                <h3 class="h6 mb-0 text-truncate" :title="project.projectId || project.id">#{{ shortId(project.projectId || project.id) }}</h3>
              </div>
              <span class="project-status" :style="statusStyle(project.status)">{{ getStatusLabel(project.status) }}</span>
            </div>

            <div class="project-customer mb-3">
              <span class="project-customer__avatar">{{ customerInitials(project.customerName) }}</span>
              <div class="min-w-0">
                <strong class="d-block text-truncate">{{ project.customerName || 'Unnamed customer' }}</strong>
                <small class="text-muted d-block text-truncate">{{ project.customerPhone || project.customerEmail || 'No contact details' }}</small>
              </div>
            </div>

            <dl class="project-details flex-grow-1">
              <div><dt>Location</dt><dd class="text-truncate" :title="project.address">{{ project.address || 'Not provided' }}</dd></div>
              <div><dt>System</dt><dd>{{ numberValue(project.panelCount) }} panels</dd></div>
              <div><dt>Created</dt><dd>{{ formatDate(project.createdAt) }}</dd></div>
            </dl>

            <div class="project-finance mt-3">
              <div><small>Quoted price</small><strong>Rs {{ formatCurrency(project.quotedPrice) }}</strong></div>
              <span class="payment-chip" :class="getPaymentClass(project.paymentStatus)">{{ getPaymentLabel(project.paymentStatus) }}</span>
            </div>

            <button type="button" class="btn btn-outline-primary w-100 mt-3" @click="viewProject(project.projectId || project.id)">
              Open project <i class="fas fa-arrow-right ms-2" aria-hidden="true"></i>
            </button>
          </div>
        </article>
      </div>
    </div>

    <section v-else class="card enterprise-empty-state">
      <div class="enterprise-empty-state__icon"><i class="fas fa-folder-open" aria-hidden="true"></i></div>
      <h3 class="h5">No matching projects</h3>
      <p class="text-muted mb-3">Try another status or clear the search term.</p>
      <button v-if="searchQuery || selectedStatus !== 'all'" type="button" class="btn btn-outline-secondary" @click="clearFilters">Clear filters</button>
    </section>

    <nav v-if="totalPages > 1" class="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4" aria-label="Project pages">
      <small class="text-muted">Showing {{ pageStart }}–{{ pageEnd }} of {{ filteredProjects.length }}</small>
      <ul class="pagination mb-0">
        <li :class="['page-item', { disabled: currentPage === 1 }]">
          <button class="page-link" :disabled="currentPage === 1" @click="currentPage -= 1"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
        </li>
        <li class="page-item disabled"><span class="page-link">{{ currentPage }} / {{ totalPages }}</span></li>
        <li :class="['page-item', { disabled: currentPage === totalPages }]">
          <button class="page-link" :disabled="currentPage === totalPages" @click="currentPage += 1"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>
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
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

export default {
  name: 'ProjectManagement',
  mixins: [rbacMixin],
  data() {
    return {
      projects: [],
      loading: false,
      error: '',
      currentPage: 1,
      pageSize: 8,
      selectedStatus: 'all',
      searchQuery: '',
      statusFilters: ['all', 'quote_pending', 'quote_sent', 'approved', 'installation_scheduled', 'in_progress', 'completed', 'cancelled']
    };
  },
  computed: {
    canCreateProjects() {
      return this.can(PERMISSIONS.PROJECTS_CREATE);
    },
    portfolioMetrics() {
      return [
        { label: 'Total projects', value: this.projects.length, icon: 'fas fa-folder-tree', iconClass: 'is-blue' },
        { label: 'Awaiting action', value: this.projects.filter(project => ['quote_pending', 'quote_sent'].includes(project.status)).length, icon: 'fas fa-hourglass-half', iconClass: 'is-amber' },
        { label: 'Installation active', value: this.projects.filter(project => ['installation_scheduled', 'in_progress'].includes(project.status)).length, icon: 'fas fa-helmet-safety', iconClass: 'is-teal' },
        { label: 'Completed', value: this.projects.filter(project => project.status === 'completed').length, icon: 'fas fa-circle-check', iconClass: 'is-green' }
      ];
    },
    filteredProjects() {
      const query = this.searchQuery.toLowerCase();
      return this.projects.filter(project => {
        const matchesStatus = this.selectedStatus === 'all' || project.status === this.selectedStatus;
        if (!matchesStatus) return false;
        if (!query) return true;
        return [
          project.projectId,
          project.id,
          project.customerName,
          project.customerPhone,
          project.customerEmail,
          project.address
        ].some(value => String(value || '').toLowerCase().includes(query));
      });
    },
    totalPages() {
      return Math.max(1, Math.ceil(this.filteredProjects.length / this.pageSize));
    },
    paginatedProjects() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredProjects.slice(start, start + this.pageSize);
    },
    pageStart() {
      return this.filteredProjects.length ? (this.currentPage - 1) * this.pageSize + 1 : 0;
    },
    pageEnd() {
      return Math.min(this.currentPage * this.pageSize, this.filteredProjects.length);
    }
  },
  watch: {
    selectedStatus() {
      this.currentPage = 1;
    },
    searchQuery() {
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
    clearFilters() {
      this.searchQuery = '';
      this.selectedStatus = 'all';
    },
    statusCount(status) {
      return status === 'all'
        ? this.projects.length
        : this.projects.filter(project => project.status === status).length;
    },
    viewProject(projectId) {
      if (!projectId) {
        this.error = 'This project has no valid project ID.';
        return;
      }
      this.$router.push({ name: 'ProjectApproval', params: { projectId: String(projectId) } });
    },
    shortId(value) {
      return String(value || 'unknown').slice(0, 14);
    },
    customerInitials(name) {
      const source = String(name || 'Customer').trim();
      return source.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    },
    getStatusLabel(status) {
      if (status === 'all') return 'All';
      return PROJECT_STATUS_LABELS[status] || status || 'Unknown';
    },
    statusStyle(status) {
      const color = PROJECT_STATUS_COLORS[status] || '#667085';
      return { color, borderColor: `${color}35`, backgroundColor: `${color}12` };
    },
    getPaymentLabel(status) {
      return PAYMENT_STATUS_LABELS[status] || 'Not Started';
    },
    getPaymentClass(status) {
      if (status === 'balance_paid') return 'is-paid';
      if (status === 'advance_paid') return 'is-partial';
      return 'is-pending';
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
.portfolio-metric .card-body { display: flex; align-items: center; gap: 0.9rem; }
.portfolio-metric__icon { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 11px; }
.portfolio-metric__icon.is-blue { color: var(--ant-blue-700); background: #eff4ff; }
.portfolio-metric__icon.is-amber { color: var(--ant-amber-600); background: #fffaeb; }
.portfolio-metric__icon.is-teal { color: var(--ant-teal-600); background: #f0fdfa; }
.portfolio-metric__icon.is-green { color: var(--ant-green-600); background: #ecfdf3; }
.portfolio-metric small, .portfolio-metric strong { display: block; }
.portfolio-metric strong { color: var(--ant-slate-950); font-size: 1.35rem; }
.status-filter { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.2rem; scrollbar-width: thin; }
.status-filter__button { display: inline-flex; align-items: center; gap: 0.45rem; flex: 0 0 auto; min-height: 42px; padding: 0.5rem 0.75rem; border: 1px solid var(--ant-slate-300); border-radius: 9px; color: var(--ant-slate-600); background: #fff; font-weight: 650; }
.status-filter__button small { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 0.35rem; border-radius: 999px; background: var(--ant-slate-100); font-size: 0.68rem; }
.status-filter__button.active { border-color: var(--ant-blue-700); color: #fff; background: var(--ant-blue-700); }
.status-filter__button.active small { color: var(--ant-blue-700); background: #fff; }
.project-card { transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease; }
.project-card:hover { transform: translateY(-3px); border-color: #b2ccff; box-shadow: var(--ant-shadow-md); }
.project-status { display: inline-flex; align-items: center; padding: 0.38rem 0.58rem; border: 1px solid; border-radius: 999px; font-size: 0.68rem; font-weight: 750; text-align: center; }
.project-customer { display: flex; align-items: center; gap: 0.65rem; }
.project-customer__avatar { display: grid; place-items: center; flex: 0 0 38px; width: 38px; height: 38px; border-radius: 10px; color: #fff; background: linear-gradient(135deg, var(--ant-blue-700), var(--ant-teal-600)); font-size: 0.72rem; font-weight: 800; }
.project-details { display: grid; gap: 0.45rem; margin: 0; }
.project-details div { display: grid; grid-template-columns: 72px minmax(0, 1fr); gap: 0.5rem; }
.project-details dt { color: var(--ant-slate-500); font-size: 0.75rem; font-weight: 600; }
.project-details dd { margin: 0; color: var(--ant-slate-700); font-size: 0.8rem; }
.project-finance { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding-top: 0.9rem; border-top: 1px solid var(--ant-slate-200); }
.project-finance small, .project-finance strong { display: block; }
.project-finance small { color: var(--ant-slate-500); }
.payment-chip { padding: 0.34rem 0.55rem; border-radius: 999px; font-size: 0.68rem; font-weight: 700; }
.payment-chip.is-paid { color: #067647; background: #ecfdf3; }
.payment-chip.is-partial { color: #93370d; background: #fffaeb; }
.payment-chip.is-pending { color: var(--ant-slate-600); background: var(--ant-slate-100); }
</style>
