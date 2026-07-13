<template>
  <div class="project-workspace container-fluid py-4">
    <div v-if="loading" class="text-center my-5" role="status">
      <div class="spinner-border text-primary"></div>
      <p class="mt-3 text-muted">Loading project workspace…</p>
    </div>

    <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
      <i class="fas fa-circle-exclamation me-2"></i>{{ error }}
      <button type="button" class="btn-close" aria-label="Close" @click="error = ''"></button>
    </div>
    <div v-if="successMessage" class="alert alert-success" role="status">
      <i class="fas fa-circle-check me-2"></i>{{ successMessage }}
    </div>
    <div v-if="warningMessage" class="alert alert-warning" role="status">
      <i class="fas fa-triangle-exclamation me-2"></i>{{ warningMessage }}
    </div>

    <template v-if="!loading && project">
      <header class="workspace-header mb-4">
        <div>
          <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span class="eyebrow">Project workspace</span>
            <span class="status-pill" :style="{ backgroundColor: getStatusColor(project.status) }">
              {{ getStatusLabel(project.status) }}
            </span>
          </div>
          <h1 class="h3 mb-1">#{{ shortProjectId }}</h1>
          <p class="text-muted mb-0">Quotation, site survey, equipment, payment and customer communication control.</p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button v-if="canUpdateProject" class="btn btn-primary" :disabled="busyAction" @click="toggleEdit">
            <i :class="editMode ? 'fas fa-xmark' : 'fas fa-pen-to-square'" class="me-2"></i>
            {{ editMode ? 'Close editor' : 'Edit project' }}
          </button>
          <router-link :to="{ name: 'ProjectManagement' }" class="btn btn-outline-secondary">
            <i class="fas fa-arrow-left me-2"></i>Projects
          </router-link>
        </div>
      </header>

      <section v-if="canUpdateProject && editMode" class="card border-primary mb-4">
        <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div>
            <h2 class="h5 mb-1">Edit project and quotation</h2>
            <p class="small text-muted mb-0">Out-of-stock equipment remains selectable and is included in internal restock planning.</p>
          </div>
          <span class="badge bg-light text-dark">Revision {{ project.revision || 0 }}</span>
        </div>
        <div class="card-body">
          <form @submit.prevent="saveProject">
            <div class="section-title"><span>Customer and ownership</span></div>
            <div class="row g-3 mb-4">
              <div class="col-md-6"><label class="form-label">Customer name</label><input v-model.trim="editForm.customerName" class="form-control" maxlength="100" required /></div>
              <div class="col-md-6"><label class="form-label">Customer email</label><input v-model.trim="editForm.customerEmail" type="email" class="form-control" required /></div>
              <div class="col-md-6"><label class="form-label">Phone</label><input v-model.trim="editForm.customerPhone" class="form-control" maxlength="30" required /></div>
              <div class="col-md-6"><label class="form-label">Installation address</label><input v-model.trim="editForm.address" class="form-control" maxlength="500" required /></div>
              <div class="col-md-6"><label class="form-label">Sales owner</label><input v-model.trim="editForm.salesOwner" class="form-control" maxlength="150" /></div>
              <div class="col-md-6"><label class="form-label">Installation coordinator</label><input v-model.trim="editForm.installationCoordinator" class="form-control" maxlength="150" /></div>
            </div>

            <div class="section-title"><span>System equipment</span></div>
            <div v-if="!equipment.panels.length" class="alert alert-warning">
              <strong>No panel model is configured in inventory.</strong>
              <span class="d-block small mt-1">Add an actual panel item or create the bifacial and non-bifacial starter models.</span>
              <button v-if="capabilities.canSeedPanels" type="button" class="btn btn-sm btn-warning mt-2" :disabled="busyAction" @click="seedPanelModels">
                Create bifacial and non-bifacial models
              </button>
              <router-link v-else :to="{ name: 'ManageInventory' }" class="btn btn-sm btn-outline-dark mt-2">Open inventory</router-link>
            </div>
            <div class="row g-3 mb-2">
              <div class="col-md-4">
                <label class="form-label">Panel model</label>
                <select v-model="editForm.panelId" class="form-select" :disabled="!equipment.panels.length" required>
                  <option value="" disabled>Select panel model</option>
                  <option v-for="item in equipment.panels" :key="item.id" :value="item.id" :disabled="item.discontinued && item.id !== selectedIds.panelId">
                    {{ optionLabel(item, panelSpecification(item)) }}
                  </option>
                </select>
              </div>
              <div class="col-md-2"><label class="form-label">Panel quantity</label><input v-model.number="editForm.panelCount" type="number" min="1" max="500" step="1" class="form-control" required /></div>
              <div class="col-md-6">
                <label class="form-label">Inverter</label>
                <select v-model="editForm.inverterId" class="form-select" required @change="handleInverterChange">
                  <option value="" disabled>Select inverter</option>
                  <option v-for="item in equipment.inverters" :key="item.id" :value="item.id" :disabled="item.discontinued && item.id !== selectedIds.inverterId">
                    {{ optionLabel(item, inverterSpecification(item)) }}
                  </option>
                </select>
              </div>
              <div class="col-md-8">
                <label class="form-label">Battery</label>
                <select v-model="editForm.batteryId" class="form-select" :disabled="selectedInverterBatteryVoltage <= 0">
                  <option value="">{{ selectedInverterBatteryVoltage <= 0 ? 'Not supported / grid-tie configuration' : 'Select compatible battery' }}</option>
                  <option v-for="item in equipment.batteries" :key="item.id" :value="item.id" :disabled="item.discontinued && item.id !== selectedIds.batteryId">
                    {{ optionLabel(item, batterySpecification(item)) }}
                  </option>
                </select>
              </div>
              <div class="col-md-4"><label class="form-label">Battery quantity</label><input v-model.number="editForm.batteryQuantity" type="number" min="0" step="1" class="form-control" :disabled="!editForm.batteryId" /></div>
            </div>
            <div v-if="selectedEquipmentWarning" class="alert alert-warning py-2">{{ selectedEquipmentWarning }}</div>

            <div class="section-title mt-4"><span>Price and advance terms</span></div>
            <div class="row g-3 mb-2">
              <div class="col-md-4"><label class="form-label">Quoted price (Rs)</label><input v-model.number="editForm.quotedPrice" type="number" min="1" step="0.01" class="form-control" :disabled="commercialsLocked" required @input="syncAdvanceFromSelectedMode" /></div>
              <div class="col-md-4"><label class="form-label">Advance input method</label><select v-model="editForm.advanceMode" class="form-select" :disabled="commercialsLocked" @change="syncAdvanceFromSelectedMode"><option value="percentage">Percentage</option><option value="amount">Amount in rupees</option></select></div>
              <div v-if="editForm.advanceMode === 'percentage'" class="col-md-4"><label class="form-label">Advance percentage</label><div class="input-group"><input v-model.number="editForm.advancePercentage" type="number" min="50" max="100" step="0.01" class="form-control" :disabled="commercialsLocked" required @input="syncAdvanceAmount" /><span class="input-group-text">%</span></div></div>
              <div v-else class="col-md-4"><label class="form-label">Advance amount (Rs)</label><input v-model.number="editForm.advanceAmount" type="number" :min="minimumAdvance" :max="numberValue(editForm.quotedPrice)" step="0.01" class="form-control" :disabled="commercialsLocked" required @input="syncAdvancePercentage" /></div>
            </div>
            <div class="commercial-preview mb-4">
              <div><span>Advance</span><strong>Rs {{ formatCurrency(calculatedAdvanceAmount) }} ({{ calculatedAdvancePercentage.toFixed(2) }}%)</strong></div>
              <div><span>Balance</span><strong>Rs {{ formatCurrency(calculatedBalanceAmount) }}</strong></div>
            </div>
            <div v-if="commercialsLocked" class="alert alert-info py-2">Price and advance terms are locked because a payment has been recorded.</div>

            <div class="section-title"><span>Schedule and notes</span></div>
            <div class="row g-3">
              <div class="col-md-6"><label class="form-label">Scheduled installation date</label><input v-model="editForm.installationScheduledDate" type="date" class="form-control" /></div>
              <div class="col-md-6"><label class="form-label">Target completion date</label><input v-model="editForm.targetCompletionDate" type="date" class="form-control" /></div>
              <div class="col-12"><label class="form-label">Customer notes</label><textarea v-model.trim="editForm.customerNotes" class="form-control" rows="2" maxlength="1000"></textarea></div>
              <div class="col-12"><label class="form-label">Internal notes</label><textarea v-model.trim="editForm.adminNotes" class="form-control" rows="3" maxlength="2000"></textarea></div>
              <div class="col-12"><label class="form-label">Technical notes</label><textarea v-model.trim="editForm.technicalNotes" class="form-control" rows="3" maxlength="3000"></textarea></div>
            </div>

            <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-4">
              <label v-if="canSendNotifications" class="form-check"><input v-model="editForm.notifyCustomer" class="form-check-input" type="checkbox" /><span class="form-check-label">Email only when customer-visible details change</span></label>
              <div class="d-flex gap-2 ms-auto"><button type="button" class="btn btn-outline-secondary" @click="resetEditForm">Reset</button><button type="submit" class="btn btn-primary" :disabled="busyAction || !equipment.panels.length"><span v-if="busyAction" class="spinner-border spinner-border-sm me-2"></span>Save project</button></div>
            </div>
          </form>
        </div>
      </section>

      <div class="row g-4">
        <div class="col-xl-8">
          <section class="card mb-4">
            <div class="card-header"><h2 class="h5 mb-1">Customer and system</h2><p class="small text-muted mb-0">Customer-visible system and contact details.</p></div>
            <div class="card-body">
              <div class="row g-4 mb-4">
                <div class="col-md-6"><dl class="detail-list"><div><dt>Name</dt><dd>{{ project.customerName || 'N/A' }}</dd></div><div><dt>Email</dt><dd><a :href="`mailto:${project.customerEmail}`">{{ project.customerEmail || 'N/A' }}</a></dd></div><div><dt>Phone</dt><dd>{{ project.customerPhone || 'N/A' }}</dd></div></dl></div>
                <div class="col-md-6"><dl class="detail-list"><div><dt>Address</dt><dd>{{ project.address || 'N/A' }}</dd></div><div><dt>Created</dt><dd>{{ formatDate(project.createdAt) }}</dd></div><div><dt>Installation</dt><dd>{{ formatDate(project.installationScheduledDate) }}</dd></div></dl></div>
              </div>
              <div class="row g-3">
                <div class="col-md-4"><div class="spec-card h-100"><small>Panels</small><strong>{{ numberValue(project.panelCount) }} × {{ project.panel?.name || 'Panel' }}</strong><span>{{ panelPublicSpecification }}</span></div></div>
                <div class="col-md-4"><div class="spec-card h-100"><small>Inverter</small><strong>{{ project.inverter?.name || 'N/A' }}</strong><span>{{ numberValue(project.inverter?.peakLoad || project.inverter?.specs?.peakLoad) }} KVA</span></div></div>
                <div class="col-md-4"><div class="spec-card h-100"><small>Battery</small><strong>{{ project.battery?.selectedBattery?.name || 'Not required' }}</strong><span>{{ project.battery?.selectedBattery ? `${numberValue(project.battery.quantity)} unit(s)` : 'Grid-tie / no battery' }}</span></div></div>
              </div>
            </div>
          </section>

          <section class="card mb-4">
            <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2"><div><h2 class="h5 mb-1">Quotation stock readiness</h2><p class="small text-muted mb-0">Internal availability after committed projects.</p></div><span v-if="stockPlan" class="stock-readiness" :class="stockPlan.status === 'ready' ? 'is-ready' : 'is-short'">{{ stockPlan.status === 'ready' ? 'Ready to supply' : `${stockPlan.shortItemCount || 0} item(s) need action` }}</span></div>
            <div v-if="stockPlan?.lines?.length" class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr><th>Item</th><th>Required</th><th>Available</th><th>Shortfall</th><th>Priority</th></tr></thead><tbody><tr v-for="line in stockPlan.lines" :key="`${line.itemId}-${line.type}`"><td><strong>{{ line.name }}</strong><br /><small class="text-muted">{{ line.sku || 'No SKU' }}</small></td><td>{{ line.requiredQuantity }} {{ line.unit }}</td><td>{{ line.availableQuantity }} {{ line.unit }}</td><td><strong :class="line.shortfall ? 'text-danger' : 'text-success'">{{ line.shortfall }}</strong></td><td><span class="priority-chip" :class="`is-${line.restockPriority}`">{{ priorityLabel(line.restockPriority) }}</span></td></tr></tbody></table></div>
            <div v-else class="card-body text-muted">No mapped stock plan is available for this project.</div>
          </section>

          <section class="card mb-4">
            <div class="card-header"><h2 class="h5 mb-1">Activity and communication</h2><p class="small text-muted mb-0">Quotation, invoice and payment emails show their attached PDF when applicable.</p></div>
            <div class="card-body">
              <div v-if="notifications.length" class="notification-list">
                <article v-for="notification in notifications" :key="notification.id" class="notification-item">
                  <div class="notification-icon" :class="`is-${notification.status}`"><i :class="notificationIcon(notification.type)"></i></div>
                  <div class="flex-grow-1"><div class="d-flex flex-wrap justify-content-between gap-2"><strong>{{ notificationLabel(notification.type) }}</strong><span class="badge" :class="notificationBadge(notification.status)">{{ notification.status }}</span></div><small class="text-muted">{{ formatDateTime(notification.createdAt) }} · {{ notification.to || project.customerEmail }}</small><small v-if="notification.attachmentName" class="d-block text-primary"><i class="fas fa-paperclip me-1"></i>{{ notification.attachmentName }}</small><p v-if="notification.error" class="small text-danger mb-0 mt-1">{{ notification.error }}</p></div>
                  <button v-if="canSendNotifications && notification.status === 'failed'" class="btn btn-sm btn-outline-primary" :disabled="busyAction" @click="retryNotification(notification.id)">Retry</button>
                </article>
              </div>
              <div v-else class="text-muted">No automated customer email has been recorded yet.</div>
            </div>
          </section>

          <section class="card"><div class="card-header"><h2 class="h5 mb-0">Operational notes</h2></div><div class="card-body"><div class="row g-3"><div class="col-md-6"><small class="text-muted d-block">Sales owner</small><strong>{{ project.salesOwner || 'Not assigned' }}</strong></div><div class="col-md-6"><small class="text-muted d-block">Installation coordinator</small><strong>{{ project.installationCoordinator || 'Not assigned' }}</strong></div><div class="col-12"><small class="text-muted d-block">Internal notes</small><p class="mb-0 pre-wrap">{{ project.adminNotes || 'No internal notes.' }}</p></div><div class="col-12"><small class="text-muted d-block">Technical notes</small><p class="mb-0 pre-wrap">{{ project.technicalNotes || 'No technical notes.' }}</p></div></div></div></section>
        </div>

        <div class="col-xl-4">
          <section class="card mb-4 sticky-card">
            <div class="card-header"><h2 class="h5 mb-1">Commercial position</h2></div>
            <div class="card-body">
              <div class="commercial-row"><span>Quoted price</span><strong>Rs {{ formatCurrency(project.quotedPrice) }}</strong></div>
              <div class="commercial-row"><span>Advance target</span><strong>Rs {{ formatCurrency(project.advanceAmount) }} <small>({{ numberValue(project.advancePercentage) }}%)</small></strong></div>
              <div class="commercial-row"><span>Contract balance</span><strong>Rs {{ formatCurrency(project.balanceAmount) }}</strong></div>
              <hr />
              <div class="commercial-row"><span>Amount received</span><strong class="text-success">Rs {{ formatCurrency(amountPaid) }}</strong></div>
              <div class="commercial-row"><span>Amount due</span><strong :class="amountDue > 0 ? 'text-danger' : 'text-success'">Rs {{ formatCurrency(amountDue) }}</strong></div>
              <div class="commercial-row"><span>Completion threshold</span><strong>Rs {{ formatCurrency(minimumCompletionPayment) }} (50%)</strong></div>
              <div class="progress mt-3" style="height:9px"><div class="progress-bar bg-success" :style="{ width: `${paymentProgress}%` }"></div></div>
              <small class="text-muted">{{ paymentProgress.toFixed(0) }}% collected</small>
              <div v-if="project.status === 'in_progress'" class="completion-gate mt-3" :class="completionBlocked ? 'is-blocked' : 'is-ready'">
                <i :class="completionBlocked ? 'fas fa-lock' : 'fas fa-circle-check'"></i>
                <div>
                  <strong>{{ completionBlocked ? 'Completion locked' : 'Completion payment satisfied' }}</strong>
                  <span v-if="completionBlocked">Record another Rs {{ formatCurrency(completionPaymentRemaining) }} before marking installation completed.</span>
                  <span v-else>At least 50% of the quotation has been received.</span>
                </div>
              </div>
            </div>
          </section>

          <SiteSurveyPanel :project="project" :can-update="canUpdateProject" @updated="loadWorkspace" @warning="warningMessage = $event" />

          <section v-if="canUpdateProject" class="card mb-4">
            <div class="card-header"><h2 class="h5 mb-1">Move project forward</h2><p class="small text-muted mb-0">Workflow checks protect survey, payment and customer-notification requirements.</p></div>
            <div class="card-body">
              <div v-if="project.status === 'in_progress'" class="completion-gate mb-3" :class="completionBlocked ? 'is-blocked' : 'is-ready'">
                <i :class="completionBlocked ? 'fas fa-lock' : 'fas fa-circle-check'"></i>
                <div>
                  <strong>{{ completionBlocked ? '50% payment required' : 'Ready for completion' }}</strong>
                  <span v-if="completionBlocked">Received Rs {{ formatCurrency(amountPaid) }} of the Rs {{ formatCurrency(minimumCompletionPayment) }} minimum.</span>
                  <span v-else>The payment condition for completion is satisfied.</span>
                </div>
              </div>
              <label class="form-label">Customer update message</label>
              <textarea v-model.trim="statusCustomerMessage" class="form-control mb-3" rows="3" maxlength="1000"></textarea>
              <div v-if="availableStatusActions.some(action => action.status === 'installation_scheduled')" class="mb-3"><label class="form-label">Installation date</label><input v-model="statusInstallationDate" type="date" class="form-control" /></div>
              <div class="d-grid gap-2">
                <button v-for="action in availableStatusActions" :key="action.status" class="btn" :class="action.className" :disabled="busyAction || action.disabled" @click="updateStatus(action.status)">{{ action.label }}</button>
                <span v-if="approvalBlocked" class="small text-warning">Complete the site survey before approving the quotation.</span>
                <span v-if="completionBlocked" class="small text-warning">Completion remains unavailable until at least 50% of the quoted price is recorded.</span>
                <span v-if="!availableStatusActions.length" class="text-muted">This status has no further workflow actions.</span>
              </div>
            </div>
          </section>

          <section v-if="canManagePayments" class="card mb-4"><div class="card-header"><h2 class="h5 mb-1">Record payment</h2><p class="small text-muted mb-0">Every payment sends a PDF receipt.</p></div><div class="card-body"><div class="mb-3"><label class="form-label">Amount received (Rs)</label><input v-model.number="paymentForm.amount" type="number" min="0.01" :max="amountDue" step="0.01" class="form-control" :disabled="amountDue <= 0 || !paymentReady" /></div><div class="mb-3"><label class="form-label">Method</label><select v-model="paymentForm.method" class="form-select"><option value="bank_transfer">Bank transfer</option><option value="upi">UPI</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="other">Other</option></select></div><div class="mb-3"><label class="form-label">Reference / transaction ID</label><input v-model.trim="paymentForm.reference" class="form-control" maxlength="120" /></div><div class="mb-3"><label class="form-label">Payment date</label><input v-model="paymentForm.receivedAt" type="date" class="form-control" /></div><div class="mb-3"><label class="form-label">Internal note</label><textarea v-model.trim="paymentForm.note" class="form-control" rows="2" maxlength="500"></textarea></div><button class="btn btn-success w-100" :disabled="busyAction || !paymentReady || amountDue <= 0 || numberValue(paymentForm.amount) <= 0" @click="recordPayment">Record payment and email PDF receipt</button><small v-if="!paymentReady" class="d-block text-muted mt-2">Approve the quotation before recording payment.</small></div></section>

          <section v-if="canGenerateDocuments" class="card mb-4"><div class="card-header"><h2 class="h5 mb-0">Documents</h2></div><div class="list-group list-group-flush"><button class="list-group-item list-group-item-action" @click="downloadQuotation"><i class="fas fa-file-pdf me-2"></i>Download quotation PDF</button><button class="list-group-item list-group-item-action" @click="downloadInvoice"><i class="fas fa-file-invoice me-2"></i>Download invoice PDF</button></div></section>

          <section v-if="canDeleteProject" class="card border-danger"><div class="card-header text-danger"><h2 class="h5 mb-1">Delete project</h2></div><div class="card-body"><button class="btn btn-outline-danger w-100" @click="deletePanelOpen = !deletePanelOpen"><i class="fas fa-trash me-2"></i>Delete project</button><div v-if="deletePanelOpen" class="mt-3"><label class="form-label">Reason</label><textarea v-model.trim="deleteForm.reason" class="form-control mb-3" rows="2" maxlength="1000"></textarea><label class="form-label">Type the full project ID</label><input v-model.trim="deleteForm.confirmation" class="form-control mb-3" :placeholder="project.projectId" /><button class="btn btn-danger w-100" :disabled="busyAction || deleteForm.confirmation !== project.projectId || deleteForm.reason.length < 5" @click="deleteProject">Confirm deletion</button></div></div></section>
        </div>
      </div>
    </template>
  </div>
</template>

<script>
import SiteSurveyPanel from '@/components/SiteSurveyPanel.vue';
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from '@/constants/businessConstants';
import { downloadInvoicePDF, downloadQuotationPDF } from '@/utils/pdfGenerator';
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

export default {
  name: 'ProjectApproval',
  components: { SiteSurveyPanel },
  mixins: [rbacMixin],
  props: { projectId: { type: String, required: true } },
  data() {
    return {
      project: null,
      equipment: { panels: [], inverters: [], batteries: [] },
      stockPlan: null,
      notifications: [],
      capabilities: {},
      setupRequired: {},
      loading: false,
      busyAction: false,
      error: '',
      successMessage: '',
      warningMessage: '',
      editMode: false,
      editForm: {},
      statusCustomerMessage: '',
      statusInstallationDate: '',
      paymentForm: { amount: 0, method: 'bank_transfer', reference: '', note: '', receivedAt: new Date().toISOString().slice(0, 10) },
      deletePanelOpen: false,
      deleteForm: { reason: '', confirmation: '' }
    };
  },
  computed: {
    canUpdateProject() { return this.can(PERMISSIONS.PROJECTS_UPDATE); },
    canManagePayments() { return this.can(PERMISSIONS.PROJECTS_PAYMENTS); },
    canGenerateDocuments() { return this.can(PERMISSIONS.PROJECTS_DOCUMENTS); },
    canSendNotifications() { return this.can(PERMISSIONS.NOTIFICATIONS_SEND); },
    canDeleteProject() { return this.can(PERMISSIONS.PROJECTS_DELETE); },
    shortProjectId() { return String(this.project?.projectId || this.projectId).slice(0, 18); },
    selectedIds() { return { panelId: this.itemId(this.project?.panel), inverterId: this.itemId(this.project?.inverter), batteryId: this.itemId(this.project?.battery?.selectedBattery) }; },
    selectedInverter() { return this.equipment.inverters.find(item => item.id === this.editForm.inverterId); },
    selectedBattery() { return this.equipment.batteries.find(item => item.id === this.editForm.batteryId); },
    selectedInverterBatteryVoltage() { return this.numberValue(this.selectedInverter?.specs?.batterySupported); },
    selectedEquipmentWarning() { const selected = [this.equipment.panels.find(item => item.id === this.editForm.panelId), this.selectedInverter, this.selectedBattery].filter(Boolean); const unavailable = selected.filter(item => item.outOfStock).map(item => item.name); return unavailable.length ? `Selected but currently out of stock: ${unavailable.join(', ')}. The project can still be saved.` : ''; },
    panelPublicSpecification() { const type = this.project?.panel?.panelType || this.project?.panel?.technology || this.project?.panel?.specs?.technology; const wattage = this.numberValue(this.project?.panel?.wattage || this.project?.panel?.specs?.wattage); return [wattage ? `${wattage} W each` : '', type || ''].filter(Boolean).join(' · ') || 'Specifications not set'; },
    amountPaid() { return this.numberValue(this.project?.amountPaid) || (this.project?.paymentHistory || []).reduce((sum, entry) => sum + this.numberValue(entry.amount), 0); },
    amountDue() { return Math.max(0, this.numberValue(this.project?.quotedPrice) - this.amountPaid); },
    paymentProgress() { return this.numberValue(this.project?.quotedPrice) > 0 ? Math.min(100, (this.amountPaid / this.numberValue(this.project.quotedPrice)) * 100) : 0; },
    paymentReady() { return Boolean(this.project?.approvalDate); },
    commercialsLocked() { return this.amountPaid > 0; },
    minimumAdvance() { return this.numberValue(this.editForm.quotedPrice) * 0.5; },
    minimumCompletionPayment() { return Math.round(this.numberValue(this.project?.quotedPrice) * 0.5 * 100) / 100; },
    completionPaymentRemaining() { return Math.max(0, this.minimumCompletionPayment - this.amountPaid); },
    completionBlocked() { return this.project?.status === 'in_progress' && this.amountPaid + 0.01 < this.minimumCompletionPayment; },
    calculatedAdvancePercentage() { return this.editForm.advanceMode === 'amount' ? (this.numberValue(this.editForm.advanceAmount) / Math.max(1, this.numberValue(this.editForm.quotedPrice))) * 100 : this.numberValue(this.editForm.advancePercentage); },
    calculatedAdvanceAmount() { return this.editForm.advanceMode === 'amount' ? this.numberValue(this.editForm.advanceAmount) : this.numberValue(this.editForm.quotedPrice) * this.numberValue(this.editForm.advancePercentage) / 100; },
    calculatedBalanceAmount() { return Math.max(0, this.numberValue(this.editForm.quotedPrice) - this.calculatedAdvanceAmount); },
    approvalBlocked() { return this.project?.status === 'quote_sent' && this.project?.siteSurveyStatus !== 'completed'; },
    availableStatusActions() {
      if (!this.canUpdateProject) return [];
      const actions = {
        quote_pending: [{ status: 'quote_sent', label: 'Send quotation with PDF', className: 'btn-primary' }, { status: 'cancelled', label: 'Cancel project', className: 'btn-outline-danger' }],
        quote_sent: [{ status: 'approved', label: 'Approve and email invoice', className: 'btn-success', disabled: this.project?.siteSurveyStatus !== 'completed' }, { status: 'quote_rejected', label: 'Mark quotation rejected', className: 'btn-outline-danger' }, { status: 'cancelled', label: 'Cancel project', className: 'btn-outline-secondary' }],
        approved: [{ status: 'installation_scheduled', label: 'Schedule installation', className: 'btn-info' }, { status: 'cancelled', label: 'Cancel project', className: 'btn-outline-danger' }],
        installation_scheduled: [{ status: 'in_progress', label: 'Start installation', className: 'btn-warning' }, { status: 'cancelled', label: 'Cancel project', className: 'btn-outline-danger' }],
        in_progress: [{ status: 'completed', label: this.completionBlocked ? 'Complete installation — payment required' : 'Complete installation', className: 'btn-success', disabled: this.completionBlocked }, { status: 'cancelled', label: 'Cancel project', className: 'btn-outline-danger' }]
      };
      return actions[this.project?.status] || [];
    }
  },
  created() { this.loadWorkspace(); },
  methods: {
    numberValue(value) { const number = Number(value); return Number.isFinite(number) ? number : 0; },
    itemId(item) { return String(item?.id || item?.inventoryId || item?.itemId || ''); },
    dateInput(value) { const date = this.toDate(value); return date ? date.toISOString().slice(0, 10) : ''; },
    toDate(value) { if (!value) return null; if (typeof value.toDate === 'function') return value.toDate(); if (value._seconds) return new Date(value._seconds * 1000); const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; },
    async loadWorkspace() { this.loading = true; this.error = ''; try { const result = await authenticatedJsonRequest(`/.netlify/functions/getProjectWorkspace?projectId=${encodeURIComponent(this.projectId)}`, { method: 'GET' }); this.project = result.project; this.equipment = result.equipment || { panels: [], inverters: [], batteries: [] }; this.stockPlan = result.stockPlan || null; this.notifications = result.notifications || []; this.capabilities = result.capabilities || {}; this.setupRequired = result.setupRequired || {}; this.resetEditForm(); this.preparePaymentAmount(); } catch (error) { this.project = null; this.error = error.message || 'Unable to load the project workspace.'; } finally { this.loading = false; } },
    resetEditForm() { if (!this.project) return; this.editForm = { customerName: this.project.customerName || '', customerEmail: this.project.customerEmail || '', customerPhone: this.project.customerPhone || '', address: this.project.address || '', panelId: this.itemId(this.project.panel), panelCount: this.numberValue(this.project.panelCount), inverterId: this.itemId(this.project.inverter), batteryId: this.itemId(this.project.battery?.selectedBattery), batteryQuantity: this.numberValue(this.project.battery?.quantity), quotedPrice: this.numberValue(this.project.quotedPrice), advanceMode: 'percentage', advancePercentage: this.numberValue(this.project.advancePercentage) || 50, advanceAmount: this.numberValue(this.project.advanceAmount), installationScheduledDate: this.dateInput(this.project.installationScheduledDate), targetCompletionDate: this.dateInput(this.project.targetCompletionDate), customerNotes: this.project.customerNotes || '', adminNotes: this.project.adminNotes || '', technicalNotes: this.project.technicalNotes || '', salesOwner: this.project.salesOwner || '', installationCoordinator: this.project.installationCoordinator || '', notifyCustomer: true }; if (!this.editForm.advanceAmount) this.syncAdvanceAmount(); },
    toggleEdit() { this.editMode = !this.editMode; if (this.editMode) this.resetEditForm(); },
    syncAdvanceFromSelectedMode() { if (this.editForm.advanceMode === 'amount') this.syncAdvancePercentage(); else this.syncAdvanceAmount(); },
    syncAdvanceAmount() { this.editForm.advanceAmount = Math.round(this.numberValue(this.editForm.quotedPrice) * this.numberValue(this.editForm.advancePercentage) / 100 * 100) / 100; },
    syncAdvancePercentage() { this.editForm.advancePercentage = this.numberValue(this.editForm.quotedPrice) > 0 ? Math.round(this.numberValue(this.editForm.advanceAmount) / this.numberValue(this.editForm.quotedPrice) * 10000) / 100 : 0; },
    handleInverterChange() { if (this.selectedInverterBatteryVoltage <= 0) { this.editForm.batteryId = ''; this.editForm.batteryQuantity = 0; } },
    optionLabel(item, specification = '') { const state = item.discontinued ? 'Discontinued' : item.outOfStock ? 'Out of stock' : item.lowStock ? `Low stock (${item.availableQuantity})` : `Available ${item.availableQuantity}`; return `${item.name}${specification ? ` · ${specification}` : ''} — ${state}`; },
    panelSpecification(item) { return [item.specs?.technology, this.numberValue(item.specs?.wattage) ? `${this.numberValue(item.specs.wattage)} W` : ''].filter(Boolean).join(' · '); },
    inverterSpecification(item) { return `${this.numberValue(item.specs?.peakLoad)} KVA · max ${this.numberValue(item.specs?.maxPanels)} panels`; },
    batterySpecification(item) { return `${this.numberValue(item.specs?.capacity)} Ah · ${this.numberValue(item.specs?.energy)} kWh`; },
    showSuccess(message) { this.successMessage = message; window.setTimeout(() => { this.successMessage = ''; }, 4500); },
    async seedPanelModels() { this.busyAction = true; this.error = ''; try { const result = await authenticatedJsonRequest('/.netlify/functions/seedPanelTypes', { method: 'POST' }); this.showSuccess(result.message); await this.loadWorkspace(); } catch (error) { this.error = error.message; } finally { this.busyAction = false; } },
    async saveProject() { this.busyAction = true; this.error = ''; this.warningMessage = ''; try { const result = await authenticatedJsonRequest('/.netlify/functions/updateProjectDetails', { method: 'PUT', body: JSON.stringify({ projectId: this.projectId, expectedRevision: this.numberValue(this.project.revision), ...this.editForm }) }); await this.loadWorkspace(); this.editMode = false; this.showSuccess('Project and quotation details updated.'); if (result.email?.attempted && !result.email.sent) this.warningMessage = result.email.error; } catch (error) { this.error = error.message; } finally { this.busyAction = false; } },
    async updateStatus(status) { const action = this.availableStatusActions.find(item => item.status === status); if (action?.disabled) { this.error = status === 'completed' && this.completionBlocked ? `Record at least 50% of the quoted price before completion. Another Rs ${this.formatCurrency(this.completionPaymentRemaining)} is required.` : 'Complete the site survey before approving the quotation.'; return; } if (status === 'installation_scheduled' && !this.statusInstallationDate) { this.error = 'Choose an installation date before scheduling.'; return; } if (['cancelled', 'quote_rejected'].includes(status) && !window.confirm(`Confirm ${this.getStatusLabel(status)}? The customer will receive an email.`)) return; this.busyAction = true; this.error = ''; this.warningMessage = ''; try { const result = await authenticatedJsonRequest('/.netlify/functions/updateProjectStatus', { method: 'POST', body: JSON.stringify({ projectId: this.projectId, status, customerMessage: this.statusCustomerMessage, installationScheduledDate: this.statusInstallationDate || null, expectedRevision: this.numberValue(this.project.revision) }) }); await this.loadWorkspace(); this.statusCustomerMessage = ''; this.showSuccess(`Status updated to ${this.getStatusLabel(status)}.${result.email?.attachmentName ? ` ${result.email.attachmentName} was emailed.` : ''}`); if (!result.email?.sent) this.warningMessage = result.email?.error || 'Customer email delivery is pending.'; } catch (error) { this.error = error.message; } finally { this.busyAction = false; } },
    preparePaymentAmount() { if (!this.project) return; const remainingAdvance = Math.max(0, this.numberValue(this.project.advanceAmount) - this.amountPaid); this.paymentForm.amount = remainingAdvance > 0 ? remainingAdvance : this.amountDue; },
    async recordPayment() { this.busyAction = true; this.error = ''; this.warningMessage = ''; try { const result = await authenticatedJsonRequest('/.netlify/functions/recordProjectPayment', { method: 'POST', body: JSON.stringify({ projectId: this.projectId, expectedRevision: this.numberValue(this.project.revision), ...this.paymentForm }) }); await this.loadWorkspace(); this.paymentForm.reference = ''; this.paymentForm.note = ''; this.showSuccess('Payment recorded and PDF receipt email processed.'); if (!result.email?.sent) this.warningMessage = result.email?.error; } catch (error) { this.error = error.message; } finally { this.busyAction = false; } },
    async retryNotification(notificationId) { this.busyAction = true; this.error = ''; try { const result = await authenticatedJsonRequest('/.netlify/functions/retryProjectNotification', { method: 'POST', body: JSON.stringify({ notificationId }) }); await this.loadWorkspace(); this.showSuccess(result.message || 'Customer email sent.'); } catch (error) { this.error = error.message; } finally { this.busyAction = false; } },
    async deleteProject() { if (!window.confirm('This removes the project from active operations. Continue?')) return; this.busyAction = true; this.error = ''; try { await authenticatedJsonRequest('/.netlify/functions/deleteProject', { method: 'DELETE', body: JSON.stringify({ projectId: this.projectId, ...this.deleteForm }) }); this.$router.replace({ name: 'ProjectManagement', query: { deleted: this.projectId } }); } catch (error) { this.error = error.message; } finally { this.busyAction = false; } },
    async downloadQuotation() { const result = await downloadQuotationPDF(this.project); if (!result.success) this.error = result.error; },
    async downloadInvoice() { const result = await downloadInvoicePDF(this.project); if (!result.success) this.error = result.error; },
    notificationLabel(type) { return { status_changed: 'Status update email', project_changed: 'Project revision email', payment_received: 'Payment receipt email', site_survey_scheduled: 'Site survey scheduled email', site_survey_completed: 'Site survey completed email' }[type] || 'Customer email'; },
    notificationIcon(type) { return { status_changed: 'fas fa-route', project_changed: 'fas fa-pen-to-square', payment_received: 'fas fa-receipt', site_survey_scheduled: 'fas fa-calendar-check', site_survey_completed: 'fas fa-clipboard-check' }[type] || 'fas fa-envelope'; },
    notificationBadge(status) { return { sent: 'bg-success', failed: 'bg-danger', pending: 'bg-warning text-dark' }[status] || 'bg-secondary'; },
    priorityLabel(value) { return { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }[value] || 'Low'; },
    getStatusLabel(status) { return PROJECT_STATUS_LABELS[status] || status || 'Unknown'; },
    getStatusColor(status) { return PROJECT_STATUS_COLORS[status] || '#64748b'; },
    formatCurrency(value) { return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(this.numberValue(value)); },
    formatDate(value) { const date = this.toDate(value); return date ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date) : 'Not set'; },
    formatDateTime(value) { const date = this.toDate(value); return date ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : 'Pending'; }
  }
};
</script>

<style scoped>
.project-workspace { max-width: 1600px; }
.workspace-header { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; padding:1.4rem; border:1px solid var(--ant-slate-200); border-radius:16px; background:linear-gradient(135deg,#fff,#f8fafc); }
.eyebrow { color:var(--ant-blue-700); font-size:.75rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.status-pill { display:inline-flex; padding:.35rem .65rem; border-radius:999px; color:#fff; font-size:.75rem; font-weight:800; }
.section-title { display:flex; align-items:center; gap:.8rem; margin-bottom:1rem; color:var(--ant-slate-800); font-weight:800; }.section-title::after { height:1px; flex:1; background:var(--ant-slate-200); content:''; }
.detail-list { margin:0; }.detail-list div { display:grid; grid-template-columns:130px 1fr; gap:1rem; padding:.55rem 0; border-bottom:1px solid var(--ant-slate-100); }.detail-list dt { color:var(--ant-slate-500); font-weight:600; }.detail-list dd { margin:0; font-weight:600; }
.spec-card { display:flex; flex-direction:column; gap:.25rem; padding:1rem; border:1px solid var(--ant-slate-200); border-left:4px solid var(--ant-blue-700); border-radius:12px; background:var(--ant-slate-50); }.spec-card small,.spec-card span { color:var(--ant-slate-500); }.spec-card strong { color:var(--ant-slate-900); }
.commercial-preview { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; margin-top:1rem; }.commercial-preview div { display:flex; justify-content:space-between; gap:1rem; padding:.85rem 1rem; border-radius:10px; background:var(--ant-slate-50); }.commercial-row { display:flex; justify-content:space-between; gap:1rem; padding:.55rem 0; }.commercial-row span { color:var(--ant-slate-500); }
.completion-gate { display:flex; align-items:flex-start; gap:.75rem; padding:.85rem; border:1px solid; border-radius:12px; }.completion-gate i { margin-top:.2rem; }.completion-gate div { display:flex; flex-direction:column; }.completion-gate span { font-size:.8rem; }.completion-gate.is-blocked { border-color:#fed7aa; color:#9a3412; background:#fff7ed; }.completion-gate.is-ready { border-color:#bbf7d0; color:#166534; background:#f0fdf4; }
.stock-readiness { display:inline-flex; padding:.45rem .7rem; border-radius:999px; font-size:.8rem; font-weight:800; }.stock-readiness.is-ready { background:#dcfce7;color:#166534; }.stock-readiness.is-short { background:#fef3c7;color:#92400e; }
.priority-chip { display:inline-flex; padding:.25rem .5rem; border-radius:999px; font-size:.7rem; font-weight:800; text-transform:uppercase; }.priority-chip.is-critical{background:#fee2e2;color:#991b1b}.priority-chip.is-high{background:#ffedd5;color:#9a3412}.priority-chip.is-medium{background:#fef3c7;color:#92400e}.priority-chip.is-low{background:#e2e8f0;color:#475569}
.notification-list { display:grid; gap:.8rem; }.notification-item { display:flex; align-items:flex-start; gap:.8rem; padding:.85rem; border:1px solid var(--ant-slate-200); border-radius:12px; }.notification-icon { display:grid; place-items:center; width:38px; height:38px; flex:0 0 38px; border-radius:10px; background:var(--ant-slate-100); color:var(--ant-slate-600); }.notification-icon.is-sent{background:#dcfce7;color:#166534}.notification-icon.is-failed{background:#fee2e2;color:#991b1b}.notification-icon.is-pending{background:#fef3c7;color:#92400e}
.sticky-card { position:sticky; top:92px; }.pre-wrap { white-space:pre-wrap; }
@media (max-width:1199.98px){.sticky-card{position:static}.workspace-header{align-items:flex-start;flex-direction:column}}@media (max-width:767.98px){.commercial-preview{grid-template-columns:1fr}.detail-list div{grid-template-columns:1fr;gap:.2rem}}
</style>
