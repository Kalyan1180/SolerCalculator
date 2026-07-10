<template>
  <div class="project-approval container-fluid py-4">
    <div class="row">
      <!-- Left Column: Project Details -->
      <div class="col-lg-8">
        <div class="card mb-4" v-if="project">
          <div class="card-header bg-primary text-white">
            <div class="d-flex justify-content-between align-items-center">
              <h4 class="mb-0">Project #{{ project.projectId.substring(0, 12) }}</h4>
              <span class="badge" :style="{ backgroundColor: getStatusColor(project.status) }}">{{ getStatusLabel(project.status) }}</span>
            </div>
          </div>
          <div class="card-body">
            <!-- Customer Information -->
            <h5 class="mb-3">Customer Information</h5>
            <div class="row mb-4">
              <div class="col-md-6">
                <p><strong>Name:</strong> {{ project.customerName }}</p>
                <p><strong>Email:</strong> <a :href="`mailto:${project.customerEmail}`">{{ project.customerEmail }}</a></p>
                <p><strong>Phone:</strong> <a :href="`tel:${project.customerPhone}`">{{ project.customerPhone }}</a></p>
              </div>
              <div class="col-md-6">
                <p><strong>Address:</strong> {{ project.address }}</p>
                <p><strong>Project Created:</strong> {{ formatDate(project.createdAt) }}</p>
              </div>
            </div>

            <hr>

            <!-- Solar Specifications -->
            <h5 class="mb-3">Solar Specifications</h5>
            <div class="row mb-4">
              <div class="col-md-4">
                <div class="spec-card">
                  <p class="text-muted">Solar Panels</p>
                  <h3>{{ project.panelCount }}</h3>
                  <small>@ ₹15,000 each</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="spec-card">
                  <p class="text-muted">Inverter</p>
                  <h4>{{ project.inverter?.name }}</h4>
                  <small>{{ project.inverter?.peakLoad }} KVA</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="spec-card">
                  <p class="text-muted">Battery</p>
                  <h4>{{ project.battery?.selectedBattery?.name }}</h4>
                  <small>{{ project.battery?.quantity }} units ({{ project.battery?.selectedBattery?.capacity }} AH)</small>
                </div>
              </div>
            </div>

            <hr>

            <!-- Cost Breakdown -->
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
                  <td class="text-end fw-bold"><strong>₹{{ formatCurrency(project.materialCost + project.laborCost) }}</strong></td>
                </tr>
                <tr>
                  <td>Markup/Profit</td>
                  <td class="text-end fw-bold text-success">₹{{ formatCurrency(project.quotedPrice - project.materialCost - project.laborCost) }}</td>
                </tr>
                <tr class="table-primary">
                  <td><strong>Quoted Price</strong></td>
                  <td class="text-end fw-bold"><strong>₹{{ formatCurrency(project.quotedPrice) }}</strong></td>
                </tr>
              </tbody>
            </table>

            <hr>

            <!-- Admin Notes -->
            <h5 class="mb-3">Notes</h5>
            <div class="form-group mb-3">
              <textarea v-model="project.adminNotes" class="form-control" rows="3" placeholder="Add admin notes here"></textarea>
            </div>
          </div>
        </div>

        <!-- Document Upload Section -->
        <div class="card mb-4">
          <div class="card-header bg-info text-white">
            <h5 class="mb-0">📸 Site Documents & Photos</h5>
          </div>
          <div class="card-body">
            <div class="upload-area border-2 border-dashed p-4 rounded text-center">
              <input type="file" @change="handleFileUpload" multiple accept="image/*" class="d-none" ref="fileInput" />
              <button class="btn btn-outline-info" @click="$refs.fileInput.click()">
                <i class="fas fa-cloud-upload-alt me-2"></i>Upload Photos
              </button>
              <p class="text-muted mt-2 mb-0">Before/After installation photos</p>
            </div>
            <div v-if="project.sitePhotos && project.sitePhotos.length" class="mt-3">
              <p class="fw-bold">Uploaded Photos:</p>
              <div class="row">
                <div v-for="(photo, idx) in project.sitePhotos" :key="idx" class="col-md-3 mb-2">
                  <div class="photo-thumbnail">
                    <img :src="photo" alt="Site photo" class="img-fluid rounded">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Actions & Payment -->
      <div class="col-lg-4">
        <!-- Payment Status Card -->
        <div class="card mb-4 sticky-top">
          <div class="card-header bg-success text-white">
            <h5 class="mb-0">💳 Payment Status</h5>
          </div>
          <div class="card-body">
            <div class="payment-milestone mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Advance (50%)</span>
                <span class="badge" :class="project.paymentStatus === 'advance_paid' || project.paymentStatus === 'balance_paid' ? 'bg-success' : 'bg-warning'">{{ project.paymentStatus === 'advance_paid' || project.paymentStatus === 'balance_paid' ? '✓ Paid' : 'Pending' }}</span>
              </div>
              <h5 class="text-primary">₹{{ formatCurrency(project.advanceAmount || 0) }}</h5>
            </div>
            <div class="payment-milestone">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Balance (50%)</span>
                <span class="badge" :class="project.paymentStatus === 'balance_paid' ? 'bg-success' : 'bg-secondary'">{{ project.paymentStatus === 'balance_paid' ? '✓ Paid' : 'Pending' }}</span>
              </div>
              <h5 class="text-primary">₹{{ formatCurrency(project.balanceAmount || 0) }}</h5>
            </div>
            <hr>
            <p class="text-muted mb-0">Total: <strong>₹{{ formatCurrency(project.quotedPrice) }}</strong></p>
          </div>
        </div>

        <!-- Status Update Actions -->
        <div class="card mb-4">
          <div class="card-header bg-warning text-white">
            <h5 class="mb-0">⚙️ Update Status</h5>
          </div>
          <div class="card-body">
            <div class="btn-group-vertical w-100 gap-2 d-flex">
              <button
                v-if="project.status === 'quote_pending'"
                @click="updateStatus('quote_sent')"
                class="btn btn-sm btn-outline-primary"
              >
                📧 Send Quote
              </button>
              <button
                v-if="project.status === 'quote_sent'"
                @click="updateStatus('approved')"
                class="btn btn-sm btn-success"
              >
                ✅ Approve Quote
              </button>
              <button
                v-if="project.status === 'approved'"
                @click="updateStatus('installation_scheduled')"
                class="btn btn-sm btn-info"
              >
                📅 Schedule Installation
              </button>
              <button
                v-if="project.status === 'installation_scheduled'"
                @click="updateStatus('in_progress')"
                class="btn btn-sm btn-warning"
              >
                🔧 Start Installation
              </button>
              <button
                v-if="project.status === 'in_progress'"
                @click="updateStatus('completed')"
                class="btn btn-sm btn-success"
              >
                ✨ Mark Complete
              </button>
            </div>
          </div>
        </div>

        <!-- Payment Recording -->
        <div class="card mb-4">
          <div class="card-header bg-info text-white">
            <h5 class="mb-0">💰 Record Payment</h5>
          </div>
          <div class="card-body">
            <div class="form-group mb-3">
              <label class="form-label">Payment Type</label>
              <select v-model="paymentType" class="form-select">
                <option value="advance">Advance (50%)</option>
                <option value="balance">Balance (50%)</option>
              </select>
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Amount</label>
              <input type="number" class="form-control" :value="paymentType === 'advance' ? project.advanceAmount : project.balanceAmount" disabled />
            </div>
            <div class="form-group mb-3">
              <label class="form-label">Payment Method</label>
              <select v-model="paymentMethod" class="form-select">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <button @click="recordPayment" class="btn btn-success w-100">
              <i class="fas fa-check me-2"></i>Record Payment
            </button>
          </div>
        </div>

        <!-- Document Downloads -->
        <div class="card">
          <div class="card-header bg-secondary text-white">
            <h5 class="mb-0">📄 Documents</h5>
          </div>
          <div class="list-group list-group-flush">
            <button @click="downloadQuotation" class="list-group-item list-group-item-action">
              <i class="fas fa-file-pdf text-danger me-2"></i>Download Quotation
            </button>
            <button @click="downloadInvoice" class="list-group-item list-group-item-action">
              <i class="fas fa-file-invoice-dollar text-primary me-2"></i>Download Invoice
            </button>
            <button @click="sendEmailUpdate" class="list-group-item list-group-item-action">
              <i class="fas fa-envelope text-info me-2"></i>Send Email Update
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getProject, updateProjectStatus, updatePaymentStatus } from '@/models/projectModel';
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/constants/businessConstants';
import { generateQuotationData, generateInvoiceData } from '@/utils/invoiceGenerator';
import { sendProjectUpdateEmail, sendPaymentReminderEmail, sendCompletionEmail } from '@/utils/emailService';

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
      error: '',
      successMessage: '',
      paymentType: 'advance',
      paymentMethod: 'bank_transfer'
    };
  },
  created() {
    this.loadProject();
  },
  methods: {
    async loadProject() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getProject(this.projectId);
        if (result.success) {
          this.project = result.project;
        } else {
          this.error = result.error || 'Project not found';
        }
      } catch (error) {
        console.error('Error loading project:', error);
        this.error = 'Error loading project';
      } finally {
        this.loading = false;
      }
    },
    async updateStatus(newStatus) {
      try {
        const result = await updateProjectStatus(this.projectId, newStatus, `Status updated to ${this.getStatusLabel(newStatus)}`);
        if (result.success) {
          this.successMessage = `Project status updated to ${this.getStatusLabel(newStatus)}`;
          await this.loadProject();
          
          // Send email notification
          if (newStatus === 'quote_sent') {
            await sendProjectUpdateEmail(this.project, 'Your quotation has been sent. Please review and confirm.');
          } else if (newStatus === 'approved') {
            await sendProjectUpdateEmail(this.project, 'Your project has been approved! Installation will commence soon.');
          } else if (newStatus === 'completed') {
            await sendCompletionEmail(this.project);
          }
          
          setTimeout(() => this.successMessage = '', 3000);
        } else {
          this.error = result.error || 'Failed to update status';
        }
      } catch (error) {
        console.error('Error updating status:', error);
        this.error = 'Error updating project status';
      }
    },
    async recordPayment() {
      try {
        const newPaymentStatus = this.paymentType === 'advance' ? 'advance_paid' : 'balance_paid';
        const result = await updatePaymentStatus(
          this.projectId,
          newPaymentStatus,
          `${this.paymentType} payment received via ${this.paymentMethod}`
        );
        if (result.success) {
          this.successMessage = 'Payment recorded successfully!';
          await this.loadProject();
          setTimeout(() => this.successMessage = '', 3000);
        } else {
          this.error = result.error || 'Failed to record payment';
        }
      } catch (error) {
        console.error('Error recording payment:', error);
        this.error = 'Error recording payment';
      }
    },
    downloadQuotation() {
      const data = generateQuotationData(this.project);
      console.log('Quotation data:', data);
      alert('PDF download feature - integrate with a PDF library like jsPDF or html2pdf');
    },
    downloadInvoice() {
      const data = generateInvoiceData(this.project);
      console.log('Invoice data:', data);
      alert('PDF download feature - integrate with a PDF library like jsPDF or html2pdf');
    },
    async sendEmailUpdate() {
      try {
        const result = await sendProjectUpdateEmail(this.project, 'Please find the updated details of your solar project.');
        if (result.success) {
          this.successMessage = 'Email sent successfully!';
          setTimeout(() => this.successMessage = '', 3000);
        } else {
          this.error = result.error || 'Failed to send email';
        }
      } catch (error) {
        console.error('Error sending email:', error);
        this.error = 'Error sending email';
      }
    },
    handleFileUpload(event) {
      const files = event.target.files;
      if (files) {
        // In production, upload to Firebase Storage
        for (let file of files) {
          console.log('File to upload:', file.name);
        }
        this.successMessage = `${files.length} file(s) uploaded successfully!`;
        setTimeout(() => this.successMessage = '', 3000);
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
.project-approval {
  background-color: #f8f9fa;
}

.card {
  border: none;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.spec-card {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.payment-milestone {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #28a745;
}

.upload-area {
  background-color: #f8f9fa;
  transition: all 0.3s;
}

.upload-area:hover {
  background-color: #e9ecef;
  cursor: pointer;
}

.photo-thumbnail {
  overflow: hidden;
  border-radius: 8px;
}

.btn-group-vertical {
  gap: 0.5rem !important;
}

@media (max-width: 991px) {
  .sticky-top {
    position: relative;
    top: 0;
  }
}
</style>
