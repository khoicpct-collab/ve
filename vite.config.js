import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ⚠️ THAY flow-simulator-full bằng đúng tên repo của bạn
export default defineConfig({
  plugins: [react()],
  base: '/flow-simulator-full/'
})
