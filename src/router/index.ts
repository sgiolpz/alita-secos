import { createRouter, createWebHistory } from 'vue-router'

import VentasView from '@/views/VentasView.vue'
import { esAdmin, haySesion } from '@/lib/sesion'

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
      path: '/productos',
      name: 'productos',
      component: () => import('@/views/ProductosView.vue'),
    },
    {
      path: '/recaudacion',
      name: 'recaudacion',
      component: () => import('@/views/RecaudacionView.vue'),
    },
    {
      path: '/administracion',
      name: 'administracion',
      component: () => import('@/views/AdministracionView.vue'),
      meta: { soloAdmin: true },
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

  // Este guardia solo ordena la navegación; quien manda es el servidor, que
  // exige el rol en cada función de Administración.
  if (to.meta.soloAdmin && !esAdmin.value) {
    return { name: 'ventas' }
  }

  return true
})

export default router
