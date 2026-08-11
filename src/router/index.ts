import { createRouter, createWebHistory } from 'vue-router'

import InventarioView from '@/views/InventarioView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'inventario', component: InventarioView },
    {
      path: '/ventas',
      name: 'ventas',
      component: () => import('@/views/VentasView.vue'),
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
