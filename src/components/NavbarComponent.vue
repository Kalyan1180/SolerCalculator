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
              <router-link class="nav-link" to="/about">About Us</router-link>
            </li>
            <li class="nav-item">
              <router-link class="nav-link" to="/contact">Contact Us</router-link>
            </li>
            <!-- Conditionally show Sign Up / Log In when user is not logged in --> 
            <li class="nav-item" v-if="!currentUser">
              <router-link class="nav-link" to="/signup">Sign In</router-link>
            </li>
            <li class="nav-item" v-if="!currentUser">
              <router-link class="nav-link" to="/login">Log In</router-link>
            </li>
            <!-- If logged in, show profile dropdown with Admin link if role is admin --> 
            <li class="nav-item dropdown" v-if="currentUser">
              <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <img :src="currentUser.photoURL || defaultProfile" alt="Profile" class="profile-icon" />
                {{ currentUser.displayName || currentUser.email }}
              </a>
              <ul class="dropdown-menu dropdown-menu-end">
                <!-- Only show Admin link if userRole is 'admin' --> 
                <li v-if="userRole === 'admin'">
                  <router-link class="dropdown-item" to="/admin">Admin Control</router-link>
                </li>
                <li><a class="dropdown-item" href="#" @click="signOut">Sign Out</a></li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </template>
  
  <script>
  import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
  import { getUserRole } from "@/utils/firebaseHelpers";
  
  export default {
    name: "NavbarComponent",
    data() {
      return {
        currentUser: null,
        userRole: null,
        defaultProfile: "https://via.placeholder.com/30"
      };
    },
    methods: {
      async signOutUser() {
        const authInstance = getAuth();
        await signOut(authInstance);
        this.currentUser = null;
        this.userRole = null;
        this.$router.push("/");
      },
      signOut() {
        this.signOutUser();
      },
      async fetchUserRole(uid) {
        const role = await getUserRole(uid);
        this.userRole = role;
      }
    },
    created() {
      const authInstance = getAuth();
      onAuthStateChanged(authInstance, async (user) => {
        this.currentUser = user;
        if (user) {
          await this.fetchUserRole(user.uid);
        }
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
  