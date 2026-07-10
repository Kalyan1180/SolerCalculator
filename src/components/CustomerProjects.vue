<template>
  <div class="customer-projects container py-4">
    <h2 class="mb-4">My Solar Projects</h2>

    <!-- Loading State -->
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading your projects...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="alert alert-danger alert-dismissible fade show">
      {{ error }}
      <button type="button" class="btn-close" @click="error = ''" aria-label="Close"></button>
    </div>

    <!-- Projects List -->
    <div v-if="!loading && projects.length" class="row">
      <div v-for="project in projects" :key="project.projectId" class="col-md-6 mb-4">
        <div class="card h-100 shadow-sm">
          <!-- Header with Status -->
          <div class="card-header" :style="{ backgroundColor: getStatusColor(project.status), color: 'white' }">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="mb-0">Project #{{ project.projectId.substring(0, 12) }}</h5>
              <span class="badge bg-light text-dark">{{ getStatusLabel(project.status) }}</span>
            </div>
          </div>

          <div class="card-body">
            <!-- Project Details -->
            <div class="mb-3">
              <p class="mb-1"><strong>Panels Required:</strong> {{ project.panelCount }}</p>
              <p class="mb-1"><strong>Inverter:</strong> {{ project.inverter?.name || 'N/A' }}</p>
              <p class="mb-1"><strong>Battery:</strong> {{ project.battery?.selectedBattery?.name || 'N/A' }}</p>
            </div>

            <!-- Cost & Payment Section -->
            <div class="cost-section mb-3 p-3 bg-light rounded">
              <p class="mb-2"><strong>Quoted Price:</strong> <span class="text-primary">₹{{ formatCurrency(project.quotedPrice) }}</span></p>
              
              <div class="payment-status mt-2">
                <small class="text-muted">Payment Status:</small>
                <div class="d-flex align-items-center mt-1">
                  <div class="payment-item" :class="{ active: project.paymentStatus === 'advance_paid' || project.paymentStatus === 'balance_paid' }">
                    <span class="text-xs">Advance (50%)</span>
                    <strong class="d-block">₹{{ formatCurrency(project.advanceAmount || 0) }}</strong>
                  </div>
                  <div class="separator">→</div>
                  <div class="payment-item" :class="{ active: project.paymentStatus === 'balance_paid' }">
                    <span class="text-xs">Balance (50%)</span>
                    <strong class="d-block">₹{{ formatCurrency(project.balanceAmount || 0) }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Timeline -->
            <div class="timeline mb-3">
              <div class="timeline-item" :class="{ completed: project.quoteSentDate }">
                <div class="timeline-marker"></div>
                <p class="mb-0"><small>Quote Sent</small></p>
              </div>
              <div class="timeline-item" :class="{ completed: project.approvalDate }">
                <div class="timeline-marker"></div>
                <p class="mb-0"><small>Approved</small></p>
              </div>
              <div class="timeline-item" :class="{ completed: project.installationStartDate }">
                <div class="timeline-marker"></div>
                <p class="mb-0"><small>Installation</small></p>
              </div>
              <div class="timeline-item" :class="{ completed: project.completionDate }">
                <div class="timeline-marker"></div>
                <p class="mb-0"><small>Completed</small></p>
              </div>
            </div>

            <!-- Customer Notes -->
            <div v-if="project.customerNotes" class="alert alert-info mb-0">
              <small><strong>Notes:</strong> {{ project.customerNotes }}</small>
            </div>
          </div>

          <div class="card-footer bg-light">
            <small class="text-muted">
              Created: {{ formatDate(project.createdAt) }}
            </small>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !projects.length" class="text-center my-5">
      <i class="fas fa-inbox fa-4x text-muted mb-3"></i>
      <p class="text-muted">No solar projects yet.</p>
      <router-link to="/solercalc" class="btn btn-primary mt-3">
        <i class="fas fa-calculator me-2"></i>Get a Quote
      </router-link>
    </div>
  </div>
</template>

<script>
import { getCustomerProjects } from '@/models/projectModel';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/constants/businessConstants';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export default {
  name: 'CustomerProjects',
  data() {
    return {
      projects: [],
      loading: false,
      error: '',
      currentUser: null
    };
  },
  created() {
    const authInstance = getAuth();
    onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadProjects();
      } else {
        this.$router.push('/login');
      }
    });
  },
  methods: {
    async loadProjects() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getCustomerProjects(this.currentUser.uid);
        if (result.success) {
          this.projects = result.projects;
        } else {
          this.error = result.error || 'Failed to load projects';
        }
      } catch (error) {
        console.error('Error loading projects:', error);
        this.error = 'Error loading your projects';
      } finally {
        this.loading = false;
      }
    },
    getStatusLabel(status) {
      return PROJECT_STATUS_LABELS[status] || status;
    },
    getStatusColor(status) {
      return PROJECT_STATUS_COLORS[status] || '#999';
    },
    formatCurrency(value) {
      return new Intl.NumberFormat('en-IN', {
        style: 'decimal',
        maximumFractionDigits: 0
      }).format(value);
    },
    formatDate(timestamp) {
      if (!timestamp) return 'N/A';
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-IN').format(date);
    }
  }
};
</script>

<style scoped>
.customer-projects {
  background-color: #f8f9fa;
  min-height: 100vh;
}

.card {
  border: none;
  border-radius: 8px;
}

.payment-item {
  flex: 1;
  padding: 0.75rem;
  text-align: center;
  background: white;
  border-radius: 4px;
  border: 2px solid #ddd;
  opacity: 0.5;
  transition: all 0.3s;
}

.payment-item.active {
  opacity: 1;
  border-color: #28a745;
  background-color: #f0f8f4;
}

.separator {
  padding: 0 0.5rem;
  color: #999;
}

.timeline {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.timeline-item {
  flex: 1;
  text-align: center;
  opacity: 0.4;
  transition: opacity 0.3s;
}

.timeline-item.completed {
  opacity: 1;
}

.timeline-marker {
  width: 12px;
  height: 12px;
  background: #ddd;
  border-radius: 50%;
  margin: 0 auto 0.5rem;
  transition: background 0.3s;
}

.timeline-item.completed .timeline-marker {
  background: #28a745;
}

.cost-section {
  border-left: 4px solid #007bff;
}
</style>
