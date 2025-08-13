import fs from 'fs'
import path from 'path'

const basePath = process.env.NODE_ENV === 'production' ? '/Mini-games' : ''

// Read the manifest template
const manifestPath = path.join(process.cwd(), 'public/manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))

// Create a backup if it doesn't exist
const backupPath = manifestPath + '.backup'
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, JSON.stringify(manifest, null, 2))
}

// Update paths to include base path
const updatedManifest = {
  ...manifest,
  start_url: basePath + '/',
  scope: basePath + '/',
  icons: manifest.icons.map((icon) => ({
    ...icon,
    src: basePath + icon.src
  })),
  screenshots: manifest.screenshots ? manifest.screenshots.map((screenshot) => ({
    ...screenshot,
    src: basePath + screenshot.src
  })) : undefined
}

// Write the updated manifest back
fs.writeFileSync(manifestPath, JSON.stringify(updatedManifest, null, 2))

console.log('Manifest updated with base path:', basePath)