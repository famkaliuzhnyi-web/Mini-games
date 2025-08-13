import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/Mini-games/' : '/'
  
  return {
    plugins: [react()],
    base,
    define: {
      __BASE_PATH__: JSON.stringify(base),
    },
  }
})
