<template>
  <div>
    <NavbarComponent />
    <router-view />
    <SessionStatus />
  </div>
</template>

<script>
import NavbarComponent from './components/NavbarComponent.vue';
import SessionStatus from './components/SessionStatus.vue';

export default {
  name: 'App',
  components: {
    NavbarComponent,
    SessionStatus
  }
};
</script>

<style>
/* Global styles */
</style>
