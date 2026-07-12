<template>
  <div class="admin-shell" :class="{ 'sidebar-open': sidebarOpen }">
    <aside class="admin-sidebar" aria-label="Administration navigation">
      <div class="admin-sidebar__brand">
        <router-link to="/admin" class="admin-brand" @click="closeSidebar">
          <span class="admin-brand__mark">
            <img src="@/assets/logo.png" alt="" />
          </span>
          <span>
            <strong>ANT Solar</strong>
            <small>Operations Console</small>
          </span>
        </router-link>
        <button type="button" class="admin-sidebar__close d-lg-none" aria-label="Close navigation" @click="closeSidebar">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>

      <div class="admin-sidebar__identity" v-if="!accessLoading">
        <div class="admin-avatar admin-avatar--small">{{ userInitials }}</div>
        <div class="min-w-0">
          <strong class="text-truncate d-block">{{ userDisplayName }}</strong>
          <small class="text-truncate d-block">{{ userAccess.roleLabel }}</small>
        </div>
      </div>

      <nav v-if="!accessLoading" class="admin-nav">
        <section v-for="group in visibleGroups" :key="group.label" class="admin-nav__group">
          <p class="admin-nav__label">{{ group.label }}</p>
          <router-link
            v-for="item in group.items"
            :key="item.routeName"
            :to="{ name: item.routeName }"
            class="admin-nav__item"
            active-class="is-active"
            :title="item.description"
            @click="closeSidebar"
          >
            <span class="admin-nav__icon"><i :class="item.fallbackIcon" aria-hidden="true"></i></span>
            <span class="admin-nav__copy">
              <strong>{{ item.shortTitle }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </router-link>
        </section>
      </nav>

      <div v-else class="admin-nav-skeleton" aria-label="Loading navigation">
        <span v-for="index in 6" :key="index"></span>
      </div>

      <div class="admin-sidebar__footer">
        <router-link to="/" class="admin-nav__item admin-nav__item--secondary" @click="closeSidebar">
          <span class="admin-nav__icon"><i class="fas fa-arrow-left" aria-hidden="true"></i></span>
          <span class="admin-nav__copy"><strong>Back to website</strong><small>Open the customer experience</small></span>
        </router-link>
      </div>
    </aside>

    <button
      v-if="sidebarOpen"
      type="button"
      class="admin-sidebar-backdrop d-lg-none"
      aria-label="Close navigation"
      @click="closeSidebar"
    ></button>

    <div class="admin-workspace">
      <header class="admin-topbar">
        <div class="d-flex align-items-center gap-3 min-w-0">
          <button type="button" class="admin-menu-button d-lg-none" aria-label="Open navigation" @click="sidebarOpen = true">
            <i class="fas fa-bars" aria-hidden="true"></i>
          </button>
          <div class="admin-page-context min-w-0">
            <div class="admin-breadcrumb">
              <router-link to="/admin">Administration</router-link>
              <i class="fas fa-chevron-right" aria-hidden="true"></i>
              <span>{{ pageTitle }}</span>
            </div>
            <h1>{{ pageTitle }}</h1>
            <p v-if="pageDescription">{{ pageDescription }}</p>
          </div>
        </div>

        <div class="admin-topbar__actions">
          <span v-if="!accessLoading" class="role-chip d-none d-md-inline-flex">
            <i class="fas fa-shield" aria-hidden="true"></i>
            {{ userAccess.roleLabel }}
          </span>
          <div class="dropdown">
            <button
              class="admin-account-button dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <img
                v-if="currentUser?.photoURL"
                :src="currentUser.photoURL"
                class="admin-avatar-image"
                alt="Profile"
                referrerpolicy="no-referrer"
              />
              <span v-else class="admin-avatar">{{ userInitials }}</span>
              <span class="admin-account-button__copy d-none d-sm-block">
                <strong>{{ userDisplayName }}</strong>
                <small>{{ currentUser?.email || 'Signed in' }}</small>
              </span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end enterprise-dropdown">
              <li class="px-3 pt-2 pb-1">
                <small class="text-uppercase text-muted fw-semibold">Signed in as</small>
                <div class="fw-semibold text-break">{{ currentUser?.email || userDisplayName }}</div>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li><router-link class="dropdown-item" to="/customer/my-projects"><i class="fas fa-folder-open me-2"></i>My Projects</router-link></li>
              <li><router-link class="dropdown-item" to="/"><i class="fas fa-globe me-2"></i>Customer Website</router-link></li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <button type="button" class="dropdown-item text-danger" :disabled="signingOut" @click="signOutUser">
                  <i class="fas fa-right-from-bracket me-2"></i>{{ signingOut ? 'Signing out...' : 'Sign out' }}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      <main class="admin-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script>
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';
import rbacMixin from '@/mixins/rbacMixin';
import { ADMIN_NAVIGATION_GROUPS } from '@/constants/adminNavigation';
import { endSession } from '@/utils/sessionManager';

export default {
  name: 'AdminShell',
  mixins: [rbacMixin],
  data() {
    return {
      currentUser: auth.currentUser,
      sidebarOpen: false,
      signingOut: false,
      unsubscribeAuth: null,
      navigationGroups: ADMIN_NAVIGATION_GROUPS
    };
  },
  computed: {
    visibleGroups() {
      return this.navigationGroups
        .map(group => ({
          ...group,
          items: group.items.filter(item => this.can(item.permission))
        }))
        .filter(group => group.items.length > 0);
    },
    pageTitle() {
      return String(this.$route.meta.title || 'Administration');
    },
    pageDescription() {
      return String(this.$route.meta.description || 'Manage ANT Solar operations securely.');
    },
    userDisplayName() {
      return this.currentUser?.displayName || this.currentUser?.email?.split('@')[0] || 'Account';
    },
    userInitials() {
      const source = this.userDisplayName.trim();
      if (!source) return 'AS';
      return source.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    }
  },
  watch: {
    '$route.fullPath'() {
      this.closeSidebar();
    }
  },
  created() {
    this.unsubscribeAuth = onAuthStateChanged(auth, user => {
      this.currentUser = user;
    });
  },
  beforeUnmount() {
    if (this.unsubscribeAuth) this.unsubscribeAuth();
  },
  methods: {
    closeSidebar() {
      this.sidebarOpen = false;
    },
    async signOutUser() {
      this.signingOut = true;
      try {
        await endSession('manual', { redirect: '/' });
      } catch (error) {
        console.error('Sign-out error:', error);
      } finally {
        this.signingOut = false;
      }
    }
  }
};
</script>
