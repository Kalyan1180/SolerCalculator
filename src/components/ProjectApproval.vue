<template>
  <div class="project-approval container-fluid py-4">
    <div v-if="loading" class="text-center my-5" role="status">
      <div class="spinner-border text-primary"></div>
      <p class="mt-2 text-muted">Loading project…</p>
    </div>

    <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
      {{ error }}
      <button type="button" class="btn-close" aria-label="Close" @click="error = ''"></button>
    </div>
    <div v-if="successMessage" class="alert alert-success" role="status">{{ successMessage }}</div>

    <div v-if="!loading && project" class="row g-4">
      <div class="col-lg-8">
        <div class="card mb-4">
          <div class="card-header bg-primary text-white d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <small class="text-white-50 d-block">Project workspace</small>
              <h4 class="mb-0">#{{ shortProjectId }}</h4>
            </div>
            <span class="badge" :style="{ backgroundColor: getStatusColor(project.status) }">
              {{ getStatusLabel(project.status) }}
            </span>
          </div>
          <div class="card-body">
            <h5>Customer Information</h5>
            <div class="row mb-4">
              <div class="col-md-6">
                <p><strong>Name:</strong> {{ project.customerName || 'N/A' }}</p>
                <p><strong>Email:</strong> <a :href="`mailto:${project.customerEmail}`">{{ project.customerEmail || 'N/A' }}</a></p>
                <p><strong>Phone:</strong> <a :href="`tel:${project.customerPhone}`">{{ project.customerPhone || 'N/A' }}</a></p>
              </div>
              <div class="col-md-6">
                <p><strong>Address:</strong> {{ project.address || 'N/A' }}</p>
                <p><strong>Created:</strong> {{ formatDate(project.createdAt) }}</p>
              </div>
            </div>

            <hr />
            <h5>Solar Specifications</h5>
            <div class="row g-3 mb-4">
              <div class="col-md-4">
                <div class="spec-card h-100">
                  <div class="text-muted">Panels</div>
                  <h3>{{ numberValue(project.panelCount) }}</h3>
                  <small>{{ project.panel?.name || 'Legacy/default panel' }}</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="spec-card h-100">
                  <div class="text-muted">Inverter</div>
                  <h5>{{ project.inverter?.name || 'N/A' }}</h5>
                  <small>{{ numberValue(project.inverter?.peakLoad || project.inverter?.specs?.peakLoad) }} KVA</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="spec-card h-100">
                  <div class="text-muted">Battery</div>
                  <h5>{{ project.battery?.selectedBattery?.name || 'Not required' }}</h5>
                  <small v-if="project.battery?.selectedBattery">{{ numberValue(project.battery?.quantity) }} unit(s)</small>
                </div>
              </div>
            </div>

            <hr />
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h5 class="mb-1">Quotation Stock Readiness</h5>
                <p class="small text-muted mb-0">Live availability after other committed projects are considered.</p>
              </div>
              <span v-if="stockPlan" class="stock-readiness" :class="stockPlan.status === 'ready' ? 'is-ready' : 'is-short'">
                <i :class="stockPlan.status === 'ready' ? 'fas fa-circle-check' : 'fas fa-triangle-exclamation'" aria-hidden="true"></i>
                {{ stockPlan.status === 'ready' ? 'Ready to supply' : stockPlan.status === 'unmapped' ? 'Inventory mapping required' : `${stockPlan.shortItemCount} short item(s)` }}
              </span>
            </div>

            <div v-if="stockLoading" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div><span class="ms-2 text-muted">Calculating stock requirement…</span></div>
            <div v-else-if="stockError" class="alert alert-warning">{{ stockError }}</div>
            <div v-else-if="stockPlan?.lines?.length" class="table-responsive mb-4">
              <table class="table table-hover align-middle stock-plan-table">
                <thead><tr><th>Item</th><th>Required</th><th>Available</th><th>Shortfall</th><th>Restock priority</th></tr></thead>
                <tbody>
                  <tr v-for="line in stockPlan.lines" :key="`${line.itemId}-${line.type}`">
                    <td><strong>{{ line.name }}</strong><br /><small class="text-muted">{{ line.sku || 'No SKU' }} · {{ line.type }}</small></td>
                    <td>{{ line.requiredQuantity }} {{ line.unit }}</td>
                    <td>{{ line.availableQuantity }} {{ line.unit }}</td>
                    <td><strong :class="line.shortfall > 0 ? 'text-danger' : 'text-success'">{{ line.shortfall }}</strong></td>
                    <td><span class="priority-chip" :class="`is-${line.restockPriority}`">{{ priorityLabel(line.restockPriority) }}</span></td>
                  </tr>
                </tbody>
              </table>
              <div v-if="stockPlan.totalShortfall > 0" class="alert alert-warning mb-0">
                This quotation can remain active, but purchasing should cover the listed shortfall before installation is scheduled.
              </div>
            </div>
            <div v-else class="alert alert-secondary">
              This older project has no mapped inventory bill of materials. Recreate or revise the quotation using the unified inventory calculator to enable live shortfall planning.
            </div>

            <hr />
            <h5>Cost Breakdown</h5>
            <table class="table table-borderless">
              <tbody>
                <tr><td>Equipment/material</td><td class="text-end">Rs {{ formatCurrency(project.materialCost) }}</td></tr>
                <tr><td>Installation/labour</td><td class="text-end">Rs {{ formatCurrency(project.laborCost) }}</td></tr>
                <tr><td>Cost before profit</td><td class="text-end">Rs {{ formatCurrency(project.totalCostWithoutMarkup) }}</td></tr>
                <tr class="table-primary"><th>Quoted price</th><th class="text-end">Rs {{ formatCurrency(project.quotedPrice) }}</th></tr>
              </tbody>
            </table>

            <div v-if="canUpdateProject" class="mt-4">
              <label for="adminNotes" class="form-label fw-bold">Internal Notes</label>
              <textarea id="adminNotes" v-model.trim="adminNotes" class="form-control" rows="3" maxlength="2000"></textarea>
              <button class="btn btn-outline-primary mt-3" :disabled="busyAction" @click="saveNotes">Save Notes</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header"><h5 class="mb-0">Site Photos</h5></div>
          <div class="card-body">
            <p class="mb-2">Photo upload is disabled so this application can operate without a paid Firebase Storage plan.</p>
            <small class="text-muted">Projects, quotations, payments, inventory and status updates are unaffected.</small>

            <div v-if="project.sitePhotos?.length" class="row g-3 mt-2">
              <div v-for="(photo, index) in project.sitePhotos" :key="`${photo}-${index}`" class="col-6 col-md-3">
                <a :href="photo" target="_blank" rel="noopener noreferrer">
                  <img :src="photo" class="img-fluid rounded photo-thumbnail" alt="Solar installation site" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card mb-4">
          <div class="card-header bg-success text-white"><h5 class="mb-0">Payment Status</h5></div>
          <div class="card-body">
            <div class="payment-milestone mb-3">
              <div class="d-flex justify-content-between">
                <span>Advance</span>
                <span class="badge" :class="advancePaid ? 'bg-success' : 'bg-warning text-dark'">{{ advancePaid ? 'Paid' : 'Pending' }}</span>
              </div>
              <strong>Rs {{ formatCurrency(project.advanceAmount) }}</strong>
            </div>
            <div class="payment-milestone">
              <div class="d-flex justify-content-between">
                <span>Balance</span>
                <span class="badge" :class="balancePaid ? 'bg-success' : 'bg-secondary'">{{ balancePaid ? 'Paid' : 'Pending' }}</span>
              </div>
              <strong>Rs {{ formatCurrency(project.balanceAmount) }}</strong>
            </div>
          </div>
        </div>

        <div v-if="canUpdateProject" class="card mb-4">
          <div class="card-header bg-warning"><h5 class="mb-0">Update Status</h5></div>
          <div class="card-body d-grid gap-2">
            <button
              v-for="action in availableStatusActions"
              :key="action.status"
              class="btn"
              :class="action.className"
              :disabled="busyAction"
              @click="updateStatus(action.status)"
            >
              {{ action.label }}
            </button>
            <span v-if="!availableStatusActions.length" class="text-muted">No further status action is available.</span>
          </div>
        </div>

        <div v-if="canManagePayments" class="card mb-4">
          <div class="card-header bg-info text-white"><h5 class="mb-0">Record Payment</h5></div>
          <div class="card-body">
            <div class="mb-3">
              <label for="paymentType" class="form-label">Payment</label>
              <select id="paymentType" v-model="paymentType" class="form-select" :disabled="busyAction || !paymentReady">
                <option value="advance">Advance</option>
                <option value="balance" :disabled="!advancePaid">Balance</option>
              </select>
            </div>
            <div class="mb-3">
              <label for="paymentMethod" class="form-label">Method</label>
              <select id="paymentMethod" v-model="paymentMethod" class="form-select" :disabled="busyAction || !paymentReady">
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
              </select>
            </div>
            <button class="btn btn-success w-100" :disabled="!canRecordPayment || busyAction" @click="recordPayment">
              Record {{ paymentType }} payment
            </button>
            <small v-if="!paymentReady" class="d-block text-muted mt-2">Approve the quotation before recording payment.</small>
          </div>
        </div>

        <div v-if="canGenerateDocuments || canSendNotifications" class="card">
          <div class="card-header bg-secondary text-white"><h5 class="mb-0">Documents & Notifications</h5></div>
          <div class="list-group list-group-flush">
            <button v-if="canGenerateDocuments" class="list-group-item list-group-item-action" :disabled="busyAction" @click="downloadQuotation">
              <i class="fas fa-file-pdf me-2" aria-hidden="true"></i>Download quotation PDF
            </button>
            <button v-if="canGenerateDocuments" class="list-group-item list-group-item-action" :disabled="busyAction" @click="downloadInvoice">
              <i class="fas fa-file-invoice me-2" aria-hidden="true"></i>Download invoice PDF
            </button>
            <button v-if="canSendNotifications" class="list-group-item list-group-item-action" :disabled="busyAction" @click="sendEmailUpdate">
              <i class="fas fa-envelope me-2" aria-hidden="true"></i>Send email update
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {
  getProject,
  updatePaymentStatus,
  updateProjectFields,
  updateProjectStatus
} from '@/models/projectModel';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from '@/constants/businessConstants';
import { sendCompletionEmail, sendProjectUpdateEmail } from '@/utils/emailService';
import { downloadInvoicePDF, downloadQuotationPDF } from '@/utils/pdfGenerator';
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

export default {
  name: 'ProjectApproval',
  mixins: [rbacMixin],
  props: {
    projectId: { type: String, required: true }
  },
  data() {
    return {
      project: null,
      stockPlan: null,
      stockLoading: false,
      stockError: '',
      adminNotes: '',
      loading: false,
      busyAction: false,
      error: '',
      successMessage: '',
      paymentType: 'advance',
      paymentMethod: 'bank_transfer'
    };
  },
  computed: {
    canUpdateProject() {
      return this.can(PERMISSIONS.PROJECTS_UPDATE);
    },
    canManagePayments() {
      return this.can(PERMISSIONS.PROJECTS_PAYMENTS);
    },
    canGenerateDocuments() {
      return this.can(PERMISSIONS.PROJECTS_DOCUMENTS);
    },
    canSendNotifications() {
      return this.can(PERMISSIONS.NOTIFICATIONS_SEND);
    },
    shortProjectId() {
      return String(this.project?.projectId || this.projectId).slice(0, 16);
    },
    advancePaid() {
      return ['advance_paid', 'balance_paid'].includes(this.project?.paymentStatus);
    },
    balancePaid() {
      return this.project?.paymentStatus === 'balance_paid';
    },
    paymentReady() {
      return Boolean(this.project?.approvalDate && this.project?.advanceAmount != null);
    },
    canRecordPayment() {
      if (!this.canManagePayments || !this.paymentReady) return false;
      if (this.paymentType === 'advance') return !this.advancePaid;
      return this.advancePaid && !this.balancePaid;
    },
    availableStatusActions() {
      if (!this.canUpdateProject) return [];
      const actions = {
        quote_pending: [{ status: 'quote_sent', label: 'Send Quote', className: 'btn-outline-primary' }],
        quote_sent: [{ status: 'approved', label: 'Approve Quote', className: 'btn-success' }],
        approved: [{ status: 'installation_scheduled', label: 'Schedule Installation', className: 'btn-info' }],
        installation_scheduled: [{ status: 'in_progress', label: 'Start Installation', className: 'btn-warning' }],
        in_progress: [{ status: 'completed', label: 'Mark Complete', className: 'btn-success' }]
      };
      return actions[this.project?.status] || [];
    }
  },
  created() {
    this.loadProject();
  },
  methods: {
    numberValue(value) {
      const number = Number(value);
      return Number.isFinite(number) ? number : 0;
    },
    priorityLabel(value) {
      return { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }[value] || 'Low';
    },
    async loadProject() {
      this.loading = true;
      this.error = '';
      try {
        const result = await getProject(this.projectId);
        if (!result.success) throw new Error(result.error || 'Project not found');
        this.project = result.project;
        this.adminNotes = result.project.adminNotes || '';
        if (this.balancePaid) this.paymentType = 'balance';
        await this.loadStockPlan();
      } catch (error) {
        this.project = null;
        this.error = error.message || 'Unable to load project.';
      } finally {
        this.loading = false;
      }
    },
    async loadStockPlan() {
      this.stockLoading = true;
      this.stockError = '';
      try {
        const result = await authenticatedJsonRequest(
          `/.netlify/functions/getProjectStockPlan?projectId=${encodeURIComponent(this.projectId)}`,
          { method: 'GET' }
        );
        this.stockPlan = result.plan || null;
      } catch (error) {
        this.stockPlan = null;
        this.stockError = error.message || 'Unable to calculate live stock readiness.';
      } finally {
        this.stockLoading = false;
      }
    },
    showSuccess(message) {
      this.successMessage = message;
      window.setTimeout(() => { this.successMessage = ''; }, 3500);
    },
    async updateStatus(newStatus) {
      if (!this.canUpdateProject) return;
      this.busyAction = true;
      this.error = '';
      try {
        const result = await updateProjectStatus(this.projectId, newStatus, this.adminNotes);
        if (!result.success) throw new Error(result.error || 'Unable to update project status');
        await this.loadProject();
        this.showSuccess(`Status updated to ${this.getStatusLabel(newStatus)}.`);

        if (this.canSendNotifications) {
          let emailResult = { success: true };
          if (newStatus === 'completed') emailResult = await sendCompletionEmail(this.project);
          else if (['quote_sent', 'approved'].includes(newStatus)) {
            emailResult = await sendProjectUpdateEmail(this.project, `Your project status is now ${this.getStatusLabel(newStatus)}.`);
          }
          if (!emailResult.success) this.error = `Status saved, but the email could not be sent: ${emailResult.error}`;
        }
      } catch (error) {
        this.error = error.message || 'Unable to update project status.';
      } finally {
        this.busyAction = false;
      }
    },
    async saveNotes() {
      if (!this.canUpdateProject) return;
      this.busyAction = true;
      this.error = '';
      try {
        const result = await updateProjectFields(this.projectId, { adminNotes: this.adminNotes });
        if (!result.success) throw new Error(result.error || 'Unable to save notes');
        this.showSuccess('Notes saved.');
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busyAction = false;
      }
    },
    async recordPayment() {
      if (!this.canManagePayments) return;
      this.busyAction = true;
      this.error = '';
      try {
        const paymentStatus = this.paymentType === 'advance' ? 'advance_paid' : 'balance_paid';
        const result = await updatePaymentStatus(
          this.projectId,
          paymentStatus,
          `${this.paymentType} payment received`,
          this.paymentMethod
        );
        if (!result.success) throw new Error(result.error || 'Unable to record payment');
        await this.loadProject();
        this.showSuccess('Payment recorded successfully.');
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busyAction = false;
      }
    },
    async downloadQuotation() {
      if (!this.canGenerateDocuments) return;
      const result = await downloadQuotationPDF(this.project);
      if (!result.success) this.error = result.error || 'Unable to generate quotation PDF.';
    },
    async downloadInvoice() {
      if (!this.canGenerateDocuments) return;
      const result = await downloadInvoicePDF(this.project);
      if (!result.success) this.error = result.error || 'Unable to generate invoice PDF.';
    },
    async sendEmailUpdate() {
      if (!this.canSendNotifications) return;
      this.busyAction = true;
      this.error = '';
      try {
        const result = await sendProjectUpdateEmail(this.project, 'Please find the latest update for your solar project.');
        if (!result.success) throw new Error(result.error || 'Unable to send email');
        this.showSuccess('Email sent successfully.');
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busyAction = false;
      }
    },
    getStatusLabel(status) {
      return PROJECT_STATUS_LABELS[status] || status || 'Unknown';
    },
    getStatusColor(status) {
      return PROJECT_STATUS_COLORS[status] || '#6c757d';
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
.spec-card,
.payment-milestone {
  padding: 1rem;
  border: 1px solid var(--ant-slate-200);
  border-radius: 10px;
  background: var(--ant-slate-50);
}
.spec-card { border-left: 4px solid var(--ant-blue-700); }
.payment-milestone { border-left: 4px solid var(--ant-green-600); }
.photo-thumbnail { width: 100%; aspect-ratio: 1; object-fit: cover; }
.list-group-item-action { padding: 0.9rem 1rem; color: var(--ant-slate-700); }
.stock-readiness { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.45rem 0.7rem; border-radius: 999px; font-size: 0.85rem; font-weight: 800; }
.stock-readiness.is-ready { background: #dcfce7; color: #166534; }
.stock-readiness.is-short { background: #fef3c7; color: #92400e; }
.priority-chip { display: inline-flex; padding: 0.25rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; }
.priority-chip.is-critical { background: #fee2e2; color: #991b1b; }
.priority-chip.is-high { background: #ffedd5; color: #9a3412; }
.priority-chip.is-medium { background: #fef3c7; color: #92400e; }
.priority-chip.is-low { background: #e2e8f0; color: #475569; }
.stock-plan-table th { white-space: nowrap; }
</style>
