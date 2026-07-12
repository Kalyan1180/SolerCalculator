<template>
  <div class="auth-page">
    <section class="signup-container">
      <div class="text-center mb-4">
        <span class="marketing-eyebrow mb-2">Customer account</span>
        <h1 class="h2 mb-2">Create your ANT Solar account</h1>
        <p class="text-muted mb-0">Save quotation requests and follow project progress from one secure workspace.</p>
      </div>

      <div v-if="error" class="alert alert-danger" role="alert">
        <i class="fas fa-circle-exclamation me-2" aria-hidden="true"></i>{{ error }}
      </div>

      <button class="btn btn-outline-secondary w-100" :disabled="loading" @click="signUpWithGoogle">
        <i class="fab fa-google me-2" aria-hidden="true"></i>Continue with Google
      </button>

      <div class="d-flex align-items-center gap-3 my-4" aria-hidden="true">
        <span class="border-top flex-grow-1"></span>
        <small class="text-muted text-uppercase fw-semibold">or use email</small>
        <span class="border-top flex-grow-1"></span>
      </div>

      <form @submit.prevent="signUpWithEmail">
        <div class="mb-3">
          <label for="displayName" class="form-label">Full name</label>
          <div class="input-group">
            <span class="input-group-text bg-white"><i class="fas fa-user text-muted" aria-hidden="true"></i></span>
            <input v-model.trim="displayName" type="text" id="displayName" class="form-control" maxlength="100" autocomplete="name" />
          </div>
        </div>

        <div class="mb-3">
          <label for="signupEmail" class="form-label">Email address</label>
          <div class="input-group">
            <span class="input-group-text bg-white"><i class="fas fa-envelope text-muted" aria-hidden="true"></i></span>
            <input v-model.trim="email" type="email" id="signupEmail" class="form-control" autocomplete="email" required />
          </div>
        </div>

        <div class="mb-3">
          <label for="signupPassword" class="form-label">Password</label>
          <div class="input-group">
            <span class="input-group-text bg-white"><i class="fas fa-lock text-muted" aria-hidden="true"></i></span>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              id="signupPassword"
              class="form-control"
              minlength="8"
              autocomplete="new-password"
              required
            />
            <button type="button" class="btn btn-outline-secondary" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">
              <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" aria-hidden="true"></i>
            </button>
          </div>
          <div class="form-text">Use at least 8 characters and avoid reusing an important password.</div>
        </div>

        <div class="form-check mb-4">
          <input v-model="rememberSession" class="form-check-input" type="checkbox" id="rememberSignupSession" />
          <label class="form-check-label fw-semibold" for="rememberSignupSession">Keep me signed in on this device</label>
          <div class="form-text">Leave this unchecked when creating an account on a shared device.</div>
        </div>

        <button type="submit" class="btn btn-primary w-100" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          {{ loading ? 'Creating account…' : 'Create account' }}
        </button>
      </form>

      <p class="text-center text-muted mt-4 mb-0">
        Already registered? <router-link to="/login" class="fw-semibold">Sign in</router-link>
      </p>
    </section>
  </div>
</template>

<script>
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '@/firebase';
import { createUserWithRole } from '@/utils/firebaseHelpers';
import {
  configureSessionPersistence,
  getRememberSessionPreference
} from '@/utils/sessionManager';

export default {
  name: 'SignUpPage',
  data() {
    return {
      displayName: '',
      email: '',
      password: '',
      error: '',
      loading: false,
      showPassword: false,
      rememberSession: getRememberSessionPreference()
    };
  },
  methods: {
    async completeSignup(user) {
      await createUserWithRole(user);
      this.$router.replace('/');
    },
    async prepareSignup() {
      await configureSessionPersistence(this.rememberSession);
    },
    async signUpWithEmail() {
      this.error = '';
      if (this.password.length < 8) {
        this.error = 'Password must contain at least 8 characters.';
        return;
      }

      this.loading = true;
      try {
        await this.prepareSignup();
        const result = await createUserWithEmailAndPassword(auth, this.email, this.password);
        if (this.displayName) await updateProfile(result.user, { displayName: this.displayName });
        await this.completeSignup(result.user);
      } catch (error) {
        console.error('Email signup error:', error);
        this.error = 'Unable to create the account. The email may already be registered.';
      } finally {
        this.loading = false;
      }
    },
    async signUpWithGoogle() {
      this.loading = true;
      this.error = '';
      try {
        await this.prepareSignup();
        const result = await signInWithPopup(auth, googleProvider);
        await this.completeSignup(result.user);
      } catch (error) {
        console.error('Google signup error:', error);
        this.error = 'Unable to sign up with Google. Please try again.';
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
