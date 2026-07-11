<template>
  <div class="login-container container my-5">
    <h2 class="text-center mb-4">Log In</h2>

    <div v-if="sessionNotice" class="alert alert-warning" role="status">
      {{ sessionNotice }}
    </div>

    <button class="btn btn-outline-danger w-100 mb-3" :disabled="loading" @click="logInWithGoogle">
      Log In with Google
    </button>

    <form @submit.prevent="logInWithEmail">
      <div class="mb-3">
        <label for="email" class="form-label">Email</label>
        <input v-model.trim="email" type="email" id="email" class="form-control" autocomplete="email" required />
      </div>
      <div class="mb-3">
        <label for="password" class="form-label">Password</label>
        <input v-model="password" type="password" id="password" class="form-control" autocomplete="current-password" required />
      </div>
      <div class="form-check mb-3">
        <input v-model="rememberSession" class="form-check-input" type="checkbox" id="rememberSession" />
        <label class="form-check-label" for="rememberSession">Keep me signed in on this device</label>
        <div class="form-text">
          Leave this unchecked on shared devices. Administration sessions still expire after 30 minutes of inactivity or 8 hours total.
        </div>
      </div>
      <button type="submit" class="btn btn-primary w-100" :disabled="loading">
        {{ loading ? 'Signing in...' : 'Log In' }}
      </button>
    </form>

    <div v-if="error" class="alert alert-danger mt-3" role="alert">{{ error }}</div>
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

<style scoped>
.login-container {
  max-width: 440px;
  padding: 24px;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
</style>
