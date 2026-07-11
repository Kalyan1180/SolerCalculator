<template>
  <nav class="navbar navbar-expand-lg navbar-light bg-light border-bottom">
    <div class="container">
      <router-link class="navbar-brand" to="/">
        <img src="@/assets/logo.png" alt="ANT Solar logo" class="logo" />
        ANT Solar
      </router-link>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto align-items-lg-center">
          <li class="nav-item"><router-link class="nav-link" to="/">Home</router-link></li>
          <li class="nav-item"><router-link class="nav-link" to="/solercalc">Solar Calculator</router-link></li>
          <li class="nav-item"><router-link class="nav-link" to="/about">About Us</router-link></li>
          <li class="nav-item"><router-link class="nav-link" to="/contact">Contact Us</router-link></li>

          <template v-if="!currentUser">
            <li class="nav-item"><router-link class="nav-link" to="/signup">Sign Up</router-link></li>
            <li class="nav-item"><router-link class="nav-link" to="/login">Log In</router-link></li>
          </template>

          <li v-else class="nav-item dropdown">
            <button class="nav-link dropdown-toggle btn btn-link" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <img v-if="currentUser.photoURL" :src="currentUser.photoURL" alt="Profile" class="profile-icon" referrerpolicy="no-referrer" />
              <i v-else class="fas fa-user-circle me-1"></i>
              {{ currentUser.displayName || currentUser.email || 'Account' }}
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li class="px-3 py-2">
                <div class="small fw-semibold">{{ userAccess.roleLabel }}</div>
                <div class="small text-muted role-description">{{ userAccess.roleDescription }}</div>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li><router-link class="dropdown-item" to="/customer/my-projects">My Projects</router-link></li>
              <li v-if="canOpenDashboard"><router-link class="dropdown-item" to="/admin">Administration Dashboard</router-link></li>
              <li><hr class="dropdown-divider" /></li>
              <li><button class="dropdown-item" type="button" :disabled="signingOut" @click="signOutUser">{{ signingOut ? 'Signing out...' : 'Sign Out' }}</button></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<script>
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/firebase';
import {
  clearUserAccessCache,
  customerAccess,
  getUserAccess,
  hasPermission
} from '@/utils/accessControl';
import { PERMISSIONS } from '@/constants/rbac';

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
        const uid = this.currentUser?.uid;
        await signOut(auth);
        clearUserAccessCache(uid);
        await this.$router.replace('/');
      } catch (error) {
        console.error('Sign-out error:', error);
      } finally {
        this.signingOut = false;
      }
    }
  }
};
</script>

<style scoped>
.navbar-brand { display: flex; align-items: center; font-weight: 700; }
.logo { width: 40px; height: auto; margin-right: 10px; }
.profile-icon { width: 30px; height: 30px; border-radius: 50%; margin-right: 5px; object-fit: cover; }
.btn-link { text-decoration: none; }
.role-description { max-width: 260px; white-space: normal; }
</style>
