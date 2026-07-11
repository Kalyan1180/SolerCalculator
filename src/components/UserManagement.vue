<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <h2 class="mb-1">Users, Roles & Sessions</h2>
        <p class="text-muted mb-0">Assign least-privilege roles and revoke compromised sessions.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadUsers">
        <i class="fas fa-sync-alt me-1"></i> Refresh
      </button>
    </div>

    <div v-if="!accessLoading && !canAdministerUsers" class="alert alert-info">
      Read-only access: your role can review user assignments but cannot change roles or revoke sessions.
    </div>
    <div class="alert alert-secondary">
      <strong>Safety controls:</strong> users cannot remove their own administrator access, the last administrator cannot be demoted, and every role or session change is written to the audit log.
    </div>
    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success">{{ successMessage }}</div>
    <div v-if="truncated" class="alert alert-warning">Only the first 1,000 Firebase users are shown.</div>

    <div class="row g-3 mb-4">
      <div v-for="role in roleOptions" :key="role.value" class="col-md-6 col-xl-4">
        <div class="role-card h-100 p-3">
          <div class="d-flex justify-content-between gap-2">
            <strong>{{ role.label }}</strong>
            <code>{{ role.value }}</code>
          </div>
          <p class="small text-muted mb-2">{{ role.description }}</p>
          <small>{{ permissionSummary(role) }}</small>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div></div>

    <div v-else class="card">
      <div class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>User</th><th>UID</th><th>Verified</th><th>Last Sign-in</th><th>Role</th>
              <th v-if="canAdministerUsers">Security Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.uid">
              <td>
                <strong>{{ user.displayName || 'Unnamed user' }}</strong>
                <span v-if="user.uid === currentUid" class="badge bg-info text-dark ms-1">You</span><br />
                <small>{{ user.email || 'No email' }}</small>
              </td>
              <td><code>{{ user.uid }}</code></td>
              <td><span class="badge" :class="user.emailVerified ? 'bg-success' : 'bg-secondary'">{{ user.emailVerified ? 'Yes' : 'No' }}</span></td>
              <td>{{ formatDate(user.lastSignInAt) }}</td>
              <td>
                <select v-model="user.role" class="form-select form-select-sm" :disabled="!canManageRoles || busyUid === user.uid || user.disabled">
                  <option v-for="role in roleOptions" :key="role.value" :value="role.value">{{ role.label }}</option>
                </select>
                <small class="text-muted">{{ roleDescriptionFor(user.role) }}</small>
              </td>
              <td v-if="canAdministerUsers" class="security-actions">
                <div class="d-flex flex-wrap gap-2">
                  <button
                    v-if="canManageRoles"
                    class="btn btn-sm btn-primary"
                    :disabled="busyUid === user.uid || user.disabled || user.role === user.originalRole"
                    @click="saveRole(user)"
                  >
                    {{ busyUid === user.uid && busyOperation === 'role' ? 'Saving...' : 'Save Role' }}
                  </button>
                  <button
                    v-if="canRevokeSessions"
                    class="btn btn-sm btn-outline-danger"
                    :disabled="busyUid === user.uid || user.disabled"
                    @click="revokeSessions(user)"
                  >
                    {{ busyUid === user.uid && busyOperation === 'revoke' ? 'Revoking...' : 'Revoke Sessions' }}
                  </button>
                </div>
                <small v-if="user.sessionsRevokedAt" class="d-block text-muted mt-2">
                  Last revoked: {{ formatDate(user.sessionsRevokedAt) }}
                </small>
              </td>
            </tr>
            <tr v-if="!users.length">
              <td :colspan="canAdministerUsers ? 6 : 5" class="text-center text-muted py-4">No users found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { auth } from '@/firebase';
import { authenticatedJsonRequest } from '@/utils/authenticatedRequest';
import { endSession } from '@/utils/sessionManager';
import rbacMixin from '@/mixins/rbacMixin';
import {
  PERMISSIONS,
  ROLE_OPTIONS,
  roleDescription
} from '@/constants/rbac';

export default {
  name: 'UserManagement',
  mixins: [rbacMixin],
  data() {
    return {
      users: [],
      loading: false,
      busyUid: '',
      busyOperation: '',
      error: '',
      successMessage: '',
      truncated: false,
      roleOptions: ROLE_OPTIONS
    };
  },
  computed: {
    canManageRoles() {
      return this.can(PERMISSIONS.USERS_ROLES_WRITE);
    },
    canRevokeSessions() {
      return this.can(PERMISSIONS.USERS_SESSIONS_REVOKE);
    },
    canAdministerUsers() {
      return this.canManageRoles || this.canRevokeSessions;
    },
    currentUid() {
      return auth.currentUser?.uid || '';
    }
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
        this.users = Array.isArray(result.users)
          ? result.users.map(user => ({ ...user, originalRole: user.role }))
          : [];
        this.truncated = Boolean(result.truncated);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },
    async saveRole(user) {
      if (!this.canManageRoles) {
        this.error = 'Your role does not allow role assignment changes.';
        return;
      }

      const selectedRole = this.roleOptions.find(role => role.value === user.role);
      if (!selectedRole) {
        this.error = 'Select a supported role.';
        return;
      }
      if (!window.confirm(`Assign ${selectedRole.label} to ${user.email || user.uid}?`)) {
        user.role = user.originalRole;
        return;
      }

      this.busyUid = user.uid;
      this.busyOperation = 'role';
      this.error = '';
      try {
        const result = await authenticatedJsonRequest('/.netlify/functions/updateUserRole', {
          method: 'PUT',
          body: JSON.stringify({ uid: user.uid, role: user.role })
        });
        user.originalRole = user.role;
        this.showSuccess(result.message || 'Role updated.');
      } catch (error) {
        this.error = error.message;
        await this.loadUsers();
      } finally {
        this.busyUid = '';
        this.busyOperation = '';
      }
    },
    async revokeSessions(user) {
      if (!this.canRevokeSessions) {
        this.error = 'Your role does not allow session revocation.';
        return;
      }

      const target = user.email || user.uid;
      const selfMessage = user.uid === this.currentUid
        ? ' This includes your current session and you will be signed out.'
        : '';
      if (!window.confirm(`Revoke every active session for ${target}?${selfMessage}`)) return;

      this.busyUid = user.uid;
      this.busyOperation = 'revoke';
      this.error = '';
      try {
        const result = await authenticatedJsonRequest('/.netlify/functions/revokeUserSessions', {
          method: 'POST',
          body: JSON.stringify({ uid: user.uid })
        });

        if (user.uid === this.currentUid) {
          await endSession('SESSION_REVOKED', { redirectToLogin: true });
          return;
        }

        user.sessionsRevokedAt = new Date().toISOString();
        this.showSuccess(result.warning ? `${result.message} ${result.warning}` : result.message);
      } catch (error) {
        this.error = error.message;
      } finally {
        this.busyUid = '';
        this.busyOperation = '';
      }
    },
    showSuccess(message) {
      this.successMessage = message;
      window.setTimeout(() => { this.successMessage = ''; }, 5000);
    },
    roleDescriptionFor(role) {
      return roleDescription(role);
    },
    permissionSummary(role) {
      if (role.permissions.includes('*')) return 'All permissions';
      if (!role.permissions.length) return 'No administration permissions';
      return `${role.permissions.length} assigned permission${role.permissions.length === 1 ? '' : 's'}`;
    },
    formatDate(value) {
      if (!value) return 'Never';
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? 'Unknown'
        : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    }
  }
};
</script>

<style scoped>
.card, .role-card { border: 0; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08); }
.role-card { border-radius: 10px; background: #fff; }
.security-actions { min-width: 230px; }
code { font-size: 0.75rem; word-break: break-all; }
</style>
