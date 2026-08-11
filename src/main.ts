import { createApp } from 'vue'
import { convexVue } from 'convex-vue'

// Tipografías autohospedadas: no dependen de un CDN externo ni provocan
// un salto de fuente al cargar.
import '@fontsource-variable/archivo'
import '@fontsource-variable/bricolage-grotesque'

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
