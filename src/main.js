
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // Import your router
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-vue/dist/bootstrap-vue.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';


createApp(App)
  .use(router) // Register the router with your app
  .mount('#app')

