<template>
    <div class="signup-container container my-5">
      <h2 class="text-center mb-4">Sign Up</h2>
      <!-- Email/Password Sign Up Form -->
      <form @submit.prevent="signUpWithEmail" class="mb-4 border p-3 rounded">
        <div class="mb-3">
          <label for="email" class="form-label">Email Address</label>
          <input v-model="email" type="email" id="email" class="form-control" placeholder="Enter your email" required />
        </div>
        <div class="mb-3">
          <label for="password" class="form-label">Password</label>
          <input v-model="password" type="password" id="password" class="form-control" placeholder="Enter a strong password" required />
        </div>
        <button type="submit" class="btn btn-primary w-100">Sign Up with Email</button>
      </form>
      <!-- Google Sign Up -->
      <div class="text-center mb-3">
        <button class="btn btn-outline-danger w-100" @click="signUpWithGoogle">
          Sign Up with Google
        </button>
      </div>
      <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>
    </div>
  </template>
  
  <script>
  import { getAuth, createUserWithEmailAndPassword, signInWithPopup, getIdTokenResult } from "firebase/auth";
  import { googleProvider } from "@/firebase";
  
  export default {
    name: "SignUpPage",
    data() {
      return {
        email: "",
        password: "",
        error: ""
      };
    },
    methods: {
      async signUpWithEmail() {
        try {
          const result = await createUserWithEmailAndPassword(getAuth(), this.email, this.password);
          const tokenResult = await getIdTokenResult(result.user);
          console.log("User token claims:", tokenResult.claims);
          this.$router.push("/");
        } catch (err) {
          console.error("Email sign-up error:", err);
          this.error = err.message;
        }
      },
      async signUpWithGoogle() {
        try {
          const result = await signInWithPopup(getAuth(), googleProvider);
          const tokenResult = await getIdTokenResult(result.user);
          console.log("User token claims:", tokenResult.claims);
          this.$router.push("/");
        } catch (err) {
          console.error("Google sign-up error:", err);
          this.error = err.message;
        }
      }
    }
  };
  </script>
  
  <style scoped>
  .signup-container {
    max-width: 400px;
    margin: auto;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
  }
  </style>
  