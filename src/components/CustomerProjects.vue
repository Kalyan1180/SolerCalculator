<template>
  <div class="customer-projects container py-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
      <h2 class="mb-0">My Solar Projects</h2>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadProjects">Refresh</button>
    </div>

    <div v-if="loading" class="text-center my-5" role="status">
      <div class="spinner-border text-primary"></div>
      <p class="mt-2">Loading your projects...</p>
    </div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="!loading && projects.length" class="row g-4">
      <div v-for="project in projects" :key="project.id || project.projectId" class="col-lg-6">
        <article class="card h-100 shadow-sm">
          <div class="card-header text-white" :style="{ backgroundColor: getStatusColor(project.status) }">
            <div class="d-flex justify-content-between align-items-center gap-2">
              <h5 class="mb-0">Project #{{ shortId(project.projectId || project.id) }}</h5>
              <span class="badge bg-light text-dark">{{ getStatusLabel(project.status) }}</span>
            </div>
          </div>

          <div class="card-body">
            <div class="mb-3">
              <p class="mb-1"><strong>Panels:</strong> {{ numberValue(project.panelCount) }}</p>
              <p class="mb-1"><strong>Inverter:</strong> {{ project.inverter?.name || 'N/A' }}</p>
              <p class="mb-1"><strong>Battery:</strong> {{ project.battery?.selectedBattery?.name || 'Not required' }}</p>
            </div>

            <div class="cost-section mb-3 p-3 bg-light rounded">
              <p class="mb-2"><strong>Quoted Price:</strong> <span class="text-primary">Rs {{ formatCurrency(project.quotedPrice) }}</span></p>
              <div class="d-flex align-items-center mt-2">
                <div class="payment-item" :class="{ active: advancePaid(project) }">
                  <small>Advance</small>
                  <strong class="d-block">Rs {{ formatCurrency(project.advanceAmount) }}</strong>
                </div>
                <div class="separator">→</div>
                <div class="payment-item" :class="{ active: project.paymentStatus === 'balance_paid' }">
                  <small>Balance</small>
                  <strong class="d-block">Rs {{ formatCurrency(project.balanceAmount) }}</strong>
                </div>
              </div>
            </div>

            <div class="timeline mb-3">
              <div v-for="step in timelineSteps(project)" :key="step.label" class="timeline-item" :class="{ completed: step.completed }">
                <div class="timeline-marker"></div>
                <small>{{ step.label }}</small>
              </div>
            </div>

            <div v-if="project.customerNotes" class="alert alert-info mb-0">
              <small><strong>Your notes:</strong> {{ project.customerNotes }}</small>
            </div>
          </div>

          <div class="card-footer bg-light"><small class="text-muted">Created: {{ formatDate(project.createdAt) }}</small></div>
        </article>
      </div>
    </div>

    <div v-if="!loading && !projects.length && !error" class="text-center my-5">
      <i class="fas fa-inbox fa-4x text-muted mb-3"></i>
      <p class="text-muted">No solar projects yet.</p>
      <router-link to="/solercalc" class="btn btn-primary">Get a Quote</router-link>
    </div>
  </div>
</template>

<script>
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { getCustomerProjects } from '@/models/projectModel';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from '@/constants/businessConstants';

export default {
  name: 'CustomerProjects',
  data() {
    return { projects: [], loading: false, error: '', currentUser: null, unsubscribeAuth: null };
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async user => {
      this.currentUser = user;
      if (user) await this.loadProjects();
    });
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
  },
  methods: {
    numberValue(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    },
    async loadProjects() {
      if (!this.currentUser) return;
      this.loading = true;
      this.error = '';
      try {
        const result = await getCustomerProjects(this.currentUser.uid);
        if (!result.success) throw new Error(result.error || 'Failed to load projects');
        this.projects = result.projects;
      } catch (error) {
        this.error = error.message || 'Unable to load your projects.';
      } finally {
        this.loading = false;
      }
    },
    shortId(value) {
      return String(value || 'unknown').slice(0, 12);
    },
    advancePaid(project) {
      return ['advance_paid', 'balance_paid'].includes(project.paymentStatus);
    },
    timelineSteps(project) {
      return [
        { label: 'Quote', completed: Boolean(project.quoteSentDate) },
        { label: 'Approved', completed: Boolean(project.approvalDate) },
        { label: 'Scheduled', completed: Boolean(project.installationScheduledDate) },
        { label: 'Installed', completed: Boolean(project.completionDate) }
      ];
    },
    getStatusLabel(status) {
      return PROJECT_STATUS_LABELS[status] || status || 'Unknown';
    },
    getStatusColor(status) {
      return PROJECT_STATUS_COLORS[status] || '#6c757d';
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
.customer-projects { min-height: 100vh; }
.card { border: 0; }
.payment-item { flex: 1; padding: 0.75rem; text-align: center; background: white; border: 2px solid #ddd; border-radius: 4px; opacity: 0.55; }
.payment-item.active { opacity: 1; border-color: #198754; background: #f0f8f4; }
.separator { padding: 0 0.5rem; color: #999; }
.timeline { display: flex; gap: 0.5rem; }
.timeline-item { flex: 1; text-align: center; opacity: 0.4; }
.timeline-item.completed { opacity: 1; }
.timeline-marker { width: 12px; height: 12px; background: #ddd; border-radius: 50%; margin: 0 auto 0.4rem; }
.timeline-item.completed .timeline-marker { background: #198754; }
.cost-section { border-left: 4px solid #0d6efd; }
</style>
