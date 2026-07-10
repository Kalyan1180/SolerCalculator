<template>
  <div class="admin-investigate container-fluid py-4">
    <h2 class="mb-4">Analytics & Reports</h2>

    <!-- Loading State -->
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading analytics...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="alert alert-danger alert-dismissible fade show">
      {{ error }}
      <button type="button" class="btn-close" @click="error = ''" aria-label="Close"></button>
    </div>

    <!-- Analytics Content -->
    <div v-if="!loading && metrics" class="analytics-content">
      <!-- Key Metrics Grid -->
      <div class="row mb-4">
        <div class="col-md-3 mb-3">
          <div class="card metric-card">
            <div class="card-body">
              <p class="card-text text-muted">Total Projects</p>
              <h3 class="card-title">{{ metrics.totalProjects }}</h3>
              <small class="text-success">{{ metrics.completedProjects }} Completed</small>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card metric-card">
            <div class="card-body">
              <p class="card-text text-muted">Total Revenue</p>
              <h3 class="card-title">₹{{ formatCurrency(metrics.totalRevenue) }}</h3>
              <small class="text-info">Completed: ₹{{ formatCurrency(metrics.completedRevenue) }}</small>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card metric-card">
            <div class="card-body">
              <p class="card-text text-muted">Total Cost</p>
              <h3 class="card-title">₹{{ formatCurrency(metrics.totalCost) }}</h3>
              <small class="text-warning">Inventory: ₹{{ formatCurrency(metrics.totalInventoryCost) }}</small>
            </div>
          </div>
        </div>
        <div class="col-md-3 mb-3">
          <div class="card metric-card">
            <div class="card-body">
              <p class="card-text text-muted">Total Profit</p>
              <h3 class="card-title" :style="{ color: metrics.totalProfit >= 0 ? '#28a745' : '#dc3545' }">
                ₹{{ formatCurrency(metrics.totalProfit) }}
              </h3>
              <small>Margin: {{ metrics.profitMargin }}%</small>
            </div>
          </div>
        </div>
      </div>

      <!-- Project Status Grid -->
      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-primary text-white">
              <h5 class="mb-0">Project Status Breakdown</h5>
            </div>
            <div class="card-body">
              <div class="status-list">
                <div class="status-item">
                  <span class="badge" style="background-color: #FFC107;">Pending Quote</span>
                  <strong>{{ metrics.pendingQuotes }}</strong>
                </div>
                <div class="status-item">
                  <span class="badge" style="background-color: #4CAF50;">Approved</span>
                  <strong>{{ metrics.approvedProjects }}</strong>
                </div>
                <div class="status-item">
                  <span class="badge" style="background-color: #673AB7;">In Progress</span>
                  <strong>{{ metrics.inProgressProjects }}</strong>
                </div>
                <div class="status-item">
                  <span class="badge" style="background-color: #8BC34A;">Completed</span>
                  <strong>{{ metrics.completedProjects }}</strong>
                </div>
              </div>
              <div class="mt-3">
                <p class="text-center text-muted">
                  Completion Rate: <strong>{{ metrics.completionRate }}%</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <div class="card">
            <div class="card-header bg-success text-white">
              <h5 class="mb-0">Payment Status</h5>
            </div>
            <div class="card-body">
              <div class="payment-item">
                <span>Advance Received</span>
                <strong class="text-success">₹{{ formatCurrency(metrics.advanceReceived) }}</strong>
              </div>
              <hr>
              <div class="payment-item">
                <span>Balance Pending</span>
                <strong class="text-warning">₹{{ formatCurrency(metrics.balancePending) }}</strong>
              </div>
              <hr>
              <div class="payment-item">
                <span>Expected Revenue</span>
                <strong class="text-info">₹{{ formatCurrency(metrics.advanceReceived + metrics.balancePending) }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory Status -->
      <div class="row mb-4">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header bg-warning text-white">
              <h5 class="mb-0">Inventory Status</h5>
            </div>
            <div class="card-body">
              <div class="row text-center">
                <div class="col-md-3">
                  <p class="text-muted">Total Value</p>
                  <h4>₹{{ formatCurrency(metrics.totalInventoryValue) }}</h4>
                </div>
                <div class="col-md-3">
                  <p class="text-muted">Low Stock Items</p>
                  <h4 class="text-warning">{{ metrics.lowStockItems }}</h4>
                </div>
                <div class="col-md-3">
                  <p class="text-muted">Out of Stock</p>
                  <h4 class="text-danger">{{ metrics.outOfStockItems }}</h4>
                </div>
                <div class="col-md-3">
                  <router-link to="/admin/inventory" class="btn btn-outline-primary btn-sm">
                    Manage Inventory
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Refresh Button -->
      <div class="text-center mt-4">
        <button class="btn btn-outline-primary" @click="loadAnalytics" :disabled="loading">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i> Refresh Data
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { getAnalyticsDashboard } from '@/models/analyticsModel';

export default {
  name: 'AdminInvestigate',
  data() {
    return {
      metrics: null,
      loading: false,
      error: ''
    };
  },
  created() {
    this.loadAnalytics();
  },
  methods: {
    async loadAnalytics() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getAnalyticsDashboard();
        if (result.success) {
          this.metrics = result.metrics;
        } else {
          this.error = result.error || 'Failed to load analytics';
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
        this.error = 'Error loading analytics: ' + error.message;
      } finally {
        this.loading = false;
      }
    },
    formatCurrency(value) {
      return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        maximumFractionDigits: 0
      }).format(value);
    }
  }
};
</script>

<style scoped>
.metric-card {
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.status-item:last-child {
  border-bottom: none;
}

.status-item strong {
  font-size: 1.2rem;
}

.payment-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.card {
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.card-header {
  border-radius: 8px 8px 0 0;
}

.fa-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
