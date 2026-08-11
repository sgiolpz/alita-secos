import { createApp } from 'vue'
import { convexVue } from 'convex-vue'

import App from './App.vue'
import router from './router'
import './style.css'

const convexUrl = import.meta.env.VITE_CONVEX_URL

if (!convexUrl) {
  console.error(
    'Falta VITE_CONVEX_URL. Ejecuta `npx convex dev` para generar el archivo .env.local.',
  )
}

createApp(App).use(router).use(convexVue, { url: convexUrl }).mount('#app')
