import { createRouter, createWebHistory } from 'vue-router'

import VentasView from '@/views/VentasView.vue'
import { haySesion } from '@/lib/sesion'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // Al ingresar, lo primero que se ve es Ventas.
    { path: '/', name: 'ventas', component: VentasView },
    {
      path: '/inventario',
      name: 'inventario',
      component: () => import('@/views/InventarioView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { publica: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach((to) => {
  if (to.meta.publica) {
    // Con sesión abierta no tiene sentido volver a la pantalla de acceso.
    return haySesion.value ? { name: 'ventas' } : true
  }

  if (!haySesion.value) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { redirigir: to.fullPath } }
  }

  return true
})

export default router
