<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Security activity</h2>
        <p class="text-muted mb-0">Review append-only role assignment and session revocation events.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadAuditLogs">
        <i class="fas fa-rotate me-2" :class="{ 'fa-spin': loading }" aria-hidden="true"></i>Refresh
      </button>
    </div>

    <div class="audit-integrity mb-4">
      <span class="audit-integrity__icon"><i class="fas fa-fingerprint" aria-hidden="true"></i></span>
      <div><strong>Append-only audit trail</strong><p class="mb-0">Browser clients cannot create, change or delete these entries. Security operations are recorded by authenticated server functions.</p></div>
    </div>

    <div v-if="error" class="alert alert-danger"><i class="fas fa-circle-exclamation me-2"></i>{{ error }}</div>

    <div class="row g-3 mb-4">
      <div v-for="metric in auditMetrics" :key="metric.label" class="col-6 col-xl-3">
        <article class="audit-metric card h-100"><div class="card-body"><span class="audit-metric__icon" :class="metric.className"><i :class="metric.icon"></i></span><div><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong></div></div></article>
      </div>
    </div>

    <section class="card">
      <div class="card-header">
        <div class="row g-3 align-items-end">
          <div class="col-lg-6">
            <label for="auditSearch" class="form-label">Search activity</label>
            <div class="input-group"><span class="input-group-text bg-white"><i class="fas fa-magnifying-glass text-muted"></i></span><input id="auditSearch" v-model.trim="searchQuery" type="search" class="form-control" placeholder="Actor, target, UID or action" /></div>
          </div>
          <div class="col-sm-6 col-lg-3">
            <label for="auditAction" class="form-label">Action</label>
            <select id="auditAction" v-model="actionFilter" class="form-select"><option value="all">All actions</option><option value="user.role.updated">Role changed</option><option value="user.sessions.revoked">Sessions revoked</option></select>
          </div>
          <div class="col-sm-6 col-lg-3">
            <label for="auditRange" class="form-label">Time range</label>
            <select id="auditRange" v-model="timeFilter" class="form-select"><option value="all">All available</option><option value="24h">Past 24 hours</option><option value="7d">Past 7 days</option><option value="30d">Past 30 days</option></select>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div><p class="mt-3 text-muted">Loading security activity…</p></div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead><tr><th>Timestamp</th><th>Actor</th><th>Target</th><th>Security change</th><th>Event</th></tr></thead>
          <tbody>
            <tr v-for="entry in filteredEntries" :key="entry.id">
              <td class="text-nowrap"><strong>{{ formatDate(entry.createdAt) }}</strong></td>
              <td><div class="audit-person"><span>{{ initials(entry.actorEmail) }}</span><div class="min-w-0"><strong class="d-block text-truncate">{{ entry.actorEmail || 'Unknown administrator' }}</strong><code class="d-block text-truncate" :title="entry.actorUid">{{ shortUid(entry.actorUid) }}</code></div></div></td>
              <td><div class="audit-person"><span>{{ initials(entry.targetEmail) }}</span><div class="min-w-0"><strong class="d-block text-truncate">{{ entry.targetEmail || 'Unknown user' }}</strong><code class="d-block text-truncate" :title="entry.targetUid">{{ shortUid(entry.targetUid) }}</code></div></div></td>
              <td>
                <template v-if="entry.action === 'user.role.updated'">
                  <div class="role-transition"><span>{{ roleLabelFor(entry.previousRole) }}</span><i class="fas fa-arrow-right"></i><strong>{{ roleLabelFor(entry.newRole) }}</strong></div>
                </template>
                <span v-else-if="entry.action === 'user.sessions.revoked'" class="event-chip is-danger"><i class="fas fa-user-lock me-1"></i>All sessions revoked</span>
                <span v-else class="text-muted">No display details</span>
              </td>
              <td><span class="event-chip" :class="eventClass(entry.action)">{{ actionLabel(entry.action) }}</span></td>
            </tr>
            <tr v-if="!filteredEntries.length"><td colspan="5" class="text-center py-5"><div class="enterprise-empty-state py-2"><div class="enterprise-empty-state__icon"><i class="fas fa-shield"></i></div><h3 class="h6">No matching audit events</h3><p class="text-muted mb-0">Change the filters or wait for a new security operation.</p></div></td></tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from 'firebase/firestore';
import { db } from '@/firebase';
import { roleLabel } from '@/constants/rbac';

export default {
  name: 'AuditLog',
  data() {
    return {
      entries: [],
      loading: false,
      error: '',
      searchQuery: '',
      actionFilter: 'all',
      timeFilter: 'all'
    };
  },
  computed: {
    auditMetrics() {
      const today = this.entries.filter(entry => this.entryDate(entry)?.toDateString() === new Date().toDateString()).length;
      return [
        { label: 'Available events', value: this.entries.length, icon: 'fas fa-list-check', className: 'is-blue' },
        { label: 'Role changes', value: this.entries.filter(entry => entry.action === 'user.role.updated').length, icon: 'fas fa-user-gear', className: 'is-purple' },
        { label: 'Session revocations', value: this.entries.filter(entry => entry.action === 'user.sessions.revoked').length, icon: 'fas fa-user-lock', className: 'is-red' },
        { label: 'Events today', value: today, icon: 'fas fa-calendar-day', className: 'is-teal' }
      ];
    },
    filteredEntries() {
      const queryValue = this.searchQuery.toLowerCase();
      const cutoff = this.timeCutoff();
      return this.entries.filter(entry => {
        const matchesAction = this.actionFilter === 'all' || entry.action === this.actionFilter;
        const date = this.entryDate(entry);
        const matchesTime = !cutoff || (date && date >= cutoff);
        const matchesSearch = !queryValue || [entry.actorEmail, entry.actorUid, entry.targetEmail, entry.targetUid, entry.action, entry.previousRole, entry.newRole]
          .some(value => String(value || '').toLowerCase().includes(queryValue));
        return matchesAction && matchesTime && matchesSearch;
      });
    }
  },
  created() {
    this.loadAuditLogs();
  },
  methods: {
    async loadAuditLogs() {
      this.loading = true;
      this.error = '';
      try {
        const snapshot = await getDocs(query(
          collection(db, 'auditLogs'),
          orderBy('createdAt', 'desc'),
          limit(250)
        ));
        this.entries = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
      } catch (error) {
        console.error('Unable to load audit log:', error);
        this.error = error.message || 'Unable to load the audit log.';
      } finally {
        this.loading = false;
      }
    },
    entryDate(entry) {
      const value = entry?.createdAt;
      if (!value) return null;
      const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    },
    timeCutoff() {
      const durations = { '24h': 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000, '30d': 30 * 24 * 60 * 60 * 1000 };
      return durations[this.timeFilter] ? new Date(Date.now() - durations[this.timeFilter]) : null;
    },
    roleLabelFor(role) {
      return roleLabel(role);
    },
    actionLabel(action) {
      return { 'user.role.updated': 'Role updated', 'user.sessions.revoked': 'Sessions revoked' }[action] || action || 'Unknown event';
    },
    eventClass(action) {
      return action === 'user.sessions.revoked' ? 'is-danger' : 'is-info';
    },
    initials(email) {
      const source = String(email || 'Unknown').split('@')[0].replace(/[._-]+/g, ' ').trim();
      return source.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
    },
    shortUid(uid) {
      const value = String(uid || 'N/A');
      return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value;
    },
    formatDate(value) {
      if (!value) return 'Pending timestamp';
      const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
      return Number.isNaN(date.getTime())
        ? 'Unknown'
        : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
  }
};
</script>

<style scoped>
.audit-integrity { display: flex; gap: 0.85rem; padding: 1rem; border: 1px solid #b2ccff; border-radius: 12px; color: #1849a9; background: #eff4ff; }
.audit-integrity__icon { display: grid; place-items: center; flex: 0 0 42px; width: 42px; height: 42px; border-radius: 10px; color: #fff; background: var(--ant-blue-700); }
.audit-integrity p { color: var(--ant-slate-700); font-size: 0.82rem; }
.audit-metric .card-body { display: flex; align-items: center; gap: 0.85rem; }
.audit-metric__icon { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 11px; }
.audit-metric__icon.is-blue { color: var(--ant-blue-700); background: #eff4ff; }
.audit-metric__icon.is-purple { color: #6938ef; background: #f4f3ff; }
.audit-metric__icon.is-red { color: var(--ant-red-600); background: #fef3f2; }
.audit-metric__icon.is-teal { color: var(--ant-teal-600); background: #f0fdfa; }
.audit-metric small, .audit-metric strong { display: block; }
.audit-metric small { color: var(--ant-slate-500); }
.audit-metric strong { font-size: 1.2rem; }
.audit-person { display: flex; align-items: center; gap: 0.65rem; min-width: 210px; }
.audit-person > span { display: grid; place-items: center; flex: 0 0 36px; width: 36px; height: 36px; border-radius: 9px; color: #fff; background: linear-gradient(135deg, var(--ant-blue-700), var(--ant-teal-600)); font-size: 0.68rem; font-weight: 800; }
.audit-person code { max-width: 165px; color: var(--ant-slate-500); font-size: 0.65rem; }
.role-transition { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.6rem; border-radius: 9px; background: var(--ant-slate-100); font-size: 0.75rem; }
.role-transition i { color: var(--ant-slate-400); }
.event-chip { display: inline-flex; align-items: center; padding: 0.36rem 0.56rem; border-radius: 999px; font-size: 0.68rem; font-weight: 750; }
.event-chip.is-info { color: #1849a9; background: #eff4ff; }
.event-chip.is-danger { color: #b42318; background: #fef3f2; }
</style>
