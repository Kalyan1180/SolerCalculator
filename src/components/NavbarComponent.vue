<template>
  <nav class="navbar navbar-expand-lg public-navbar">
    <div class="container-xl">
      <router-link class="navbar-brand" to="/">
        <img src="@/assets/logo.png" alt="ANT Solar logo" />
        <span>ANT Solar</span>
      </router-link>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#publicNavigation"
        aria-controls="publicNavigation"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="publicNavigation">
        <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1">
          <li class="nav-item"><router-link class="nav-link" to="/">Home</router-link></li>
          <li class="nav-item"><router-link class="nav-link" to="/solercalc">Solar Calculator</router-link></li>
          <li class="nav-item"><router-link class="nav-link" to="/about">About</router-link></li>
          <li class="nav-item"><router-link class="nav-link" to="/contact">Contact</router-link></li>

          <template v-if="!currentUser">
            <li class="nav-item ms-lg-2"><router-link class="btn btn-outline-primary w-100" to="/login">Sign in</router-link></li>
            <li class="nav-item"><router-link class="btn btn-primary w-100" to="/signup">Create account</router-link></li>
          </template>

          <li v-else class="nav-item dropdown ms-lg-2">
            <button
              class="nav-link dropdown-toggle public-account-button"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <img
                v-if="currentUser.photoURL"
                :src="currentUser.photoURL"
                alt="Profile"
                referrerpolicy="no-referrer"
              />
              <span v-else class="admin-avatar admin-avatar--small">{{ userInitials }}</span>
              <span class="text-start">
                <span class="d-block fw-semibold lh-sm">{{ userDisplayName }}</span>
                <small class="text-muted">{{ userAccess.roleLabel }}</small>
              </span>
            </button>

            <ul class="dropdown-menu dropdown-menu-end enterprise-dropdown">
              <li class="px-3 pt-2 pb-1">
                <small class="text-uppercase text-muted fw-semibold">Account</small>
                <div class="fw-semibold text-break">{{ currentUser.email || userDisplayName }}</div>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <router-link class="dropdown-item" to="/customer/my-projects">
                  <i class="fas fa-folder-open me-2" aria-hidden="true"></i>My Projects
                </router-link>
              </li>
              <li v-if="canOpenDashboard">
                <router-link class="dropdown-item" to="/admin">
                  <i class="fas fa-gauge-high me-2" aria-hidden="true"></i>Administration
                </router-link>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <button class="dropdown-item text-danger" type="button" :disabled="signingOut" @click="signOutUser">
                  <i class="fas fa-right-from-bracket me-2" aria-hidden="true"></i>
                  {{ signingOut ? 'Signing out...' : 'Sign out' }}
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script>
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import {
  customerAccess,
  getUserAccess,
  hasPermission
} from '@/utils/accessControl';
import { PERMISSIONS } from '@/constants/rbac';
import { endSession } from '@/utils/sessionManager';

export default {
  name: 'NavbarComponent',
  data() {
    return {
      currentUser: null,
      userAccess: customerAccess(),
      unsubscribeAuth: null,
      signingOut: false
    };
  },
  computed: {
    canOpenDashboard() {
      return hasPermission(this.userAccess, PERMISSIONS.DASHBOARD_ACCESS);
    },
    userDisplayName() {
      return this.currentUser?.displayName || this.currentUser?.email?.split('@')[0] || 'Account';
    },
    userInitials() {
      const source = this.userDisplayName.trim();
      return source.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AS';
    }
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async user => {
      this.currentUser = user;
      if (!user) {
        this.userAccess = customerAccess();
        return;
      }

      try {
        this.userAccess = await getUserAccess(user.uid, { force: true });
      } catch (error) {
        console.error('Unable to load navigation access:', error);
        this.userAccess = customerAccess(user.uid);
      }
    });
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
  },
  methods: {
    async signOutUser() {
      this.signingOut = true;
      try {
        await endSession('manual', { redirect: '/' });
      } catch (error) {
        console.error('Sign-out error:', error);
      } finally {
        this.signingOut = false;
      }
    }
  }
};
</script>
