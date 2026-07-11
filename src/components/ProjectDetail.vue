<template>
  <div class="project-detail container my-5">
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading project details...</p>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="!loading && project" class="card detail-card">
      <div class="card-header d-flex justify-content-between align-items-center gap-2">
        <h3 class="mb-0">Project #{{ String(project.projectId || project.id).slice(0, 16) }}</h3>
        <router-link
          :to="{ name: 'ProjectApproval', params: { projectId: project.projectId || project.id } }"
          class="btn btn-light btn-sm"
        >
          Manage Project
        </router-link>
      </div>
      <div class="card-body">
        <div class="row">
          <div class="col-md-6">
            <p><strong>Customer:</strong> {{ project.customerName }}</p>
            <p><strong>Email:</strong> {{ project.customerEmail }}</p>
            <p><strong>Phone:</strong> {{ project.customerPhone }}</p>
            <p><strong>Address:</strong> {{ project.address }}</p>
          </div>
          <div class="col-md-6">
            <p><strong>Status:</strong> {{ project.status }}</p>
            <p><strong>Payment:</strong> {{ project.paymentStatus }}</p>
            <p><strong>Quoted Price:</strong> ₹{{ formatCurrency(project.finalPrice || project.quotedPrice) }}</p>
            <p><strong>Created:</strong> {{ formatDate(project.createdAt) }}</p>
          </div>
        </div>

        <hr>
        <h4>Solar System</h4>
        <p><strong>Panels:</strong> {{ project.panelCount }}</p>
        <p><strong>Inverter:</strong> {{ project.inverter?.name || 'N/A' }}</p>
        <p><strong>Battery:</strong> {{ project.battery?.selectedBattery?.name || 'N/A' }} × {{ project.battery?.quantity || 0 }}</p>

        <hr>
        <h4>Notes</h4>
        <p><strong>Admin:</strong> {{ project.adminNotes || 'N/A' }}</p>
        <p><strong>Customer:</strong> {{ project.customerNotes || 'N/A' }}</p>
      </div>
      <div class="card-footer text-center">
        <router-link to="/admin/projects" class="btn btn-secondary">Back to Projects</router-link>
      </div>
    </div>
  </div>
</template>

<script>
import { getProject } from '@/models/projectModel';

export default {
  name: 'ProjectDetail',
  props: {
    projectId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      project: null,
      loading: false,
      error: ''
    };
  },
  created() {
    this.fetchProject();
  },
  methods: {
    async fetchProject() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getProject(this.projectId);
        if (!result.success) throw new Error(result.error || 'Project not found.');
        this.project = result.project;
      } catch (error) {
        console.error('Error fetching project:', error);
        this.error = error.message || 'Unable to load project.';
      } finally {
        this.loading = false;
      }
    },
    formatCurrency(value) {
      const number = Number(value);
      return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number.isFinite(number) ? number : 0);
    },
    formatDate(timestamp) {
      if (!timestamp) return 'N/A';
      const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
      return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('en-IN');
    }
  }
};
</script>

<style scoped>
.project-detail {
  max-width: 900px;
}
.detail-card {
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
.card-header {
  background-color: #007bff;
  color: #fff;
}
</style>
