<template>
  <div>
    <NavbarComponent />
    <router-view />
  </div>
</template>

<script>
import NavbarComponent from './components/NavbarComponent.vue';
export default {
  name: "App",
  components: {
    NavbarComponent
  }
};
</script>

<style>
/* Global styles */
</style>
