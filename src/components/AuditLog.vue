<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <h2 class="mb-1">Security Audit Log</h2>
        <p class="text-muted mb-0">Review administrator role and session-security activity.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadAuditLogs">
        <i class="fas fa-sync-alt me-1"></i> Refresh
      </button>
    </div>

    <div class="alert alert-secondary">
      Audit entries are append-only from the application. Browser clients cannot create, edit or delete them.
    </div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div></div>

    <div v-else class="card">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr><th>Time</th><th>Actor</th><th>Target</th><th>Security Change</th><th>Action</th></tr>
          </thead>
          <tbody>
            <tr v-for="entry in entries" :key="entry.id">
              <td class="text-nowrap">{{ formatDate(entry.createdAt) }}</td>
              <td>
                <strong>{{ entry.actorEmail || 'Unknown administrator' }}</strong><br />
                <small><code>{{ entry.actorUid || 'N/A' }}</code></small>
              </td>
              <td>
                <strong>{{ entry.targetEmail || 'Unknown user' }}</strong><br />
                <small><code>{{ entry.targetUid || 'N/A' }}</code></small>
              </td>
              <td>
                <template v-if="entry.action === 'user.role.updated'">
                  <span class="badge bg-secondary">{{ roleLabelFor(entry.previousRole) }}</span>
                  <i class="fas fa-arrow-right mx-2 text-muted" aria-hidden="true"></i>
                  <span class="badge bg-primary">{{ roleLabelFor(entry.newRole) }}</span>
                </template>
                <span v-else-if="entry.action === 'user.sessions.revoked'" class="badge bg-danger">
                  All active sessions revoked
                </span>
                <span v-else class="text-muted">No display details</span>
              </td>
              <td><code>{{ entry.action || 'unknown' }}</code></td>
            </tr>
            <tr v-if="!entries.length">
              <td colspan="5" class="text-center text-muted py-4">No security audit entries are available.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
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
      error: ''
    };
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
    roleLabelFor(role) {
      return roleLabel(role);
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
.card { border: 0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); }
code { font-size: 0.75rem; word-break: break-all; }
</style>
