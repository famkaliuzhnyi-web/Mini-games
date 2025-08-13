// Utility for handling base path in development vs production
export const BASE_PATH = __BASE_PATH__ || '/'

export function getAssetPath(path: string): string {
  // Remove leading slash if present and add base path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return BASE_PATH + cleanPath
}

export function getAbsolutePath(path: string): string {
  // For absolute URLs that need the base path
  if (path.startsWith('/')) {
    return BASE_PATH === '/' ? path : BASE_PATH.slice(0, -1) + path
  }
  return BASE_PATH + path
}