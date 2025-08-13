import fs from 'fs'
import path from 'path'

// Restore original files from backup
const manifestPath = path.join(process.cwd(), 'public/manifest.json')
const swPath = path.join(process.cwd(), 'public/sw.js')

const manifestBackup = manifestPath + '.backup'
const swBackup = swPath + '.backup'

if (fs.existsSync(manifestBackup)) {
  fs.copyFileSync(manifestBackup, manifestPath)
  console.log('Manifest restored from backup')
}

if (fs.existsSync(swBackup)) {
  fs.copyFileSync(swBackup, swPath)
  console.log('Service worker restored from backup')
}