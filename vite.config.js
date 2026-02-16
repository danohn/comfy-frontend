import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getBasePath() {
  if (!process.env.GITHUB_ACTIONS) {
    return '/'
  }

  const repository = process.env.GITHUB_REPOSITORY || ''
  const repoName = repository.split('/')[1] || ''

  // User/organization pages serve from root; project pages serve from /<repo>/.
  if (repoName.endsWith('.github.io')) {
    return '/'
  }

  return repoName ? `/${repoName}/` : '/'
}

export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true
  }
})
