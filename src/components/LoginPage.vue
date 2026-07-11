<template>
  <div class="login-container container my-5">
    <h2 class="text-center mb-4">Log In</h2>

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

export default {
  name: 'LoginPage',
  data() {
    return { email: '', password: '', error: '', loading: false };
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
    async logInWithGoogle() {
      this.loading = true;
      this.error = '';
      try {
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
  max-width: 420px;
  padding: 24px;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}
</style>
