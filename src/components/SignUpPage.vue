<template>
  <div class="signup-container container my-5">
    <h2 class="text-center mb-4">Sign Up</h2>

    <form @submit.prevent="signUpWithEmail" class="mb-4 border p-3 rounded">
      <div class="mb-3">
        <label for="email" class="form-label">Email Address</label>
        <input v-model.trim="email" type="email" id="email" autocomplete="email" class="form-control" required>
      </div>
      <div class="mb-3">
        <label for="password" class="form-label">Password</label>
        <input
          v-model="password"
          type="password"
          id="password"
          autocomplete="new-password"
          minlength="8"
          class="form-control"
          required
        >
        <div class="form-text">Use at least 8 characters.</div>
      </div>
      <button type="submit" class="btn btn-primary w-100" :disabled="loading">
        {{ loading ? 'Creating account...' : 'Sign Up with Email' }}
      </button>
    </form>

    <button class="btn btn-outline-danger w-100" :disabled="loading" @click="signUpWithGoogle">
      Continue with Google
    </button>

    <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
  </div>
</template>

<script>
import { createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/firebase';
import { createUserWithRole } from '@/utils/firebaseHelpers';

function friendlyAuthError(error) {
  const messages = {
    'auth/email-already-in-use': 'An account already exists for this email.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Please use a stronger password with at least 8 characters.',
    'auth/popup-closed-by-user': 'Google sign-up was cancelled.'
  };
  return messages[error?.code] || error?.message || 'Unable to create the account.';
}

export default {
  name: 'SignUpPage',
  data() {
    return {
      email: '',
      password: '',
      error: '',
      loading: false
    };
  },
  methods: {
    async finishSignUp(user) {
      await createUserWithRole(user);
      this.$router.replace('/');
    },
    async signUpWithEmail() {
      this.loading = true;
      this.error = '';
      try {
        const result = await createUserWithEmailAndPassword(auth, this.email, this.password);
        await this.finishSignUp(result.user);
      } catch (error) {
        console.error('Email signup error:', error);
        this.error = friendlyAuthError(error);
      } finally {
        this.loading = false;
      }
    },
    async signUpWithGoogle() {
      this.loading = true;
      this.error = '';
      try {
        const result = await signInWithPopup(auth, googleProvider);
        await this.finishSignUp(result.user);
      } catch (error) {
        console.error('Google signup error:', error);
        this.error = friendlyAuthError(error);
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>

<style scoped>
.signup-container {
  max-width: 400px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
</style>
