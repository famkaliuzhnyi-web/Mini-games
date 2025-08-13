import fs from 'fs'
import path from 'path'

const basePath = process.env.NODE_ENV === 'production' ? '/Mini-games' : ''

// Read the service worker template
const swPath = path.join(process.cwd(), 'public/sw.js')
let swContent = fs.readFileSync(swPath, 'utf8')

// Create a backup if it doesn't exist
const backupPath = swPath + '.backup'
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, swContent)
}

// Define the static assets with correct base path
const staticAssets = [
  basePath + '/',
  basePath + '/index.html', 
  basePath + '/manifest.json',
  basePath + '/icon-192x192.png',
  basePath + '/icon-512x512.png',
]

// Replace the STATIC_ASSETS array in the service worker
const staticAssetsString = JSON.stringify(staticAssets, null, 2)
  .replace(/\n/g, '\n  ')

swContent = swContent.replace(
  /const STATIC_ASSETS = \[[^\]]*\];/s,
  `const STATIC_ASSETS = ${staticAssetsString};`
)

// Also update the fallback path in the fetch handler
swContent = swContent.replace(
  /return caches\.match\('\/index\.html'\);/,
  `return caches.match('${basePath}/index.html');`
)

// Write the updated service worker back
fs.writeFileSync(swPath, swContent)

console.log('Service worker updated with base path:', basePath)