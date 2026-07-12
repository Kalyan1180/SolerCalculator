<template>
  <div class="marketing-page">
    <section class="marketing-section">
      <div class="marketing-container">
        <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
          <div>
            <span class="marketing-eyebrow"><i class="fas fa-folder-open" aria-hidden="true"></i>Customer workspace</span>
            <h1 class="h2 mb-2">My Solar Projects</h1>
            <p class="text-muted mb-0">Track your quotation, payments, installation schedule and project updates.</p>
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
          <div v-for="project in projects" :key="project.id || project.projectId" class="col-12">
            <article class="card project-card">
              <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-3">
                <div>
                  <small class="text-muted d-block">Project</small>
                  <h2 class="h5 mb-0">#{{ shortId(project.projectId || project.id) }}</h2>
                </div>
                <span class="status-badge text-white" :style="{ backgroundColor: getStatusColor(project.status) }">{{ getStatusLabel(project.status) }}</span>
              </div>

              <div class="card-body">
                <div class="next-step mb-4">
                  <span class="next-step__icon"><i class="fas fa-compass"></i></span>
                  <div><small>What happens next</small><strong>{{ nextStep(project.status) }}</strong></div>
                </div>

                <div class="row g-3 mb-4">
                  <div class="col-md-4"><div class="project-fact"><small>Solar panels</small><strong>{{ numberValue(project.panelCount) }} × {{ project.panel?.name || 'Solar panel' }}</strong></div></div>
                  <div class="col-md-4"><div class="project-fact"><small>Inverter</small><strong>{{ project.inverter?.name || 'To be confirmed' }}</strong></div></div>
                  <div class="col-md-4"><div class="project-fact"><small>Battery</small><strong>{{ project.battery?.selectedBattery ? `${numberValue(project.battery.quantity)} × ${project.battery.selectedBattery.name}` : 'Not required' }}</strong></div></div>
                </div>

                <div class="row g-4">
                  <div class="col-lg-5">
                    <section class="customer-panel h-100">
                      <h3 class="h6 mb-3">Payment summary</h3>
                      <div class="payment-row"><span>Project value</span><strong>Rs {{ formatCurrency(project.quotedPrice) }}</strong></div>
                      <div class="payment-row"><span>Advance agreed</span><strong>Rs {{ formatCurrency(project.advanceAmount) }} <small>({{ numberValue(project.advancePercentage) }}%)</small></strong></div>
                      <div class="payment-row"><span>Amount received</span><strong class="text-success">Rs {{ formatCurrency(amountPaid(project)) }}</strong></div>
                      <div class="payment-row"><span>Amount remaining</span><strong :class="amountDue(project) > 0 ? 'text-danger' : 'text-success'">Rs {{ formatCurrency(amountDue(project)) }}</strong></div>
                      <div class="progress mt-3" style="height:8px"><div class="progress-bar bg-success" :style="{ width: `${paymentProgress(project)}%` }"></div></div>
                      <small class="text-muted">{{ paymentProgress(project).toFixed(0) }}% paid</small>

                      <div v-if="project.paymentHistory?.length" class="mt-4">
                        <h4 class="small fw-bold">Payments received</h4>
                        <div v-for="payment in project.paymentHistory" :key="payment.paymentId || `${payment.recordedAt}-${payment.amount}`" class="receipt-row">
                          <div><strong>Rs {{ formatCurrency(payment.amount) }}</strong><small>{{ payment.method || 'Payment' }}<span v-if="payment.reference"> · {{ payment.reference }}</span></small></div>
                          <span>{{ formatDate(payment.receivedAt || payment.recordedAt) }}</span>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div class="col-lg-7">
                    <section class="customer-panel h-100">
                      <h3 class="h6 mb-3">Project updates</h3>
                      <div v-if="project.statusHistory?.length" class="update-timeline">
                        <div v-for="(entry, index) in orderedStatusHistory(project)" :key="`${entry.changedAt}-${index}`" class="update-entry">
                          <span class="update-dot"><i class="fas fa-check"></i></span>
                          <div><div class="d-flex flex-wrap justify-content-between gap-2"><strong>{{ getStatusLabel(entry.to) }}</strong><small class="text-muted">{{ formatDateTime(entry.changedAt) }}</small></div><p v-if="entry.message" class="mb-0 text-muted">{{ entry.message }}</p></div>
                        </div>
                      </div>
                      <div v-else class="text-muted">Updates from our team will appear here.</div>
                    </section>
                  </div>
                </div>

                <div v-if="project.installationScheduledDate" class="schedule-banner mt-4">
                  <i class="fas fa-calendar-check"></i>
                  <div><small>Installation scheduled</small><strong>{{ formatDate(project.installationScheduledDate) }}</strong></div>
                </div>
                <div v-if="project.customerNotes" class="alert alert-info mt-4 mb-0"><strong class="d-block mb-1">Your notes</strong>{{ project.customerNotes }}</div>
              </div>

              <div class="card-footer bg-white border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
                <small class="text-muted">Created {{ formatDate(project.createdAt) }}</small>
                <span class="small fw-semibold text-primary">Need help? Contact ANT Solar and quote your project ID.</span>
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

const NEXT_STEPS = Object.freeze({
  quote_pending: 'Our team is preparing your quotation.',
  quote_sent: 'Review the quotation and contact us with any questions.',
  quote_rejected: 'Contact us if you would like a revised solution.',
  approved: 'Complete the agreed advance payment so scheduling can proceed.',
  installation_scheduled: 'Keep the installation area accessible on the scheduled date.',
  in_progress: 'Our team is installing and commissioning your solar system.',
  completed: 'Your installation is complete. Contact us for service or warranty support.',
  cancelled: 'Contact us if you would like to restart this project.'
});

export default {
  name: 'CustomerProjects',
  data() { return { projects: [], loading: false, error: '', currentUser: null, unsubscribeAuth: null }; },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async user => {
      this.currentUser = user;
      if (user) await this.loadProjects();
    });
  },
  beforeUnmount() { if (this.unsubscribeAuth) this.unsubscribeAuth(); },
  methods: {
    numberValue(value) { const number = Number(value); return Number.isFinite(number) ? number : 0; },
    toDate(value) { if (!value) return null; if (typeof value.toDate === 'function') return value.toDate(); if (value._seconds) return new Date(value._seconds * 1000); const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; },
    async loadProjects() {
      if (!this.currentUser) return;
      this.loading = true; this.error = '';
      try { const result = await getCustomerProjects(); if (!result.success) throw new Error(result.error || 'Failed to load projects'); this.projects = result.projects; }
      catch (error) { this.error = error.message || 'Unable to load your projects.'; }
      finally { this.loading = false; }
    },
    shortId(value) { return String(value || 'unknown').slice(0, 18); },
    amountPaid(project) { const explicit = this.numberValue(project.amountPaid); return explicit || (project.paymentHistory || []).reduce((sum, payment) => sum + this.numberValue(payment.amount), 0); },
    amountDue(project) { return Math.max(0, this.numberValue(project.quotedPrice) - this.amountPaid(project)); },
    paymentProgress(project) { return this.numberValue(project.quotedPrice) > 0 ? Math.min(100, this.amountPaid(project) / this.numberValue(project.quotedPrice) * 100) : 0; },
    orderedStatusHistory(project) { return [...(project.statusHistory || [])].sort((a, b) => (this.toDate(b.changedAt)?.getTime() || 0) - (this.toDate(a.changedAt)?.getTime() || 0)); },
    nextStep(status) { return NEXT_STEPS[status] || 'Our team will contact you with the next update.'; },
    getStatusLabel(status) { return PROJECT_STATUS_LABELS[status] || status || 'Unknown'; },
    getStatusColor(status) { return PROJECT_STATUS_COLORS[status] || '#667085'; },
    formatCurrency(value) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(this.numberValue(value)); },
    formatDate(value) { const date = this.toDate(value); return date ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date) : 'Not set'; },
    formatDateTime(value) { const date = this.toDate(value); return date ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Pending'; }
  }
};
</script>

<style scoped>
.project-card { overflow:hidden; }.status-badge { padding:.45rem .75rem; border-radius:999px; font-size:.78rem; font-weight:800; }
.next-step { display:flex; align-items:center; gap:.8rem; padding:1rem; border:1px solid #bfdbfe; border-radius:12px; background:#eff6ff; }.next-step__icon { display:grid; place-items:center; width:42px; height:42px; border-radius:11px; background:#dbeafe; color:#1d4ed8; }.next-step small,.next-step strong { display:block; }.next-step small { color:#64748b; }
.project-fact { height:100%; padding:1rem; border:1px solid var(--ant-slate-200); border-radius:12px; background:var(--ant-slate-50); }.project-fact small,.project-fact strong { display:block; }.project-fact small { color:var(--ant-slate-500); }.project-fact strong { margin-top:.3rem; }
.customer-panel { padding:1rem; border:1px solid var(--ant-slate-200); border-radius:12px; }.payment-row { display:flex; justify-content:space-between; gap:1rem; padding:.5rem 0; border-bottom:1px solid var(--ant-slate-100); }.payment-row span { color:var(--ant-slate-500); }
.receipt-row { display:flex; justify-content:space-between; gap:1rem; padding:.65rem 0; border-top:1px solid var(--ant-slate-100); }.receipt-row strong,.receipt-row small { display:block; }.receipt-row small,.receipt-row > span { color:var(--ant-slate-500); font-size:.8rem; }
.update-timeline { display:grid; gap:1rem; }.update-entry { display:grid; grid-template-columns:30px 1fr; gap:.75rem; }.update-dot { display:grid; place-items:center; width:28px; height:28px; border-radius:50%; background:#dcfce7; color:#166534; font-size:.7rem; }
.schedule-banner { display:flex; align-items:center; gap:.8rem; padding:1rem; border-radius:12px; background:#f0fdf4; color:#166534; }.schedule-banner i { font-size:1.3rem; }.schedule-banner small,.schedule-banner strong { display:block; }
</style>
