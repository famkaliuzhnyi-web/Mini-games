import fs from 'fs'
import path from 'path'

const basePath = '/Mini-games'

// Update the service worker in the dist directory after build
const distSwPath = path.join(process.cwd(), 'dist/sw.js')

if (!fs.existsSync(distSwPath)) {
  console.error('Service worker not found in dist directory')
  process.exit(1)
}

let swContent = fs.readFileSync(distSwPath, 'utf8')

// Generate a version timestamp for cache busting
const version = Date.now()

// Update cache names with dynamic versioning
swContent = swContent.replace(
  /const CACHE_NAME = '[^']*';/,
  `const CACHE_NAME = 'mini-games-v${version}';`
)
swContent = swContent.replace(
  /const STATIC_CACHE_NAME = '[^']*';/,
  `const STATIC_CACHE_NAME = 'mini-games-static-v${version}';`
)
swContent = swContent.replace(
  /const DYNAMIC_CACHE_NAME = '[^']*';/,
  `const DYNAMIC_CACHE_NAME = 'mini-games-dynamic-v${version}';`
)

// Define the static assets with correct base path including built assets
const staticAssets = [
  basePath + '/',
  basePath + '/index.html', 
  basePath + '/manifest.json',
  basePath + '/icon-192x192.png',
  basePath + '/icon-512x512.png',
  basePath + '/icon-144x144.png',
  basePath + '/icon-96x96.png',
  basePath + '/icon-72x72.png',
  basePath + '/icon-48x48.png',
  basePath + '/vite.svg',
  basePath + '/404.html',
]

// Add built assets from the assets directory
const distPath = path.join(process.cwd(), 'dist')
try {
  const assetsDir = path.join(distPath, 'assets')
  if (fs.existsSync(assetsDir)) {
    const assetFiles = fs.readdirSync(assetsDir)
    assetFiles.forEach(file => {
      staticAssets.push(basePath + '/assets/' + file)
    })
  }
} catch (error) {
  console.warn('Could not read assets directory:', error)
}

// Replace the STATIC_ASSETS array in the service worker
const staticAssetsString = JSON.stringify(staticAssets, null, 2)
  .replace(/\n/g, '\n  ')

swContent = swContent.replace(
  /const STATIC_ASSETS = \[[^\]]*\];/s,
  `const STATIC_ASSETS = ${staticAssetsString};`
)

// Update the fallback path in the fetch handler
swContent = swContent.replace(
  /return caches\.match\('\/index\.html'\);/g,
  `return caches.match('${basePath}/index.html');`
)

// Write the updated service worker back
fs.writeFileSync(distSwPath, swContent)

console.log('Post-build: Service worker updated with base path:', basePath)
console.log('Post-build: Cache version:', version)
console.log('Post-build: Total static assets to cache:', staticAssets.length)