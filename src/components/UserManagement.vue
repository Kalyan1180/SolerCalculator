<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <h2 class="mb-1">User Management</h2>
        <p class="text-muted mb-0">Review registered accounts and manage administrator access.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadUsers">
        <i class="fas fa-sync-alt me-1"></i> Refresh
      </button>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>
    <div v-if="truncated" class="alert alert-warning">Only the first 1,000 Firebase users are shown.</div>

    <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div></div>

    <div v-else class="card">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr><th>User</th><th>UID</th><th>Verified</th><th>Last Sign-in</th><th>Role</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.uid">
              <td>
                <strong>{{ user.displayName || 'Unnamed user' }}</strong><br />
                <small>{{ user.email || 'No email' }}</small>
              </td>
              <td><code>{{ user.uid }}</code></td>
              <td><span class="badge" :class="user.emailVerified ? 'bg-success' : 'bg-secondary'">{{ user.emailVerified ? 'Yes' : 'No' }}</span></td>
              <td>{{ formatDate(user.lastSignInAt) }}</td>
              <td>
                <select v-model="user.role" class="form-select form-select-sm" :disabled="busyUid === user.uid || user.disabled">
                  <option value="customer">Customer</option>
                  <option value="admin">Administrator</option>
                </select>
              </td>
              <td>
                <button class="btn btn-sm btn-primary" :disabled="busyUid === user.uid || user.disabled" @click="saveRole(user)">
                  {{ busyUid === user.uid ? 'Saving...' : 'Save' }}
                </button>
              </td>
            </tr>
            <tr v-if="!users.length"><td colspan="6" class="text-center text-muted py-4">No users found.</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';

export default {
  name: 'UserManagement',
  data() {
    return {
      users: [],
      loading: false,
      busyUid: '',
      error: '',
      successMessage: '',
      truncated: false
    };
  },
  created() {
    this.loadUsers();
  },
  methods: {
    async loadUsers() {
      this.loading = true;
      this.error = '';
      try {
        const result = await authenticatedJsonRequest('/.netlify/functions/listUsers', { method: 'GET' });
        this.users = Array.isArray(result.users) ? result.users : [];
        this.truncated = Boolean(result.truncated);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    async saveRole(user) {
      this.busyUid = user.uid;
      this.error = '';
      try {
        const result = await authenticatedJsonRequest('/.netlify/functions/updateUserRole', {
          method: 'PUT',
          body: JSON.stringify({ uid: user.uid, role: user.role })
        });
        this.successMessage = result.message || 'Role updated.';
        window.setTimeout(() => { this.successMessage = ''; }, 3000);
      } catch (error) {
        this.error = error.message;
        await this.loadUsers();
      } finally {
        this.busyUid = '';
      }
    },
    formatDate(value) {
      if (!value) return 'Never';
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'Unknown' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
  }
};
</script>

<style scoped>
.card { border: 0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); }
code { font-size: 0.75rem; word-break: break-all; }
</style>
