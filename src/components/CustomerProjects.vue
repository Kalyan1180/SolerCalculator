<template>
  <div class="customer-projects container py-4">
    <h2 class="mb-4">My Solar Projects</h2>

    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading your projects...</p>
    </div>

    <div v-if="error" class="alert alert-danger alert-dismissible fade show">
      {{ error }}
      <button type="button" class="btn-close" @click="error = ''" aria-label="Close"></button>
    </div>

    <div v-if="!loading && projects.length" class="row">
      <div v-for="project in projects" :key="project.id || project.projectId" class="col-md-6 mb-4">
        <div class="card h-100 shadow-sm">
          <div class="card-header" :style="{ backgroundColor: getStatusColor(project.status), color: 'white' }">
            <div class="d-flex justify-content-between align-items-center gap-2">
              <h5 class="mb-0">Project #{{ String(project.projectId || project.id).slice(0, 12) }}</h5>
              <span class="badge bg-light text-dark">{{ getStatusLabel(project.status) }}</span>
            </div>
          </div>

          <div class="card-body">
            <div class="mb-3">
              <p class="mb-1"><strong>Panels:</strong> {{ project.panelCount }}</p>
              <p class="mb-1"><strong>Inverter:</strong> {{ project.inverter?.name || 'N/A' }}</p>
              <p class="mb-1"><strong>Battery:</strong> {{ project.battery?.selectedBattery?.name || 'N/A' }}</p>
            </div>

            <div class="cost-section mb-3 p-3 bg-light rounded">
              <p class="mb-2">
                <strong>Quoted Price:</strong>
                <span class="text-primary">₹{{ formatCurrency(project.finalPrice || project.quotedPrice) }}</span>
              </p>
              <p class="mb-0"><strong>Payment:</strong> {{ getPaymentLabel(project.paymentStatus) }}</p>
              <div class="d-flex align-items-center mt-3">
                <div class="payment-item" :class="{ active: advancePaid(project) }">
                  <small>Advance</small>
                  <strong class="d-block">₹{{ formatCurrency(project.advanceAmount) }}</strong>
                </div>
                <div class="separator">→</div>
                <div class="payment-item" :class="{ active: project.paymentStatus === 'balance_paid' }">
                  <small>Balance</small>
                  <strong class="d-block">₹{{ formatCurrency(project.balanceAmount) }}</strong>
                </div>
              </div>
            </div>

            <div class="timeline mb-3">
              <div class="timeline-item" :class="{ completed: statusReached(project.status, 'quote_sent') }">
                <div class="timeline-marker"></div><small>Quote</small>
              </div>
              <div class="timeline-item" :class="{ completed: statusReached(project.status, 'approved') }">
                <div class="timeline-marker"></div><small>Approved</small>
              </div>
              <div class="timeline-item" :class="{ completed: statusReached(project.status, 'in_progress') }">
                <div class="timeline-marker"></div><small>Installation</small>
              </div>
              <div class="timeline-item" :class="{ completed: statusReached(project.status, 'completed') }">
                <div class="timeline-marker"></div><small>Completed</small>
              </div>
            </div>

            <div v-if="project.customerNotes" class="alert alert-info mb-0">
              <small><strong>Notes:</strong> {{ project.customerNotes }}</small>
            </div>
          </div>

          <div class="card-footer bg-light">
            <small class="text-muted">Created: {{ formatDate(project.createdAt) }}</small>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!loading && !projects.length && !error" class="text-center my-5">
      <i class="fas fa-inbox fa-4x text-muted mb-3"></i>
      <p class="text-muted">No solar projects yet.</p>
      <router-link to="/solercalc" class="btn btn-primary mt-3">
        <i class="fas fa-calculator me-2"></i>Get a Quote
      </router-link>
    </div>
  </div>
</template>

<script>
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import { getCustomerProjects } from '@/models/projectModel';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PAYMENT_STATUS_LABELS
} from '@/constants/businessConstants';

const STATUS_ORDER = ['quote_pending', 'quote_sent', 'approved', 'installation_scheduled', 'in_progress', 'completed'];

export default {
  name: 'CustomerProjects',
  data() {
    return {
      projects: [],
      loading: true,
      error: '',
      currentUser: null,
      unsubscribeAuth: null
    };
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) await this.loadProjects();
    });
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
  },
  methods: {
    async loadProjects() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getCustomerProjects(this.currentUser.uid);
        if (!result.success) throw new Error(result.error || 'Failed to load projects.');
        this.projects = result.projects;
      } catch (error) {
        console.error('Error loading projects:', error);
        this.error = error.message || 'Error loading your projects.';
      } finally {
        this.loading = false;
      }
    },
    advancePaid(project) {
      return ['advance_paid', 'balance_paid'].includes(project.paymentStatus);
    },
    statusReached(current, target) {
      const currentIndex = STATUS_ORDER.indexOf(current);
      const targetIndex = STATUS_ORDER.indexOf(target);
      return currentIndex >= targetIndex && targetIndex >= 0;
    },
    getStatusLabel(status) {
      return PROJECT_STATUS_LABELS[status] || status || 'Unknown';
    },
    getStatusColor(status) {
      return PROJECT_STATUS_COLORS[status] || '#6c757d';
    },
    getPaymentLabel(status) {
      return PAYMENT_STATUS_LABELS[status] || 'Not Started';
    },
    formatCurrency(value) {
      const number = Number(value);
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number.isFinite(number) ? number : 0);
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
.card { border: none; border-radius: 8px; }
.payment-item { flex: 1; padding: 0.75rem; text-align: center; background: white; border-radius: 4px; border: 2px solid #ddd; opacity: 0.5; }
.payment-item.active { opacity: 1; border-color: #28a745; background-color: #f0f8f4; }
.separator { padding: 0 0.5rem; color: #999; }
.timeline { display: flex; gap: 0.5rem; align-items: flex-start; }
.timeline-item { flex: 1; text-align: center; opacity: 0.4; }
.timeline-item.completed { opacity: 1; }
.timeline-marker { width: 12px; height: 12px; background: #ddd; border-radius: 50%; margin: 0 auto 0.5rem; }
.timeline-item.completed .timeline-marker { background: #28a745; }
.cost-section { border-left: 4px solid #007bff; }
</style>
