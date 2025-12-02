# Flow Simulator (Minimal runnable version)

This is a minimal React + Vite project that demonstrates a 2D flow/particle simulator with:
- upload background image
- draw polygon regions (click to add vertices, double-click to close)
- draw "flow brush" strokes (drag to create direction segments)
- simulate particles inside regions that follow the nearest brush direction
- export GIF using gif.js.browser

## Quick start (requires node/npm)

```bash
npm install
npm run dev
# open http://localhost:5173
```

Exported GIF will be prompted for download.

This is a lightweight demo intended as a starting point. For production use, consider:
- GPU-based simulations (WebGL / shaders)
- performance optimizations, spatial indexing for large particle counts
- proper asset pipeline and tests
