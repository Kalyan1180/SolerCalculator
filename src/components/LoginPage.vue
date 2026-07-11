<template>
  <div class="auth-page">
    <section class="login-container">
      <div class="text-center mb-4">
        <span class="marketing-eyebrow mb-2">Secure account access</span>
        <h1 class="h2 mb-2">Welcome back</h1>
        <p class="text-muted mb-0">Sign in to review quotations, projects or authorized administration modules.</p>
      </div>

      <div v-if="sessionNotice" class="alert alert-warning" role="status">
        <i class="fas fa-clock me-2" aria-hidden="true"></i>{{ sessionNotice }}
      </div>
      <div v-if="error" class="alert alert-danger" role="alert">
        <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ error }}
      </div>

      <button class="btn btn-outline-secondary w-100" :disabled="loading" @click="logInWithGoogle">
        <i class="fab fa-google me-2" aria-hidden="true"></i>Continue with Google
      </button>

      <div class="d-flex align-items-center gap-3 my-4" aria-hidden="true">
        <span class="border-top flex-grow-1"></span>
        <small class="text-muted text-uppercase fw-semibold">or use email</small>
        <span class="border-top flex-grow-1"></span>
      </div>

      <form @submit.prevent="logInWithEmail">
        <div class="mb-3">
          <label for="email" class="form-label">Email address</label>
          <div class="input-group">
            <span class="input-group-text bg-white"><i class="fas fa-envelope text-muted" aria-hidden="true"></i></span>
            <input v-model.trim="email" type="email" id="email" class="form-control" autocomplete="email" required />
          </div>
        </div>

        <div class="mb-3">
          <label for="password" class="form-label">Password</label>
          <div class="input-group">
            <span class="input-group-text bg-white"><i class="fas fa-lock text-muted" aria-hidden="true"></i></span>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              id="password"
              class="form-control"
              autocomplete="current-password"
              required
            />
            <button type="button" class="btn btn-outline-secondary" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div class="form-check mb-4">
          <input v-model="rememberSession" class="form-check-input" type="checkbox" id="rememberSession" />
          <label class="form-check-label fw-semibold" for="rememberSession">Keep me signed in on this device</label>
          <div class="form-text">Leave this unchecked on shared devices. Administration sessions still follow secure idle and maximum-duration limits.</div>
        </div>

        <button type="submit" class="btn btn-primary w-100" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          {{ loading ? 'Signing in…' : 'Sign in securely' }}
        </button>
      </form>

      <p class="text-center text-muted mt-4 mb-0">
        New to ANT Solar? <router-link to="/signup" class="fw-semibold">Create an account</router-link>
      </p>
    </section>
  </div>
</template>

<script>
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/firebase';
import { createUserWithRole } from '@/utils/firebaseHelpers';
import {
  configureSessionPersistence,
  getRememberSessionPreference
} from '@/utils/sessionManager';

const SESSION_MESSAGES = {
  'idle-timeout': 'Your session ended because it was inactive. Please sign in again.',
  'absolute-timeout': 'The maximum secure session duration was reached. Please sign in again.',
  'SESSION_EXPIRED': 'Your secure session expired. Please sign in again.',
  'SESSION_REVOKED': 'This session was revoked by an administrator. Please sign in again.',
  'REAUTHENTICATION_REQUIRED': 'For security, please sign in again to continue.',
  'server-session-rejected': 'Your session is no longer valid. Please sign in again.'
};

export default {
  name: 'LoginPage',
  data() {
    return {
      email: '',
      password: '',
      error: '',
      loading: false,
      showPassword: false,
      rememberSession: getRememberSessionPreference()
    };
  },
  computed: {
    sessionNotice() {
      const reason = String(this.$route.query.reason || '');
      return SESSION_MESSAGES[reason] || '';
    }
  },
  methods: {
    redirectAfterLogin() {
      const requested = String(this.$route.query.redirect || '');
      const destination = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';
      this.$router.replace(destination);
    },
    async completeLogin(user) {
      await createUserWithRole(user);
      this.redirectAfterLogin();
    },
    async prepareLogin() {
      await configureSessionPersistence(this.rememberSession);
    },
    async logInWithGoogle() {
      this.loading = true;
      this.error = '';
      try {
        await this.prepareLogin();
        const result = await signInWithPopup(auth, googleProvider);
        await this.completeLogin(result.user);
      } catch (error) {
        console.error('Google login error:', error);
        this.error = 'Unable to sign in with Google. Please try again.';
      } finally {
        this.loading = false;
      }
    },
    async logInWithEmail() {
      this.loading = true;
      this.error = '';
      try {
        await this.prepareLogin();
        const result = await signInWithEmailAndPassword(auth, this.email, this.password);
        await this.completeLogin(result.user);
      } catch (error) {
        console.error('Email login error:', error);
        this.error = 'Incorrect email/password or the account is unavailable.';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
