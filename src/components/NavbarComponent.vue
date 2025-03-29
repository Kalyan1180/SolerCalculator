<template>
    <nav class="navbar navbar-expand-lg navbar-light bg-light">
      <div class="container">
        <router-link class="navbar-brand" to="/">
          <img src="@/assets/logo.png" alt="Ant Logo" class="logo" />
          Ant Soler
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
          <ul class="navbar-nav ms-auto">
            <!-- Always visible links -->
            <li class="nav-item">
              <router-link class="nav-link" to="/">Home</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/solercalc">Soler Calculator</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/admin">Admin Control</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/about">About Us</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/contact">Contact Us</router-link>
            </li>
            <!-- Conditionally show sign up / log in when user is not logged in --> 
            <li class="nav-item" v-if="!currentUser">
              <router-link class="nav-link" to="/signup">Sign In</router-link>
            </li>
            <li class="nav-item" v-if="!currentUser">
              <router-link class="nav-link" to="/login">Log In</router-link>
            </li>
            <!-- If logged in, show profile dropdown instead of Sign In/Log In links -->
            <li class="nav-item dropdown" v-if="currentUser">
              <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <img :src="currentUser.photoURL || defaultProfile" alt="Profile" class="profile-icon" />
                {{ currentUser.displayName || currentUser.email }}
              </a>
              <ul class="dropdown-menu dropdown-menu-end">
                <li><a class="dropdown-item" href="#" @click="signOut">Sign Out</a></li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </template>
  
  <script>
  import { onAuthStateChanged, signOut } from "firebase/auth";
  import { getAuth } from "firebase/auth";
  
  export default {
    name: "NavbarComponent",
    data() {
      return {
        currentUser: null,
        defaultProfile: "https://via.placeholder.com/30"
      };
    },
    methods: {
      signOutUser() {
        signOut(getAuth())
          .then(() => {
            this.currentUser = null;
            this.$router.push("/");
          })
          .catch((err) => console.error("Sign out error:", err));
      },
      signOut() {
        this.signOutUser();
      }
    },
    created() {
      const authInstance = getAuth();
      onAuthStateChanged(authInstance, (user) => {
        this.currentUser = user;
      });
    }
  };
  </script>
  
  <style scoped>
  .navbar-brand {
    display: flex;
    align-items: center;
  }
  .logo {
    width: 40px;
    height: auto;
    margin-right: 10px;
  }
  .profile-icon {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    margin-right: 5px;
    object-fit: cover;
  }
  </style>
  