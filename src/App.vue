<template>
  <div class="app-root">
    <AdminShell v-if="usesAdminLayout">
      <router-view />
    </AdminShell>

    <template v-else>
      <NavbarComponent />
      <main class="public-main">
        <router-view />
      </main>
    </template>

    <SessionStatus />
  </div>
</template>

<script>
import NavbarComponent from './components/NavbarComponent.vue';
import AdminShell from './components/AdminShell.vue';
import SessionStatus from './components/SessionStatus.vue';

export default {
  name: 'App',
  components: {
    NavbarComponent,
    AdminShell,
    SessionStatus
  },
  computed: {
    usesAdminLayout() {
      return this.$route.meta.layout === 'admin';
    }
  }
};
</script>
