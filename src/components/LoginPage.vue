<template>
    <div class="login-container container my-5">
      <h2 class="text-center mb-4">Log In</h2>
      <!-- Google Log In -->
      <div class="text-center mb-3">
        <button class="btn btn-outline-danger w-100" @click="logInWithGoogle">
          Log In with Google
        </button>
      </div>
      <!-- Email/Password Log In Form -->
      <form @submit.prevent="logInWithEmail">
        <div class="form-group mb-3">
          <label for="email" class="form-label">Email</label>
          <input v-model="email" type="email" id="email" class="form-control" placeholder="Enter your email" required />
        </div>
        <div class="form-group mb-3">
          <label for="password" class="form-label">Password</label>
          <input v-model="password" type="password" id="password" class="form-control" placeholder="Enter your password" required />
        </div>
        <button type="submit" class="btn btn-primary w-100">Log In</button>
      </form>
      <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
    </div>
  </template>
  
  <script>
  import { getAuth, signInWithPopup, signInWithEmailAndPassword, getIdTokenResult } from "firebase/auth";
  import { googleProvider } from "@/firebase";
  
  export default {
    name: "LoginPage",
    data() {
      return {
        email: "",
        password: "",
        error: ""
      };
    },
    methods: {
      async logInWithGoogle() {
        try {
          const result = await signInWithPopup(getAuth(), googleProvider);
          const tokenResult = await getIdTokenResult(result.user);
          console.log("User token claims:", tokenResult.claims);
          this.$router.push("/");
        } catch (err) {
          console.error("Google sign-in error:", err);
          this.error = err.message;
        }
      },
      async logInWithEmail() {
        if (!this.email || !this.password) {
          this.error = "Please enter both email and password.";
          return;
        }
        try {
          const result = await signInWithEmailAndPassword(getAuth(), this.email, this.password);
          const tokenResult = await getIdTokenResult(result.user);
          console.log("User token claims:", tokenResult.claims);
          this.$router.push("/");
        } catch (err) {
          console.error("Email sign-in error:", err);
          this.error = err.message;
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .login-container {
    max-width: 400px;
    margin: auto;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
  }
  </style>
  