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
  basePath + '/icon-144x144.png',
  basePath + '/icon-96x96.png',
  basePath + '/icon-72x72.png',
  basePath + '/icon-48x48.png',
  basePath + '/vite.svg',
  basePath + '/404.html',
]

// If in production and dist directory exists, add built assets
const distPath = path.join(process.cwd(), 'dist')
if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
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
fs.writeFileSync(swPath, swContent)

console.log('Service worker updated with base path:', basePath)
console.log('Total static assets to cache:', staticAssets.length)