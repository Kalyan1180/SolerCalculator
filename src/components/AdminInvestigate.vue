<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Business performance</h2>
        <p class="text-muted mb-0">Project, payment, profitability and stock indicators.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadAnalytics">
        <i class="fas fa-rotate me-2" :class="{ 'fa-spin': loading }" aria-hidden="true"></i>Refresh
      </button>
    </div>

    <div v-if="error" class="alert alert-danger"><i class="fas fa-circle-exclamation me-2"></i>{{ error }}</div>
    <div v-if="metrics?.legacyProjectCount" class="alert alert-warning">
      <i class="fas fa-triangle-exclamation me-2"></i>{{ metrics.legacyProjectCount }} old-schema project record(s) are excluded from these calculations.
    </div>
    <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div><p class="mt-3 text-muted">Calculating business metrics…</p></div>

    <div v-if="!loading && metrics">
      <div class="row g-3 mb-4">
        <div v-for="card in primaryCards" :key="card.label" class="col-sm-6 col-xl-3">
          <article class="metric-card card h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div><p class="text-muted mb-1">{{ card.label }}</p><h3 :class="card.className">{{ card.currency ? `Rs ${formatCurrency(card.value)}` : card.value }}</h3></div>
                <span class="metric-icon" :class="card.iconClass"><i :class="card.icon" aria-hidden="true"></i></span>
              </div>
              <small class="text-muted">{{ card.detail }}</small>
            </div>
          </article>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-xl-7">
          <section class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
              <div><h3 class="h5 mb-1">Project pipeline</h3><p class="small text-muted mb-0">Distribution across operational stages.</p></div>
              <span class="badge bg-light text-dark border">{{ metrics.totalProjects }} total</span>
            </div>
            <div class="card-body">
              <div v-for="item in statusItems" :key="item.label" class="pipeline-row">
                <div class="d-flex justify-content-between gap-3"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
                <div class="progress" role="progressbar" :aria-valuenow="statusPercentage(item.value)" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" :style="{ width: `${statusPercentage(item.value)}%` }"></div></div>
              </div>
              <div class="completion-summary mt-4"><span class="completion-summary__value">{{ numberValue(metrics.completionRate).toFixed(1) }}%</span><div><strong>Completion rate</strong><small>Completed projects across the valid project portfolio.</small></div></div>
            </div>
          </section>
        </div>

        <div class="col-xl-5">
          <section class="card h-100">
            <div class="card-header"><h3 class="h5 mb-1">Payment position</h3><p class="small text-muted mb-0">Collected and pending approved amounts.</p></div>
            <div class="card-body">
              <div v-for="item in paymentItems" :key="item.label" class="payment-row">
                <span class="payment-row__icon" :class="item.iconClass"><i :class="item.icon" aria-hidden="true"></i></span>
                <div class="flex-grow-1"><small>{{ item.label }}</small><strong :class="item.className">Rs {{ formatCurrency(item.value) }}</strong></div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section class="card">
        <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div><h3 class="h5 mb-1">Stock health</h3><p class="small text-muted mb-0">Current inventory value and availability.</p></div>
          <router-link v-if="canViewInventory" to="/admin/inventory" class="btn btn-sm btn-outline-primary">Open inventory <i class="fas fa-arrow-right ms-2"></i></router-link>
        </div>
        <div class="card-body">
          <div class="row g-3">
            <div v-for="stock in stockCards" :key="stock.label" class="col-sm-6 col-xl-3">
              <div class="stock-stat" :class="stock.className"><small>{{ stock.label }}</small><strong>{{ stock.currency ? `Rs ${formatCurrency(stock.value)}` : stock.value }}</strong></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { getAnalyticsDashboard } from '@/models/analyticsModel';
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

export default {
  name: 'AdminInvestigate',
  mixins: [rbacMixin],
  data() {
    return { metrics: null, loading: false, error: '' };
  },
  computed: {
    canViewInventory() {
      return this.can(PERMISSIONS.INVENTORY_READ);
    },
    primaryCards() {
      if (!this.metrics) return [];
      return [
        { label: 'Projects', value: this.metrics.totalProjects, detail: `${this.metrics.completedProjects} completed`, currency: false, className: '', icon: 'fas fa-folder-tree', iconClass: 'is-blue' },
        { label: 'Quoted revenue', value: this.metrics.totalRevenue, detail: `Completed: Rs ${this.formatCurrency(this.metrics.completedRevenue)}`, currency: true, className: '', icon: 'fas fa-chart-line', iconClass: 'is-teal' },
        { label: 'Project cost', value: this.metrics.totalCost, detail: `Completed: Rs ${this.formatCurrency(this.metrics.completedCost)}`, currency: true, className: '', icon: 'fas fa-receipt', iconClass: 'is-amber' },
        { label: 'Projected profit', value: this.metrics.totalProfit, detail: `Margin: ${this.numberValue(this.metrics.profitMargin).toFixed(2)}%`, currency: true, className: this.metrics.totalProfit >= 0 ? 'text-success' : 'text-danger', icon: 'fas fa-coins', iconClass: this.metrics.totalProfit >= 0 ? 'is-green' : 'is-red' }
      ];
    },
    statusItems() {
      if (!this.metrics) return [];
      return [
        { label: 'Quote pending', value: this.metrics.pendingQuotes },
        { label: 'Quote sent', value: this.metrics.quoteSentProjects },
        { label: 'Approved', value: this.metrics.approvedProjects },
        { label: 'Installation scheduled', value: this.metrics.scheduledProjects },
        { label: 'In progress', value: this.metrics.inProgressProjects },
        { label: 'Completed', value: this.metrics.completedProjects }
      ];
    },
    paymentItems() {
      if (!this.metrics) return [];
      return [
        { label: 'Total collected', value: this.metrics.totalPaymentsReceived, className: 'text-success', icon: 'fas fa-wallet', iconClass: 'is-green' },
        { label: 'Advance collected', value: this.metrics.advanceReceived, className: '', icon: 'fas fa-circle-check', iconClass: 'is-blue' },
        { label: 'Balance collected', value: this.metrics.balanceReceived, className: '', icon: 'fas fa-building-columns', iconClass: 'is-teal' },
        { label: 'Approved balance pending', value: this.metrics.balancePending, className: 'text-warning', icon: 'fas fa-clock', iconClass: 'is-amber' }
      ];
    },
    stockCards() {
      if (!this.metrics) return [];
      return [
        { label: 'Selling value', value: this.metrics.totalInventoryValue, currency: true, className: 'is-blue' },
        { label: 'Purchase cost', value: this.metrics.totalInventoryCost, currency: true, className: 'is-neutral' },
        { label: 'Low stock', value: this.metrics.lowStockItems, currency: false, className: 'is-amber' },
        { label: 'Out of stock', value: this.metrics.outOfStockItems, currency: false, className: 'is-red' }
      ];
    }
  },
  created() {
    this.loadAnalytics();
  },
  methods: {
    numberValue(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    },
    statusPercentage(value) {
      const total = this.numberValue(this.metrics?.totalProjects);
      return total > 0 ? Math.min(100, (this.numberValue(value) / total) * 100) : 0;
    },
    async loadAnalytics() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getAnalyticsDashboard();
        if (!result.success) throw new Error(result.error || 'Failed to load analytics');
        this.metrics = result.metrics;
      } catch (error) {
        this.error = error.message || 'Unable to load analytics.';
      } finally {
        this.loading = false;
      }
    },
    formatCurrency(value) {
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(this.numberValue(value));
    }
  }
};
</script>

<style scoped>
.metric-card { transition: transform 160ms ease, box-shadow 160ms ease; }
.metric-card:hover { transform: translateY(-2px); box-shadow: var(--ant-shadow-md); }
.metric-card h3 { margin-bottom: 0.35rem; font-size: clamp(1.2rem, 2vw, 1.55rem); }
.metric-icon, .payment-row__icon { display: grid; place-items: center; flex: 0 0 42px; width: 42px; height: 42px; border-radius: 11px; }
.is-blue { color: var(--ant-blue-700); background: #eff4ff; }
.is-teal { color: var(--ant-teal-600); background: #f0fdfa; }
.is-green { color: var(--ant-green-600); background: #ecfdf3; }
.is-amber { color: var(--ant-amber-600); background: #fffaeb; }
.is-red { color: var(--ant-red-600); background: #fef3f2; }
.pipeline-row + .pipeline-row { margin-top: 1rem; }
.pipeline-row .progress { height: 7px; margin-top: 0.45rem; border-radius: 999px; background: var(--ant-slate-100); }
.pipeline-row .progress-bar { border-radius: 999px; background: linear-gradient(90deg, var(--ant-blue-700), var(--ant-teal-600)); }
.completion-summary { display: flex; align-items: center; gap: 0.9rem; padding: 1rem; border-radius: 12px; color: #1849a9; background: #eff4ff; }
.completion-summary__value { font-size: 1.6rem; font-weight: 800; }
.completion-summary small, .completion-summary strong { display: block; }
.payment-row { display: flex; align-items: center; gap: 0.8rem; padding: 0.85rem 0; border-bottom: 1px solid var(--ant-slate-200); }
.payment-row:last-child { border-bottom: 0; }
.payment-row small, .payment-row strong { display: block; }
.payment-row small { color: var(--ant-slate-500); }
.payment-row strong { margin-top: 0.15rem; font-size: 1.05rem; }
.stock-stat { height: 100%; padding: 1rem; border: 1px solid var(--ant-slate-200); border-radius: 11px; background: var(--ant-slate-50); }
.stock-stat small, .stock-stat strong { display: block; }
.stock-stat small { color: var(--ant-slate-500); }
.stock-stat strong { margin-top: 0.3rem; color: var(--ant-slate-950); font-size: 1.25rem; }
.stock-stat.is-blue { border-color: #b2ccff; background: #eff4ff; }
.stock-stat.is-amber { border-color: #fedf89; background: #fffaeb; }
.stock-stat.is-red { border-color: #fecdca; background: #fef3f2; }
</style>
