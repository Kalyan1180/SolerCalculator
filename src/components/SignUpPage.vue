<template>
  <div class="signup-container container my-5">
    <h2 class="text-center mb-4">Sign Up</h2>

    <form @submit.prevent="signUpWithEmail" class="mb-4">
      <div class="mb-3">
        <label for="displayName" class="form-label">Name</label>
        <input v-model.trim="displayName" type="text" id="displayName" class="form-control" maxlength="100" autocomplete="name" />
      </div>
      <div class="mb-3">
        <label for="email" class="form-label">Email Address</label>
        <input v-model.trim="email" type="email" id="email" class="form-control" autocomplete="email" required />
      </div>
      <div class="mb-3">
        <label for="password" class="form-label">Password</label>
        <input v-model="password" type="password" id="password" class="form-control" minlength="8" autocomplete="new-password" required />
        <small class="text-muted">Use at least 8 characters.</small>
      </div>
      <div class="form-check mb-3">
        <input v-model="rememberSession" class="form-check-input" type="checkbox" id="rememberSignupSession" />
        <label class="form-check-label" for="rememberSignupSession">Keep me signed in on this device</label>
      </div>
      <button type="submit" class="btn btn-primary w-100" :disabled="loading">
        {{ loading ? 'Creating account...' : 'Sign Up with Email' }}
      </button>
    </form>

    <button class="btn btn-outline-danger w-100" :disabled="loading" @click="signUpWithGoogle">
      Sign Up with Google
    </button>

    <div v-if="error" class="alert alert-danger mt-3" role="alert">{{ error }}</div>
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

<style scoped>
.signup-container {
  max-width: 440px;
  padding: 24px;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
</style>
