import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages: set VITE_BASE_PATH=/your-repo-name/ for project pages.
// Default './' works for user/org pages and most project deploys.
const base = process.env.VITE_BASE_PATH || './'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
