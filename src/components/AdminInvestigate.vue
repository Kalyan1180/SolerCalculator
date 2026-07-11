<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <h2 class="mb-1">Analytics & Reports</h2>
        <p class="text-muted mb-0">Business, payment, project, and stock metrics.</p>
      </div>
      <button class="btn btn-outline-primary" :disabled="loading" @click="loadAnalytics">
        <i class="fas fa-sync-alt me-1" :class="{ 'fa-spin': loading }"></i> Refresh
      </button>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="metrics?.legacyProjectCount" class="alert alert-warning">
      {{ metrics.legacyProjectCount }} old-schema project record(s) are excluded from these calculations.
    </div>
    <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div></div>

    <div v-if="!loading && metrics">
      <div class="row g-3 mb-4">
        <div v-for="card in primaryCards" :key="card.label" class="col-sm-6 col-xl-3">
          <div class="card metric-card h-100"><div class="card-body">
            <p class="text-muted mb-1">{{ card.label }}</p>
            <h3 :class="card.className">{{ card.currency ? `Rs ${formatCurrency(card.value)}` : card.value }}</h3>
            <small>{{ card.detail }}</small>
          </div></div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-lg-6">
          <section class="card h-100">
            <div class="card-header bg-primary text-white"><h5 class="mb-0">Project Status</h5></div>
            <div class="card-body">
              <div v-for="item in statusItems" :key="item.label" class="d-flex justify-content-between border-bottom py-2">
                <span>{{ item.label }}</span><strong>{{ item.value }}</strong>
              </div>
              <p class="text-center text-muted mt-3 mb-0">Completion rate: <strong>{{ numberValue(metrics.completionRate).toFixed(2) }}%</strong></p>
            </div>
          </section>
        </div>

        <div class="col-lg-6">
          <section class="card h-100">
            <div class="card-header bg-success text-white"><h5 class="mb-0">Payments</h5></div>
            <div class="card-body">
              <div v-for="item in paymentItems" :key="item.label" class="d-flex justify-content-between border-bottom py-2">
                <span>{{ item.label }}</span><strong :class="item.className">Rs {{ formatCurrency(item.value) }}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section class="card">
        <div class="card-header bg-warning"><h5 class="mb-0">Stock Inventory</h5></div>
        <div class="card-body">
          <div class="row text-center g-3">
            <div class="col-sm-6 col-lg-3"><p class="text-muted mb-1">Selling Value</p><h4>Rs {{ formatCurrency(metrics.totalInventoryValue) }}</h4></div>
            <div class="col-sm-6 col-lg-3"><p class="text-muted mb-1">Purchase Cost</p><h4>Rs {{ formatCurrency(metrics.totalInventoryCost) }}</h4></div>
            <div class="col-sm-6 col-lg-3"><p class="text-muted mb-1">Low Stock</p><h4 class="text-warning">{{ metrics.lowStockItems }}</h4></div>
            <div class="col-sm-6 col-lg-3"><p class="text-muted mb-1">Out of Stock</p><h4 class="text-danger">{{ metrics.outOfStockItems }}</h4></div>
          </div>
          <div class="text-center mt-3"><router-link to="/admin/inventory" class="btn btn-outline-primary btn-sm">Manage Stock</router-link></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { getAnalyticsDashboard } from '@/models/analyticsModel';

export default {
  name: 'AdminInvestigate',
  data() {
    return { metrics: null, loading: false, error: '' };
  },
  computed: {
    primaryCards() {
      if (!this.metrics) return [];
      return [
        { label: 'Projects', value: this.metrics.totalProjects, detail: `${this.metrics.completedProjects} completed`, currency: false, className: '' },
        { label: 'Quoted Revenue', value: this.metrics.totalRevenue, detail: `Completed: Rs ${this.formatCurrency(this.metrics.completedRevenue)}`, currency: true, className: '' },
        { label: 'Project Cost', value: this.metrics.totalCost, detail: `Completed: Rs ${this.formatCurrency(this.metrics.completedCost)}`, currency: true, className: '' },
        { label: 'Projected Profit', value: this.metrics.totalProfit, detail: `Margin: ${this.numberValue(this.metrics.profitMargin).toFixed(2)}%`, currency: true, className: this.metrics.totalProfit >= 0 ? 'text-success' : 'text-danger' }
      ];
    },
    statusItems() {
      if (!this.metrics) return [];
      return [
        { label: 'Quote Pending', value: this.metrics.pendingQuotes },
        { label: 'Quote Sent', value: this.metrics.quoteSentProjects },
        { label: 'Approved', value: this.metrics.approvedProjects },
        { label: 'Installation Scheduled', value: this.metrics.scheduledProjects },
        { label: 'In Progress', value: this.metrics.inProgressProjects },
        { label: 'Completed', value: this.metrics.completedProjects }
      ];
    },
    paymentItems() {
      if (!this.metrics) return [];
      return [
        { label: 'Total Collected', value: this.metrics.totalPaymentsReceived, className: 'text-success' },
        { label: 'Advance Collected', value: this.metrics.advanceReceived, className: 'text-success' },
        { label: 'Balance Collected', value: this.metrics.balanceReceived, className: 'text-success' },
        { label: 'Approved Balance Pending', value: this.metrics.balancePending, className: 'text-warning' }
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
.card { border: 0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); }
.metric-card { transition: transform 0.2s, box-shadow 0.2s; }
.metric-card:hover { transform: translateY(-3px); box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12); }
</style>
