<template>
  <div class="project-approval container-fluid py-4">
    <div v-if="loading" class="text-center my-5" aria-live="polite">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-2">Loading project...</p>
    </div>

    <div v-if="error" class="alert alert-danger alert-dismissible fade show">
      {{ error }}
      <button type="button" class="btn-close" @click="error = ''" aria-label="Close"></button>
    </div>

    <div v-if="successMessage" class="alert alert-success alert-dismissible fade show">
      {{ successMessage }}
      <button type="button" class="btn-close" @click="successMessage = ''" aria-label="Close"></button>
    </div>

    <div v-if="!loading && project" class="row">
      <div class="col-lg-8">
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <div class="d-flex justify-content-between align-items-center">
              <h4 class="mb-0">Project #{{ shortProjectId }}</h4>
              <span class="badge" :style="{ backgroundColor: getStatusColor(project.status) }">
                {{ getStatusLabel(project.status) }}
              </span>
            </div>
          </div>
          <div class="card-body">
            <h5 class="mb-3">Customer Information</h5>
            <div class="row mb-4">
              <div class="col-md-6">
                <p><strong>Name:</strong> {{ project.customerName }}</p>
                <p><strong>Email:</strong> <a :href="`mailto:${project.customerEmail}`">{{ project.customerEmail }}</a></p>
                <p><strong>Phone:</strong> <a :href="`tel:${project.customerPhone}`">{{ project.customerPhone }}</a></p>
              </div>
              <div class="col-md-6">
                <p><strong>Address:</strong> {{ project.address }}</p>
                <p><strong>Created:</strong> {{ formatDate(project.createdAt) }}</p>
              </div>
            </div>

            <hr>
            <h5 class="mb-3">Solar Specifications</h5>
            <div class="row mb-4">
              <div class="col-md-4 mb-3">
                <div class="spec-card h-100">
                  <p class="text-muted">Solar Panels</p>
                  <h3>{{ project.panelCount }}</h3>
                  <small>@ ₹{{ formatCurrency(project.panelUnitCost || 15000) }} each</small>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <div class="spec-card h-100">
                  <p class="text-muted">Inverter</p>
                  <h5>{{ project.inverter?.name || 'N/A' }}</h5>
                  <small>{{ project.inverter?.peakLoad || 0 }} KVA</small>
                </div>
              </div>
              <div class="col-md-4 mb-3">
                <div class="spec-card h-100">
                  <p class="text-muted">Battery</p>
                  <h5>{{ project.battery?.selectedBattery?.name || 'N/A' }}</h5>
                  <small>{{ project.battery?.quantity || 0 }} units</small>
                </div>
              </div>
            </div>

            <hr>
            <h5 class="mb-3">Cost Breakdown</h5>
            <table class="table table-borderless">
              <tbody>
                <tr>
                  <td>Material Cost</td>
                  <td class="text-end fw-bold">₹{{ formatCurrency(project.materialCost) }}</td>
                </tr>
                <tr>
                  <td>Labor Cost</td>
                  <td class="text-end fw-bold">₹{{ formatCurrency(project.laborCost) }}</td>
                </tr>
                <tr class="table-active">
                  <td><strong>Total Cost</strong></td>
                  <td class="text-end fw-bold">₹{{ formatCurrency(totalInternalCost) }}</td>
                </tr>
                <tr>
                  <td>Markup / Profit</td>
                  <td class="text-end fw-bold" :class="profitAmount >= 0 ? 'text-success' : 'text-danger'">
                    ₹{{ formatCurrency(profitAmount) }}
                  </td>
                </tr>
                <tr class="table-primary">
                  <td><strong>Quoted Price</strong></td>
                  <td class="text-end fw-bold">₹{{ formatCurrency(project.finalPrice || project.quotedPrice) }}</td>
                </tr>
              </tbody>
            </table>

            <hr>
            <h5 class="mb-3">Admin Notes</h5>
            <textarea v-model="adminNotes" class="form-control" rows="4" maxlength="2000" placeholder="Add admin notes"></textarea>
            <button class="btn btn-outline-primary mt-2" :disabled="actionLoading" @click="saveAdminNotes">
              Save Notes
            </button>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header bg-info text-white">
            <h5 class="mb-0">Site Documents & Photos</h5>
          </div>
          <div class="card-body">
            <div class="upload-area border border-2 border-dashed p-4 rounded text-center">
              <input
                type="file"
                @change="handleFileUpload"
                multiple
                accept="image/jpeg,image/png,image/webp"
                class="d-none"
                ref="fileInput"
              >
              <button class="btn btn-outline-info" :disabled="uploading" @click="$refs.fileInput.click()">
                {{ uploading ? 'Uploading...' : 'Upload Photos' }}
              </button>
              <p class="text-muted mt-2 mb-0">JPEG, PNG or WebP; maximum 5 MB per image.</p>
            </div>
            <div v-if="project.sitePhotos?.length" class="row mt-3">
              <div v-for="photo in project.sitePhotos" :key="photo.path || photo.url || photo" class="col-6 col-md-3 mb-3">
                <a :href="photo.url || photo" target="_blank" rel="noopener noreferrer">
                  <img :src="photo.url || photo" alt="Site document" class="img-fluid rounded photo-thumbnail">
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card mb-4 sticky-top payment-card">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0">Payment Status</h5>
          </div>
          <div class="card-body">
            <div class="payment-milestone mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Advance ({{ project.advancePercentage || 50 }}%)</span>
                <span class="badge" :class="advancePaid ? 'bg-success' : 'bg-warning'">
                  {{ advancePaid ? 'Paid' : 'Pending' }}
                </span>
              </div>
              <h5 class="text-primary">₹{{ formatCurrency(project.advanceAmount) }}</h5>
            </div>
            <div class="payment-milestone">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Balance</span>
                <span class="badge" :class="balancePaid ? 'bg-success' : 'bg-secondary'">
                  {{ balancePaid ? 'Paid' : 'Pending' }}
                </span>
              </div>
              <h5 class="text-primary">₹{{ formatCurrency(project.balanceAmount) }}</h5>
            </div>
            <hr>
            <p class="mb-0">Total: <strong>₹{{ formatCurrency(project.finalPrice || project.quotedPrice) }}</strong></p>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header bg-warning">
            <h5 class="mb-0">Update Status</h5>
          </div>
          <div class="card-body d-grid gap-2">
            <button
              v-for="action in statusActions"
              :key="action.status"
              class="btn"
              :class="action.className"
              :disabled="actionLoading"
              @click="updateStatus(action.status)"
            >
              {{ action.label }}
            </button>
            <p v-if="!statusActions.length" class="text-muted mb-0">No further status action is available.</p>
          </div>
        </div>

        <div class="card mb-4">
          <div class="card-header bg-info text-white">
            <h5 class="mb-0">Record Payment</h5>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label class="form-label">Payment Type</label>
              <select v-model="paymentType" class="form-select" :disabled="balancePaid">
                <option value="advance" :disabled="advancePaid">Advance</option>
                <option value="balance" :disabled="!advancePaid || balancePaid">Balance</option>
              </select>
            </div>
            <div class="mb-3">
              <label class="form-label">Amount</label>
              <input type="number" class="form-control" :value="paymentAmount" disabled>
            </div>
            <div class="mb-3">
              <label class="form-label">Payment Method</label>
              <select v-model="paymentMethod" class="form-select">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <button
              class="btn btn-success w-100"
              :disabled="actionLoading || balancePaid || (paymentType === 'balance' && !advancePaid)"
              @click="recordPayment"
            >
              Record Payment
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-header bg-secondary text-white">
            <h5 class="mb-0">Documents & Notifications</h5>
          </div>
          <div class="list-group list-group-flush">
            <button @click="downloadQuotation" class="list-group-item list-group-item-action">Download Quotation PDF</button>
            <button @click="downloadInvoice" class="list-group-item list-group-item-action">Download Invoice PDF</button>
            <button @click="sendEmailUpdate" class="list-group-item list-group-item-action" :disabled="actionLoading">Send Email Update</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  getProject,
  updateProjectDetails,
  updateProjectStatus,
  updatePaymentStatus
} from '@/models/projectModel';
import {
  PROJECT_STATUS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  PAYMENT_STATUS
} from '@/constants/businessConstants';
import { downloadQuotationPDF, downloadInvoicePDF } from '@/utils/pdfGenerator';
import { sendProjectUpdateEmail, sendCompletionEmail } from '@/utils/emailService';
import { uploadMultiplePhotos } from '@/utils/storageService';

export default {
  name: 'ProjectApproval',
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
      actionLoading: false,
      uploading: false,
      error: '',
      successMessage: '',
      adminNotes: '',
      paymentType: 'advance',
      paymentMethod: 'bank_transfer'
    };
  },
  computed: {
    shortProjectId() {
      return String(this.project?.projectId || this.projectId).slice(0, 16);
    },
    totalInternalCost() {
      return (Number(this.project?.materialCost) || 0) + (Number(this.project?.laborCost) || 0);
    },
    profitAmount() {
      return (Number(this.project?.finalPrice || this.project?.quotedPrice) || 0) - this.totalInternalCost;
    },
    advancePaid() {
      return [PAYMENT_STATUS.ADVANCE_PAID, PAYMENT_STATUS.BALANCE_PAID].includes(this.project?.paymentStatus);
    },
    balancePaid() {
      return this.project?.paymentStatus === PAYMENT_STATUS.BALANCE_PAID;
    },
    paymentAmount() {
      return this.paymentType === 'advance'
        ? Number(this.project?.advanceAmount) || 0
        : Number(this.project?.balanceAmount) || 0;
    },
    statusActions() {
      const status = this.project?.status;
      const actions = {
        [PROJECT_STATUS.QUOTE_PENDING]: [
          { status: PROJECT_STATUS.QUOTE_SENT, label: 'Send Quote', className: 'btn-outline-primary' }
        ],
        [PROJECT_STATUS.QUOTE_SENT]: [
          { status: PROJECT_STATUS.APPROVED, label: 'Approve Quote', className: 'btn-success' }
        ],
        [PROJECT_STATUS.APPROVED]: [
          { status: PROJECT_STATUS.INSTALLATION_SCHEDULED, label: 'Schedule Installation', className: 'btn-info' }
        ],
        [PROJECT_STATUS.INSTALLATION_SCHEDULED]: [
          { status: PROJECT_STATUS.IN_PROGRESS, label: 'Start Installation', className: 'btn-warning' }
        ],
        [PROJECT_STATUS.IN_PROGRESS]: [
          { status: PROJECT_STATUS.COMPLETED, label: 'Mark Complete', className: 'btn-success' }
        ]
      };
      return actions[status] || [];
    }
  },
  created() {
    this.loadProject();
  },
  methods: {
    showSuccess(message) {
      this.successMessage = message;
      setTimeout(() => {
        if (this.successMessage === message) this.successMessage = '';
      }, 3500);
    },
    async loadProject() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getProject(this.projectId);
        if (!result.success) throw new Error(result.error || 'Project not found.');
        this.project = result.project;
        this.adminNotes = result.project.adminNotes || '';
        this.paymentType = this.advancePaid ? 'balance' : 'advance';
      } catch (error) {
        console.error('Error loading project:', error);
        this.error = error.message || 'Error loading project.';
      } finally {
        this.loading = false;
      }
    },
    async saveAdminNotes() {
      this.actionLoading = true;
      this.error = '';
      try {
        const result = await updateProjectDetails(this.projectId, { adminNotes: this.adminNotes });
        if (!result.success) throw new Error(result.error);
        this.project.adminNotes = this.adminNotes;
        this.showSuccess('Admin notes saved.');
      } catch (error) {
        this.error = error.message || 'Unable to save notes.';
      } finally {
        this.actionLoading = false;
      }
    },
    async updateStatus(newStatus) {
      this.actionLoading = true;
      this.error = '';
      try {
        const label = this.getStatusLabel(newStatus);
        const result = await updateProjectStatus(this.projectId, newStatus, `Status updated to ${label}`);
        if (!result.success) throw new Error(result.error);
        await this.loadProject();

        const emailResult = newStatus === PROJECT_STATUS.COMPLETED
          ? await sendCompletionEmail(this.project)
          : await sendProjectUpdateEmail(this.project, `Your project status has been updated to ${label}.`);

        this.showSuccess(
          emailResult.success
            ? `Project status updated to ${label}; email sent.`
            : `Project status updated to ${label}. Email was not sent: ${emailResult.error}`
        );
      } catch (error) {
        console.error('Error updating status:', error);
        this.error = error.message || 'Unable to update project status.';
      } finally {
        this.actionLoading = false;
      }
    },
    async recordPayment() {
      this.actionLoading = true;
      this.error = '';
      try {
        const paymentStatus = this.paymentType === 'advance'
          ? PAYMENT_STATUS.ADVANCE_PAID
          : PAYMENT_STATUS.BALANCE_PAID;
        const result = await updatePaymentStatus(this.projectId, paymentStatus, {
          note: `${this.paymentType} payment received via ${this.paymentMethod}`,
          method: this.paymentMethod
        });
        if (!result.success) throw new Error(result.error);
        await this.loadProject();
        this.showSuccess('Payment recorded successfully.');
      } catch (error) {
        console.error('Error recording payment:', error);
        this.error = error.message || 'Unable to record payment.';
      } finally {
        this.actionLoading = false;
      }
    },
    async downloadQuotation() {
      const result = await downloadQuotationPDF(this.project);
      if (!result.success) this.error = result.error;
    },
    async downloadInvoice() {
      const result = await downloadInvoicePDF(this.project);
      if (!result.success) this.error = result.error;
    },
    async sendEmailUpdate() {
      this.actionLoading = true;
      this.error = '';
      try {
        const result = await sendProjectUpdateEmail(this.project, 'Please find the latest update for your solar project.');
        if (!result.success) throw new Error(result.error);
        this.showSuccess('Email sent successfully.');
      } catch (error) {
        this.error = error.message || 'Unable to send email.';
      } finally {
        this.actionLoading = false;
      }
    },
    async handleFileUpload(event) {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (!files.length) return;

      const invalidFile = files.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
      if (invalidFile) {
        this.error = `${invalidFile.name} is not a supported image or is larger than 5 MB.`;
        return;
      }

      this.uploading = true;
      this.error = '';
      try {
        const uploadResult = await uploadMultiplePhotos(this.projectId, files);
        if (!uploadResult.success) throw new Error(uploadResult.error);
        if (uploadResult.failures?.length) {
          throw new Error(uploadResult.failures.map((failure) => `${failure.fileName}: ${failure.error}`).join('; '));
        }

        const uploadedPhotos = uploadResult.uploads.map((upload) => ({
          name: upload.fileName,
          url: upload.downloadURL,
          path: upload.path,
          uploadedAt: upload.uploadedAt
        }));
        const sitePhotos = [...(this.project.sitePhotos || []), ...uploadedPhotos];
        const saveResult = await updateProjectDetails(this.projectId, { sitePhotos });
        if (!saveResult.success) throw new Error(saveResult.error);
        this.project.sitePhotos = sitePhotos;
        this.showSuccess(`${uploadedPhotos.length} photo(s) uploaded.`);
      } catch (error) {
        console.error('Error uploading photos:', error);
        this.error = error.message || 'Unable to upload photos.';
      } finally {
        this.uploading = false;
      }
    },
    getStatusLabel(status) {
      return PROJECT_STATUS_LABELS[status] || status || 'Unknown';
    },
    getStatusColor(status) {
      return PROJECT_STATUS_COLORS[status] || '#6c757d';
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
.project-approval {
  background-color: #f8f9fa;
  min-height: 100vh;
}
.card {
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.spec-card,
.payment-milestone {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}
.payment-milestone {
  border-left-color: #28a745;
}
.upload-area {
  background-color: #f8f9fa;
}
.photo-thumbnail {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}
.payment-card {
  top: 1rem;
}
@media (max-width: 991px) {
  .payment-card {
    position: relative;
    top: 0;
  }
}
</style>
