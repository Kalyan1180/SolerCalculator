<template>
  <div class="container my-5 user-management">
    <div class="card">
      <div class="card-header bg-primary text-white">
        <h3 class="mb-0">User Role Management</h3>
      </div>
      <div class="card-body">
        <p class="text-muted">Enter the Firebase Authentication UID of an existing user.</p>

        <div v-if="message" class="alert alert-success">{{ message }}</div>
        <div v-if="error" class="alert alert-danger">{{ error }}</div>

        <form @submit.prevent="updateRole">
          <div class="mb-3">
            <label for="userUid" class="form-label">User UID</label>
            <input v-model.trim="uid" type="text" id="userUid" class="form-control" maxlength="128" required>
          </div>
          <div class="mb-3">
            <label for="role" class="form-label">Role</label>
            <select v-model="role" id="role" class="form-select">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Updating...' : 'Update Role' }}
          </button>
        </form>

        <div v-if="updatedUser" class="mt-4 border rounded p-3 bg-light">
          <p class="mb-1"><strong>Email:</strong> {{ updatedUser.email || 'N/A' }}</p>
          <p class="mb-1"><strong>Name:</strong> {{ updatedUser.displayName || 'N/A' }}</p>
          <p class="mb-0"><strong>Role:</strong> {{ updatedUser.role }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { authorizedFetch } from '@/utils/apiClient';

export default {
  name: 'UserManagement',
  data() {
    return {
      uid: '',
      role: 'user',
      loading: false,
      message: '',
      error: '',
      updatedUser: null
    };
  },
  methods: {
    async updateRole() {
      this.loading = true;
      this.message = '';
      this.error = '';
      this.updatedUser = null;
      try {
        const result = await authorizedFetch('/.netlify/functions/updateUserRole', {
          method: 'PUT',
          body: JSON.stringify({ uid: this.uid, role: this.role })
        });
        this.message = result.message;
        this.updatedUser = result.user;
      } catch (error) {
        console.error('Error updating user role:', error);
        this.error = error.message || 'Unable to update the role.';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.user-management {
  max-width: 650px;
}
.card {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
</style>
