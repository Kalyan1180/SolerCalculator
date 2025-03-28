// src/router.js
import { createRouter, createWebHistory } from 'vue-router'
import SolerForm from './components/SolerForm.vue'
import AdminEntry from './components/AdminEntry.vue'  // Create this component later

const routes = [
  {
    path: '/',
    name: 'SolerForm',
    component: SolerForm
  },
  {
    path: '/admin',
    name: 'AdminEntry',
    component: AdminEntry
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

export default router
