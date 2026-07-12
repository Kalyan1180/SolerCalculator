<template>
  <div class="container-fluid py-4">
    <div class="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4">
      <div>
        <h2 class="h4 mb-1">Identity and access</h2>
        <p class="text-muted mb-0">Assign least-privilege roles and respond to compromised sessions.</p>
      </div>
      <button class="btn btn-outline-secondary" :disabled="loading" @click="loadUsers">
        <i class="fas fa-rotate me-2" :class="{ 'fa-spin': loading }" aria-hidden="true"></i>Refresh
      </button>
    </div>

    <div class="security-notice mb-4">
      <span class="security-notice__icon"><i class="fas fa-shield-halved" aria-hidden="true"></i></span>
      <div>
        <strong>Built-in safeguards</strong>
        <p class="mb-0">Self-demotion and removal of the final administrator are blocked. Role and session changes are written to the security audit log.</p>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger"><i class="fas fa-circle-exclamation me-2"></i>{{ error }}</div>
    <div v-if="successMessage" class="alert alert-success"><i class="fas fa-circle-check me-2"></i>{{ successMessage }}</div>
    <div v-if="truncated" class="alert alert-warning">Only the first 1,000 Firebase users are shown.</div>

    <div class="row g-3 mb-4">
      <div v-for="metric in userMetrics" :key="metric.label" class="col-6 col-xl-3">
        <article class="user-metric card h-100">
          <div class="card-body">
            <span class="user-metric__icon" :class="metric.className"><i :class="metric.icon" aria-hidden="true"></i></span>
            <div><small>{{ metric.label }}</small><strong>{{ metric.value }}</strong></div>
          </div>
        </article>
      </div>
    </div>

    <section class="card mb-4">
      <div class="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div>
          <h3 class="h5 mb-1">Role catalogue</h3>
          <p class="small text-muted mb-0">Use the narrowest role that supports the person’s responsibilities.</p>
        </div>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="showRoleCatalogue = !showRoleCatalogue">
          <i :class="showRoleCatalogue ? 'fas fa-chevron-up' : 'fas fa-chevron-down'" class="me-2"></i>{{ showRoleCatalogue ? 'Hide' : 'Show' }} roles
        </button>
      </div>
      <div v-if="showRoleCatalogue" class="card-body">
        <div class="row g-3">
          <div v-for="role in roleOptions" :key="role.value" class="col-md-6 col-xl-4">
            <article class="role-card h-100">
              <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
                <div>
                  <strong>{{ role.label }}</strong>
                  <code>{{ role.value }}</code>
                </div>
                <span class="permission-count">{{ role.permissions.includes('*') ? 'Full' : role.permissions.length }}</span>
              </div>
              <p class="small text-muted mb-2">{{ role.description }}</p>
              <small class="fw-semibold">{{ permissionSummary(role) }}</small>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-header">
        <div class="row g-3 align-items-end">
          <div class="col-lg-6">
            <label for="userSearch" class="form-label">Search users</label>
            <div class="input-group">
              <span class="input-group-text bg-white"><i class="fas fa-magnifying-glass text-muted"></i></span>
              <input id="userSearch" v-model.trim="searchQuery" type="search" class="form-control" placeholder="Name, email or UID" />
            </div>
          </div>
          <div class="col-sm-6 col-lg-3">
            <label for="userRoleFilter" class="form-label">Role</label>
            <select id="userRoleFilter" v-model="roleFilter" class="form-select">
              <option value="all">All roles</option>
              <option v-for="role in roleOptions" :key="role.value" :value="role.value">{{ role.label }}</option>
            </select>
          </div>
          <div class="col-sm-6 col-lg-3">
            <label for="userStateFilter" class="form-label">Account state</label>
            <select id="userStateFilter" v-model="stateFilter" class="form-select">
              <option value="all">All accounts</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="unverified">Email unverified</option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loading" class="text-center my-5" role="status"><div class="spinner-border text-primary"></div><p class="mt-3 text-muted">Loading users…</p></div>

      <div v-else class="table-responsive">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>User</th><th>Verification</th><th>Last sign-in</th><th>Assigned role</th>
              <th v-if="canAdministerUsers">Security actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.uid">
              <td>
                <div class="user-identity">
                  <span class="user-avatar">{{ initials(user) }}</span>
                  <div class="min-w-0">
                    <strong class="d-block text-truncate">{{ user.displayName || 'Unnamed user' }} <span v-if="user.uid === currentUid" class="badge bg-info text-dark ms-1">You</span></strong>
                    <small class="d-block text-muted text-truncate">{{ user.email || 'No email' }}</small>
                    <code class="d-block text-truncate" :title="user.uid">{{ shortUid(user.uid) }}</code>
                  </div>
                </div>
              </td>
              <td>
                <span class="account-chip" :class="user.disabled ? 'is-disabled' : user.emailVerified ? 'is-verified' : 'is-unverified'">
                  <i :class="user.disabled ? 'fas fa-ban' : user.emailVerified ? 'fas fa-circle-check' : 'fas fa-clock'" aria-hidden="true"></i>
                  {{ user.disabled ? 'Disabled' : user.emailVerified ? 'Verified' : 'Unverified' }}
                </span>
              </td>
              <td><span class="text-nowrap">{{ formatDate(user.lastSignInAt) }}</span></td>
              <td class="role-cell">
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
                    <span v-if="busyUid === user.uid && busyOperation === 'role'" class="spinner-border spinner-border-sm me-1"></span>
                    {{ busyUid === user.uid && busyOperation === 'role' ? 'Saving…' : 'Save role' }}
                  </button>
                  <button
                    v-if="canRevokeSessions"
                    class="btn btn-sm btn-outline-danger"
                    :disabled="busyUid === user.uid || user.disabled"
                    @click="revokeSessions(user)"
                  >
                    <span v-if="busyUid === user.uid && busyOperation === 'revoke'" class="spinner-border spinner-border-sm me-1"></span>
                    {{ busyUid === user.uid && busyOperation === 'revoke' ? 'Revoking…' : 'Revoke sessions' }}
                  </button>
                </div>
                <small v-if="user.sessionsRevokedAt" class="d-block text-muted mt-2">Last revoked {{ formatDate(user.sessionsRevokedAt) }}</small>
              </td>
            </tr>
            <tr v-if="!filteredUsers.length">
              <td :colspan="canAdministerUsers ? 5 : 4" class="text-center py-5">
                <div class="enterprise-empty-state py-2"><div class="enterprise-empty-state__icon"><i class="fas fa-users-slash"></i></div><h3 class="h6">No matching users</h3><p class="text-muted mb-0">Change the filters or search term.</p></div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
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
      roleOptions: ROLE_OPTIONS,
      showRoleCatalogue: false,
      searchQuery: '',
      roleFilter: 'all',
      stateFilter: 'all'
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
    },
    userMetrics() {
      return [
        { label: 'Registered users', value: this.users.length, icon: 'fas fa-users', className: 'is-blue' },
        { label: 'Administrators', value: this.users.filter(user => user.role === 'admin').length, icon: 'fas fa-user-shield', className: 'is-purple' },
        { label: 'Staff accounts', value: this.users.filter(user => ['project_manager', 'inventory_manager', 'analyst'].includes(user.role)).length, icon: 'fas fa-id-badge', className: 'is-teal' },
        { label: 'Unverified', value: this.users.filter(user => !user.emailVerified).length, icon: 'fas fa-envelope-circle-check', className: 'is-amber' }
      ];
    },
    filteredUsers() {
      const query = this.searchQuery.toLowerCase();
      return this.users.filter(user => {
        const matchesRole = this.roleFilter === 'all' || user.role === this.roleFilter;
        const matchesState = this.stateFilter === 'all'
          || (this.stateFilter === 'active' && !user.disabled)
          || (this.stateFilter === 'disabled' && user.disabled)
          || (this.stateFilter === 'unverified' && !user.emailVerified);
        const matchesQuery = !query || [user.displayName, user.email, user.uid]
          .some(value => String(value || '').toLowerCase().includes(query));
        return matchesRole && matchesState && matchesQuery;
      });
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
      if (!this.canManageRoles) return;
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
      if (!this.canRevokeSessions) return;
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
    initials(user) {
      const source = String(user.displayName || user.email || 'User').trim();
      return source.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    },
    shortUid(uid) {
      const value = String(uid || '');
      return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value;
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
.security-notice { display: flex; gap: 0.85rem; padding: 1rem; border: 1px solid #b2ccff; border-radius: 12px; color: #1849a9; background: #eff4ff; }
.security-notice__icon { display: grid; place-items: center; flex: 0 0 42px; width: 42px; height: 42px; border-radius: 10px; color: #fff; background: var(--ant-blue-700); }
.security-notice p { color: #344054; font-size: 0.82rem; }
.user-metric .card-body { display: flex; align-items: center; gap: 0.85rem; }
.user-metric__icon { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 11px; }
.user-metric__icon.is-blue { color: var(--ant-blue-700); background: #eff4ff; }
.user-metric__icon.is-purple { color: #6938ef; background: #f4f3ff; }
.user-metric__icon.is-teal { color: var(--ant-teal-600); background: #f0fdfa; }
.user-metric__icon.is-amber { color: var(--ant-amber-600); background: #fffaeb; }
.user-metric small, .user-metric strong { display: block; }
.user-metric small { color: var(--ant-slate-500); }
.user-metric strong { color: var(--ant-slate-950); font-size: 1.25rem; }
.role-card { padding: 1rem; border: 1px solid var(--ant-slate-200); border-radius: 11px; background: var(--ant-slate-50); }
.role-card code { display: block; margin-top: 0.2rem; color: var(--ant-slate-500); font-size: 0.7rem; }
.permission-count { display: grid; place-items: center; min-width: 36px; height: 28px; padding: 0 0.5rem; border-radius: 999px; color: #1849a9; background: #dbeafe; font-size: 0.68rem; font-weight: 800; }
.user-identity { display: flex; align-items: center; gap: 0.7rem; min-width: 230px; }
.user-avatar { display: grid; place-items: center; flex: 0 0 40px; width: 40px; height: 40px; border-radius: 10px; color: #fff; background: linear-gradient(135deg, var(--ant-blue-700), var(--ant-teal-600)); font-size: 0.72rem; font-weight: 800; }
.user-identity code { max-width: 170px; color: var(--ant-slate-500); font-size: 0.66rem; }
.account-chip { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.34rem 0.55rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
.account-chip.is-verified { color: #067647; background: #ecfdf3; }
.account-chip.is-unverified { color: #93370d; background: #fffaeb; }
.account-chip.is-disabled { color: #b42318; background: #fef3f2; }
.role-cell { min-width: 240px; }
.role-cell small { display: block; max-width: 280px; margin-top: 0.35rem; line-height: 1.25; }
.security-actions { min-width: 245px; }
</style>
