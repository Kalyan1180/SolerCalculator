<template>
  <div class="login-container container my-5">
    <h2 class="text-center mb-4">Log In</h2>

    <button class="btn btn-outline-danger w-100 mb-3" :disabled="loading" @click="logInWithGoogle">
      Continue with Google
    </button>

    <form @submit.prevent="logInWithEmail">
      <div class="form-group mb-3">
        <label for="email" class="form-label">Email</label>
        <input v-model.trim="email" type="email" id="email" autocomplete="email" class="form-control" required>
      </div>
      <div class="form-group mb-3">
        <label for="password" class="form-label">Password</label>
        <input v-model="password" type="password" id="password" autocomplete="current-password" class="form-control" required>
      </div>
      <button type="submit" class="btn btn-primary w-100" :disabled="loading">
        {{ loading ? 'Logging in...' : 'Log In' }}
      </button>
    </form>

    <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
  </div>
</template>

<script>
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, googleProvider } from '@/firebase';
import { createUserWithRole } from '@/utils/firebaseHelpers';

function friendlyAuthError(error) {
  const messages = {
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.'
  };
  return messages[error?.code] || error?.message || 'Unable to log in.';
}

export default {
  name: 'LoginPage',
  data() {
    return {
      email: '',
      password: '',
      error: '',
      loading: false
    };
  },
  methods: {
    redirectAfterLogin() {
      const requested = typeof this.$route.query.redirect === 'string'
        && this.$route.query.redirect.startsWith('/')
        && !this.$route.query.redirect.startsWith('//')
        ? this.$route.query.redirect
        : '/';
      const hasCalculatorResults = Number(this.$store.getters.solerResults?.panelCount) > 0;
      const redirect = requested === '/submit-quotation' && !hasCalculatorResults
        ? '/solercalc'
        : requested;
      this.$router.replace(redirect);
    },
    async logInWithGoogle() {
      this.loading = true;
      this.error = '';
      try {
        const result = await signInWithPopup(auth, googleProvider);
        await createUserWithRole(result.user);
        this.redirectAfterLogin();
      } catch (error) {
        console.error('Google login error:', error);
        this.error = friendlyAuthError(error);
      } finally {
        this.loading = false;
      }
    },
    async logInWithEmail() {
      this.loading = true;
      this.error = '';
      try {
        const result = await signInWithEmailAndPassword(auth, this.email, this.password);
        await createUserWithRole(result.user);
        this.redirectAfterLogin();
      } catch (error) {
        console.error('Email login error:', error);
        this.error = friendlyAuthError(error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  max-width: 400px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
</style>
