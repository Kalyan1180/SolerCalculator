<template>
  <div class="marketing-page">
    <section class="marketing-section">
      <div class="marketing-container">
        <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
          <div>
            <span class="marketing-eyebrow"><i class="fas fa-folder-open" aria-hidden="true"></i>Customer workspace</span>
            <h1 class="h2 mb-2">My Solar Projects</h1>
            <p class="text-muted mb-0">Track quotation, approval, payment and installation progress.</p>
          </div>
          <button class="btn btn-outline-secondary" :disabled="loading" @click="loadProjects">
            <i class="fas fa-rotate me-2" aria-hidden="true"></i>Refresh
          </button>
        </div>

        <div v-if="loading" class="text-center my-5" role="status">
          <div class="spinner-border text-primary"></div>
          <p class="mt-3 text-muted">Loading your projects…</p>
        </div>
        <div v-if="error" class="alert alert-danger"><i class="fas fa-circle-exclamation me-2"></i>{{ error }}</div>

        <div v-if="!loading && projects.length" class="row g-4">
          <div v-for="project in projects" :key="project.id || project.projectId" class="col-xl-6">
            <article class="card h-100">
              <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <small class="text-muted d-block">Project</small>
                  <h2 class="h5 mb-0">#{{ shortId(project.projectId || project.id) }}</h2>
                </div>
                <span class="badge text-white" :style="{ backgroundColor: getStatusColor(project.status) }">{{ getStatusLabel(project.status) }}</span>
              </div>

              <div class="card-body">
                <div class="row g-3 mb-4">
                  <div class="col-sm-4"><div class="project-fact"><small>Panels</small><strong>{{ numberValue(project.panelCount) }}</strong></div></div>
                  <div class="col-sm-4"><div class="project-fact"><small>Inverter</small><strong>{{ project.inverter?.name || 'N/A' }}</strong></div></div>
                  <div class="col-sm-4"><div class="project-fact"><small>Battery</small><strong>{{ project.battery?.selectedBattery?.name || 'Not required' }}</strong></div></div>
                </div>

                <div class="project-price mb-4">
                  <span class="text-muted">Quoted price</span>
                  <strong>Rs {{ formatCurrency(project.quotedPrice) }}</strong>
                </div>

                <div class="payment-grid mb-4">
                  <div class="payment-item" :class="{ active: advancePaid(project) }">
                    <span class="payment-icon"><i :class="advancePaid(project) ? 'fas fa-circle-check' : 'far fa-circle'" aria-hidden="true"></i></span>
                    <div><small>Advance</small><strong>Rs {{ formatCurrency(project.advanceAmount) }}</strong></div>
                  </div>
                  <div class="payment-item" :class="{ active: project.paymentStatus === 'balance_paid' }">
                    <span class="payment-icon"><i :class="project.paymentStatus === 'balance_paid' ? 'fas fa-circle-check' : 'far fa-circle'" aria-hidden="true"></i></span>
                    <div><small>Balance</small><strong>Rs {{ formatCurrency(project.balanceAmount) }}</strong></div>
                  </div>
                </div>

                <div class="project-timeline" aria-label="Project progress">
                  <div v-for="step in timelineSteps(project)" :key="step.label" class="project-timeline__step" :class="{ completed: step.completed }">
                    <span class="project-timeline__dot"><i v-if="step.completed" class="fas fa-check" aria-hidden="true"></i></span>
                    <small>{{ step.label }}</small>
                  </div>
                </div>

                <div v-if="project.customerNotes" class="alert alert-info mt-4 mb-0">
                  <strong class="d-block mb-1">Your notes</strong>{{ project.customerNotes }}
                </div>
              </div>

              <div class="card-footer bg-white border-top d-flex justify-content-between align-items-center">
                <small class="text-muted">Created {{ formatDate(project.createdAt) }}</small>
                <span class="small fw-semibold text-primary">{{ getStatusLabel(project.status) }}</span>
              </div>
            </article>
          </div>
        </div>

        <section v-if="!loading && !projects.length && !error" class="card enterprise-empty-state">
          <div class="enterprise-empty-state__icon"><i class="fas fa-solar-panel" aria-hidden="true"></i></div>
          <h2 class="h4">No solar projects yet</h2>
          <p class="text-muted">Use the calculator to prepare a system estimate and submit your first requirement.</p>
          <router-link to="/solercalc" class="btn btn-primary">Start a solar estimate</router-link>
        </section>
      </div>
    </section>
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
      return PROJECT_STATUS_COLORS[status] || '#667085';
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
.project-fact { height: 100%; padding: 0.9rem; border: 1px solid var(--ant-slate-200); border-radius: 10px; background: var(--ant-slate-50); }
.project-fact small, .project-fact strong { display: block; }
.project-fact small { color: var(--ant-slate-500); }
.project-fact strong { margin-top: 0.25rem; color: var(--ant-slate-800); }
.project-price { display: flex; align-items: center; justify-content: space-between; padding: 1rem; border-radius: 10px; background: #eff4ff; }
.project-price strong { color: var(--ant-blue-700); font-size: 1.15rem; }
.payment-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.payment-item { display: flex; align-items: center; gap: 0.65rem; padding: 0.9rem; border: 1px solid var(--ant-slate-200); border-radius: 10px; opacity: 0.7; }
.payment-item.active { border-color: #abefc6; background: #ecfdf3; opacity: 1; }
.payment-item small, .payment-item strong { display: block; }
.payment-icon { color: var(--ant-slate-400); }
.payment-item.active .payment-icon { color: var(--ant-green-600); }
.project-timeline { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; }
.project-timeline__step { position: relative; display: grid; justify-items: center; gap: 0.45rem; color: var(--ant-slate-400); text-align: center; }
.project-timeline__step::before { position: absolute; top: 15px; left: calc(-50% + 15px); width: calc(100% - 30px); height: 2px; background: var(--ant-slate-200); content: ''; }
.project-timeline__step:first-child::before { display: none; }
.project-timeline__step.completed { color: var(--ant-green-600); }
.project-timeline__step.completed::before { background: var(--ant-green-600); }
.project-timeline__dot { z-index: 1; display: grid; place-items: center; width: 30px; height: 30px; border: 2px solid var(--ant-slate-300); border-radius: 50%; background: #fff; font-size: 0.68rem; }
.project-timeline__step.completed .project-timeline__dot { border-color: var(--ant-green-600); color: #fff; background: var(--ant-green-600); }
@media (max-width: 575.98px) { .payment-grid { grid-template-columns: 1fr; } }
</style>
