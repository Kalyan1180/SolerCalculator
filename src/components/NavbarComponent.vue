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
              <li><router-link class="dropdown-item" to="/customer/my-projects">My Projects</router-link></li>
              <li v-if="userRole === 'admin'"><router-link class="dropdown-item" to="/admin">Admin Dashboard</router-link></li>
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
import { getUserRole } from '@/utils/firebaseHelpers';

export default {
  name: 'NavbarComponent',
  data() {
    return {
      currentUser: null,
      userRole: null,
      unsubscribeAuth: null,
      signingOut: false
    };
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, async user => {
      this.currentUser = user;
      this.userRole = user ? await getUserRole(user.uid) : null;
    });
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
  },
  methods: {
    async signOutUser() {
      this.signingOut = true;
      try {
        await signOut(auth);
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
</style>
