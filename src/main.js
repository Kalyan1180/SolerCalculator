// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import store from './store';
import {
  initializeAuthPersistence,
  initializeSessionManager
} from '@/utils/sessionManager';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '@fortawesome/fontawesome-free/css/all.min.css';

async function bootstrap() {
  // Persistence must be selected before Firebase restores the signed-in user.
  await initializeAuthPersistence();
  const { default: router } = await import('./router');
  await initializeSessionManager(router);

  createApp(App)
    .use(store)
    .use(router)
    .mount('#app');
}

bootstrap().catch(error => {
  console.error('Application startup failed:', error);
  const root = document.getElementById('app');
  if (root) root.textContent = 'Unable to start the application. Please refresh and try again.';
});
