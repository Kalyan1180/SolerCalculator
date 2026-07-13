<template>
  <div class="message-inbox container-fluid py-4">
    <header class="inbox-header mb-4">
      <div>
        <span class="eyebrow">Customer enquiries</span>
        <h1 class="h3 mb-1">Message Inbox</h1>
        <p class="text-muted mb-0">Review, prioritise, assign and resolve website enquiries without automatic email notifications.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadMessages">
        <i class="fas fa-rotate me-2" aria-hidden="true"></i>{{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
    </header>

    <div v-if="error" class="alert alert-danger alert-dismissible fade show" role="alert">
      <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ error }}
      <button type="button" class="btn-close" aria-label="Close" @click="error = ''"></button>
    </div>
    <div v-if="successMessage" class="alert alert-success" role="status">
      <i class="fas fa-circle-check me-2" aria-hidden="true"></i>{{ successMessage }}
    </div>
    <div v-if="truncated" class="alert alert-warning">
      The inbox is showing the latest 500 messages. Resolve or archive older messages regularly.
    </div>

    <section class="row g-3 mb-4" aria-label="Message summary">
      <div v-for="card in summaryCards" :key="card.label" class="col-sm-6 col-xl-3">
        <article class="summary-card h-100">
          <span class="summary-icon" :class="card.className"><i :class="card.icon" aria-hidden="true"></i></span>
          <div><small>{{ card.label }}</small><strong>{{ card.value }}</strong><span>{{ card.help }}</span></div>
        </article>
      </div>
    </section>

    <section class="card mb-4">
      <div class="card-body">
        <div class="row g-3 align-items-end">
          <div class="col-lg-4">
            <label for="messageSearch" class="form-label">Search</label>
            <div class="input-group">
              <span class="input-group-text"><i class="fas fa-magnifying-glass"></i></span>
              <input id="messageSearch" v-model.trim="filters.search" class="form-control" placeholder="Name, email, phone, reference or message" />
            </div>
          </div>
          <div class="col-sm-4 col-lg-2">
            <label for="statusFilter" class="form-label">Status</label>
            <select id="statusFilter" v-model="filters.status" class="form-select">
              <option value="">All statuses</option>
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="col-sm-4 col-lg-2">
            <label for="priorityFilter" class="form-label">Priority</label>
            <select id="priorityFilter" v-model="filters.priority" class="form-select">
              <option value="">All priorities</option>
              <option v-for="option in priorityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="col-sm-4 col-lg-2">
            <label for="interestFilter" class="form-label">Interest</label>
            <select id="interestFilter" v-model="filters.interest" class="form-select">
              <option value="">All interests</option>
              <option v-for="option in interestOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </div>
          <div class="col-lg-2">
            <button type="button" class="btn btn-light border w-100" @click="resetFilters">
              <i class="fas fa-filter-circle-xmark me-2"></i>Reset
            </button>
          </div>
        </div>
      </div>
    </section>

    <div v-if="loading" class="card text-center py-5" role="status">
      <div class="spinner-border text-primary mx-auto"></div>
      <p class="text-muted mt-3 mb-0">Loading contact messages…</p>
    </div>

    <div v-else class="row g-4">
      <div class="col-xl-5">
        <section class="card inbox-list-card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div><h2 class="h5 mb-1">Inbox</h2><small class="text-muted">{{ filteredMessages.length }} matching message(s)</small></div>
            <span v-if="summary.new" class="badge bg-primary rounded-pill">{{ summary.new }} new</span>
          </div>

          <div v-if="filteredMessages.length" class="message-list" role="list">
            <button
              v-for="message in filteredMessages"
              :key="message.enquiryId"
              type="button"
              class="message-row"
              :class="{ active: selectedId === message.enquiryId, unread: message.status === 'new' }"
              @click="selectMessage(message.enquiryId)"
            >
              <div class="message-row__top">
                <strong>{{ message.name || 'Unnamed customer' }}</strong>
                <time>{{ relativeDate(message.createdAt) }}</time>
              </div>
              <div class="message-row__meta">
                <span :class="['status-chip', `is-${message.status}`]">{{ statusLabel(message.status) }}</span>
                <span :class="['priority-chip', `is-${message.priority}`]">{{ priorityLabel(message.priority) }}</span>
                <span>{{ interestLabel(message.interest) }}</span>
              </div>
              <p>{{ message.message }}</p>
              <small>{{ message.email }}<template v-if="message.phone"> · {{ message.phone }}</template></small>
            </button>
          </div>

          <div v-else class="enterprise-empty-state py-5">
            <div class="enterprise-empty-state__icon"><i class="fas fa-inbox"></i></div>
            <h3 class="h6">No matching messages</h3>
            <p class="text-muted mb-0">Change the filters or wait for a new customer enquiry.</p>
          </div>
        </section>
      </div>

      <div class="col-xl-7">
        <section v-if="selectedMessage" class="card message-detail-card">
          <div class="card-header detail-header">
            <div>
              <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span :class="['status-chip', `is-${selectedMessage.status}`]">{{ statusLabel(selectedMessage.status) }}</span>
                <span :class="['priority-chip', `is-${selectedMessage.priority}`]">{{ priorityLabel(selectedMessage.priority) }}</span>
              </div>
              <h2 class="h4 mb-1">{{ selectedMessage.name }}</h2>
              <p class="text-muted mb-0">{{ selectedMessage.enquiryId }} · Received {{ formatDateTime(selectedMessage.createdAt) }}</p>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <a :href="emailLink(selectedMessage.email)" class="btn btn-outline-primary">
                <i class="fas fa-envelope-open-text me-2"></i>Open email client
              </a>
              <a v-if="selectedMessage.phone" :href="phoneLink(selectedMessage.phone)" class="btn btn-outline-secondary">
                <i class="fas fa-phone me-2"></i>Call
              </a>
            </div>
          </div>

          <div class="card-body">
            <div class="row g-3 mb-4">
              <div class="col-md-6"><div class="contact-fact"><small>Email</small><strong>{{ selectedMessage.email }}</strong></div></div>
              <div class="col-md-6"><div class="contact-fact"><small>Phone</small><strong>{{ selectedMessage.phone || 'Not provided' }}</strong></div></div>
              <div class="col-md-6"><div class="contact-fact"><small>Interest</small><strong>{{ interestLabel(selectedMessage.interest) }}</strong></div></div>
              <div class="col-md-6"><div class="contact-fact"><small>Assigned to</small><strong>{{ selectedMessage.assignedTo || 'Unassigned' }}</strong></div></div>
            </div>

            <div class="message-content mb-4">
              <small>Customer message</small>
              <p>{{ selectedMessage.message }}</p>
            </div>

            <section v-if="canManageMessages" class="action-panel mb-4">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div><h3 class="h5 mb-1">Take action</h3><p class="small text-muted mb-0">Changes remain internal. No automatic customer email is sent.</p></div>
                <span class="badge bg-light text-dark">Permission: messages.manage</span>
              </div>
              <div class="row g-3">
                <div class="col-md-4">
                  <label for="messageStatus" class="form-label">Status</label>
                  <select id="messageStatus" v-model="actionForm.status" class="form-select">
                    <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label for="messagePriority" class="form-label">Priority</label>
                  <select id="messagePriority" v-model="actionForm.priority" class="form-select">
                    <option v-for="option in priorityOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label for="messageAssignee" class="form-label">Assigned to</label>
                  <input id="messageAssignee" v-model.trim="actionForm.assignedTo" class="form-control" maxlength="120" placeholder="Name or team" />
                </div>
                <div class="col-12">
                  <label for="messageInternalNote" class="form-label">Internal note</label>
                  <textarea id="messageInternalNote" v-model.trim="actionForm.internalNote" class="form-control" rows="3" maxlength="1500" placeholder="Record the call outcome, next step or resolution"></textarea>
                  <div class="form-text">This note is visible only to authorised staff.</div>
                </div>
              </div>
              <div class="d-flex flex-wrap justify-content-end gap-2 mt-3">
                <button type="button" class="btn btn-outline-secondary" :disabled="saving" @click="resetActionForm">Reset</button>
                <button type="button" class="btn btn-primary" :disabled="saving || !actionChanged" @click="saveAction">
                  <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>{{ saving ? 'Saving…' : 'Save action' }}
                </button>
              </div>
            </section>

            <section>
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="h5 mb-0">Internal activity</h3>
                <small class="text-muted">Latest actions first</small>
              </div>
              <div v-if="activityEntries.length" class="activity-list">
                <article v-for="(entry, index) in activityEntries" :key="`${entry.createdAt}-${index}`" class="activity-item">
                  <span class="activity-dot"></span>
                  <div>
                    <div class="d-flex flex-wrap justify-content-between gap-2">
                      <strong>{{ activityLabel(entry.action) }}</strong>
                      <time>{{ formatDateTime(entry.createdAt) }}</time>
                    </div>
                    <small class="text-muted">{{ entry.actorEmail || 'Website visitor' }}</small>
                    <p v-if="entry.note" class="mb-0 mt-1">{{ entry.note }}</p>
                    <small v-if="entry.fromStatus && entry.toStatus && entry.fromStatus !== entry.toStatus" class="d-block mt-1">
                      {{ statusLabel(entry.fromStatus) }} → {{ statusLabel(entry.toStatus) }}
                    </small>
                  </div>
                </article>
              </div>
              <p v-else class="text-muted mb-0">No internal activity has been recorded.</p>
            </section>
          </div>
        </section>

        <section v-else class="card enterprise-empty-state py-5">
          <div class="enterprise-empty-state__icon"><i class="fas fa-message"></i></div>
          <h2 class="h5">Select a message</h2>
          <p class="text-muted mb-0">Choose an enquiry from the inbox to review its details and take action.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';
import rbacMixin from '@/mixins/rbacMixin';
import { PERMISSIONS } from '@/constants/rbac';

const STATUS_OPTIONS = Object.freeze([
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'spam', label: 'Spam' }
]);
const PRIORITY_OPTIONS = Object.freeze([
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
]);
const INTEREST_OPTIONS = Object.freeze([
  { value: 'home-solar', label: 'Home solar installation' },
  { value: 'business-solar', label: 'Business solar installation' },
  { value: 'battery-backup', label: 'Battery backup' },
  { value: 'site-survey', label: 'Site survey' },
  { value: 'service-support', label: 'Service or support' },
  { value: 'general', label: 'General enquiry' }
]);

export default {
  name: 'MessageInbox',
  mixins: [rbacMixin],
  data() {
    return {
      messages: [],
      summary: { total: 0, new: 0, in_progress: 0, contacted: 0, resolved: 0, spam: 0, urgent: 0 },
      filters: { search: '', status: '', priority: '', interest: '' },
      selectedId: '',
      actionForm: { status: 'new', priority: 'normal', assignedTo: '', internalNote: '' },
      statusOptions: STATUS_OPTIONS,
      priorityOptions: PRIORITY_OPTIONS,
      interestOptions: INTEREST_OPTIONS,
      loading: false,
      saving: false,
      truncated: false,
      error: '',
      successMessage: ''
    };
  },
  computed: {
    canManageMessages() {
      return this.can(PERMISSIONS.MESSAGES_MANAGE);
    },
    filteredMessages() {
      const search = this.filters.search.toLowerCase();
      return this.messages.filter(message => {
        if (this.filters.status && message.status !== this.filters.status) return false;
        if (this.filters.priority && message.priority !== this.filters.priority) return false;
        if (this.filters.interest && message.interest !== this.filters.interest) return false;
        if (!search) return true;
        return [message.enquiryId, message.name, message.email, message.phone, message.message]
          .some(value => String(value || '').toLowerCase().includes(search));
      });
    },
    selectedMessage() {
      return this.messages.find(message => message.enquiryId === this.selectedId) || null;
    },
    summaryCards() {
      return [
        { label: 'New', value: this.summary.new || 0, help: 'Awaiting first review', icon: 'fas fa-envelope', className: 'is-blue' },
        { label: 'In progress', value: this.summary.in_progress || 0, help: 'Currently being handled', icon: 'fas fa-spinner', className: 'is-amber' },
        { label: 'Urgent', value: this.summary.urgent || 0, help: 'Requires priority action', icon: 'fas fa-bolt', className: 'is-red' },
        { label: 'Resolved', value: this.summary.resolved || 0, help: 'Completed enquiries', icon: 'fas fa-circle-check', className: 'is-green' }
      ];
    },
    actionChanged() {
      if (!this.selectedMessage) return false;
      return this.actionForm.status !== this.selectedMessage.status
        || this.actionForm.priority !== this.selectedMessage.priority
        || this.actionForm.assignedTo !== (this.selectedMessage.assignedTo || '')
        || Boolean(this.actionForm.internalNote);
    },
    activityEntries() {
      if (!this.selectedMessage) return [];
      return [...(this.selectedMessage.activityHistory || [])]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  },
  created() {
    this.loadMessages();
  },
  methods: {
    async loadMessages(preserveSelection = true) {
      const previousSelection = preserveSelection ? this.selectedId : '';
      this.loading = true;
      this.error = '';
      try {
        const result = await authenticatedJsonRequest('/.netlify/functions/listEnquiries', { method: 'GET' });
        this.messages = Array.isArray(result.messages) ? result.messages : [];
        this.summary = result.summary || this.summary;
        this.truncated = Boolean(result.truncated);
        const preferred = this.messages.find(message => message.enquiryId === previousSelection)?.enquiryId;
        this.selectMessage(preferred || this.filteredMessages[0]?.enquiryId || this.messages[0]?.enquiryId || '');
      } catch (error) {
        this.error = error.message || 'Unable to load contact messages.';
      } finally {
        this.loading = false;
      }
    },
    selectMessage(enquiryId) {
      this.selectedId = enquiryId || '';
      this.resetActionForm();
    },
    resetActionForm() {
      const message = this.selectedMessage;
      this.actionForm = {
        status: message?.status || 'new',
        priority: message?.priority || 'normal',
        assignedTo: message?.assignedTo || '',
        internalNote: ''
      };
    },
    resetFilters() {
      this.filters = { search: '', status: '', priority: '', interest: '' };
    },
    async saveAction() {
      if (!this.selectedMessage || !this.canManageMessages) return;
      this.saving = true;
      this.error = '';
      try {
        const result = await authenticatedJsonRequest('/.netlify/functions/updateEnquiry', {
          method: 'PUT',
          body: JSON.stringify({
            enquiryId: this.selectedMessage.enquiryId,
            ...this.actionForm
          })
        });
        this.successMessage = result.notice || 'Contact message updated.';
        window.setTimeout(() => { this.successMessage = ''; }, 4000);
        await this.loadMessages(true);
      } catch (error) {
        this.error = error.message || 'Unable to update the contact message.';
      } finally {
        this.saving = false;
      }
    },
    statusLabel(value) {
      return STATUS_OPTIONS.find(option => option.value === value)?.label || value || 'Unknown';
    },
    priorityLabel(value) {
      return PRIORITY_OPTIONS.find(option => option.value === value)?.label || value || 'Normal';
    },
    interestLabel(value) {
      return INTEREST_OPTIONS.find(option => option.value === value)?.label || 'General enquiry';
    },
    activityLabel(value) {
      return { submitted: 'Enquiry submitted', note_added: 'Internal note added', message_updated: 'Enquiry updated' }[value] || 'Activity recorded';
    },
    formatDateTime(value) {
      if (!value) return 'Pending';
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? 'Unknown'
        : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    },
    relativeDate(value) {
      if (!value) return 'Pending';
      const date = new Date(value);
      const difference = Date.now() - date.getTime();
      if (Number.isNaN(difference)) return 'Unknown';
      const minutes = Math.floor(difference / 60000);
      if (minutes < 1) return 'Now';
      if (minutes < 60) return `${minutes}m`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days}d`;
      return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(date);
    },
    emailLink(email) {
      return `mailto:${encodeURIComponent(email || '')}`;
    },
    phoneLink(phone) {
      return `tel:${String(phone || '').replace(/[^+\d]/g, '')}`;
    }
  }
};
</script>

<style scoped>
.message-inbox { max-width: 1600px; }
.inbox-header { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; padding:1.4rem; border:1px solid var(--ant-slate-200); border-radius:16px; background:linear-gradient(135deg,#fff,#f8fafc); }
.eyebrow { display:block; margin-bottom:.3rem; color:var(--ant-blue-700); font-size:.75rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
.summary-card { display:flex; align-items:center; gap:1rem; padding:1.1rem; border:1px solid var(--ant-slate-200); border-radius:14px; background:#fff; box-shadow:0 2px 8px rgba(15,23,42,.05); }
.summary-card div { display:flex; flex-direction:column; }.summary-card small,.summary-card span { color:var(--ant-slate-500); }.summary-card strong { color:var(--ant-slate-900); font-size:1.55rem; }
.summary-icon { display:grid; place-items:center; width:46px; height:46px; border-radius:12px; }.summary-icon.is-blue{background:#dbeafe;color:#1d4ed8}.summary-icon.is-amber{background:#fef3c7;color:#92400e}.summary-icon.is-red{background:#fee2e2;color:#b91c1c}.summary-icon.is-green{background:#dcfce7;color:#166534}
.inbox-list-card,.message-detail-card { min-height:620px; overflow:hidden; }
.message-list { max-height:720px; overflow:auto; }
.message-row { width:100%; padding:1rem 1.1rem; border:0; border-bottom:1px solid var(--ant-slate-100); background:#fff; text-align:left; transition:.18s ease; }
.message-row:hover { background:var(--ant-slate-50); }.message-row.active { background:#eff6ff; box-shadow:inset 4px 0 var(--ant-blue-700); }.message-row.unread strong::after { display:inline-block; width:7px; height:7px; margin-left:.45rem; border-radius:50%; background:var(--ant-blue-600); content:''; }
.message-row__top { display:flex; justify-content:space-between; gap:1rem; }.message-row__top time,.message-row small { color:var(--ant-slate-500); font-size:.78rem; }.message-row__meta { display:flex; flex-wrap:wrap; align-items:center; gap:.4rem; margin:.45rem 0; color:var(--ant-slate-500); font-size:.72rem; }.message-row p { display:-webkit-box; margin:0 0 .4rem; overflow:hidden; color:var(--ant-slate-700); -webkit-box-orient:vertical; -webkit-line-clamp:2; }
.status-chip,.priority-chip { display:inline-flex; align-items:center; padding:.25rem .55rem; border-radius:999px; font-size:.68rem; font-weight:800; text-transform:uppercase; }
.status-chip.is-new{background:#dbeafe;color:#1d4ed8}.status-chip.is-in_progress{background:#fef3c7;color:#92400e}.status-chip.is-contacted{background:#e0e7ff;color:#4338ca}.status-chip.is-resolved{background:#dcfce7;color:#166534}.status-chip.is-spam{background:#e2e8f0;color:#475569}
.priority-chip.is-low{background:#f1f5f9;color:#475569}.priority-chip.is-normal{background:#e0f2fe;color:#0369a1}.priority-chip.is-high{background:#ffedd5;color:#9a3412}.priority-chip.is-urgent{background:#fee2e2;color:#b91c1c}
.detail-header { display:flex; flex-wrap:wrap; justify-content:space-between; align-items:flex-start; gap:1rem; padding:1.25rem; }
.contact-fact { height:100%; padding:.9rem; border:1px solid var(--ant-slate-200); border-radius:10px; background:var(--ant-slate-50); }.contact-fact small,.contact-fact strong { display:block; }.contact-fact small { color:var(--ant-slate-500); }.contact-fact strong { margin-top:.2rem; overflow-wrap:anywhere; }
.message-content { padding:1.1rem; border-left:4px solid var(--ant-blue-600); border-radius:0 12px 12px 0; background:var(--ant-slate-50); }.message-content small { color:var(--ant-slate-500); font-weight:700; text-transform:uppercase; }.message-content p { margin:.55rem 0 0; white-space:pre-wrap; }
.action-panel { padding:1.1rem; border:1px solid #bfdbfe; border-radius:14px; background:#f8fbff; }
.activity-list { display:grid; gap:.7rem; }.activity-item { position:relative; display:grid; grid-template-columns:18px 1fr; gap:.7rem; }.activity-item:not(:last-child)::before { position:absolute; top:18px; bottom:-.8rem; left:5px; width:2px; background:var(--ant-slate-200); content:''; }.activity-dot { z-index:1; width:12px; height:12px; margin-top:5px; border:3px solid #bfdbfe; border-radius:50%; background:var(--ant-blue-600); }.activity-item time { color:var(--ant-slate-500); font-size:.75rem; }
@media (max-width:767.98px){.inbox-header{align-items:flex-start;flex-direction:column}.detail-header{align-items:stretch}.detail-header .btn{width:100%}.inbox-list-card,.message-detail-card{min-height:auto}.message-list{max-height:520px}}
</style>
