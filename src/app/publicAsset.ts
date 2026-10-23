/** Resolves a file in `public/` against the app's base path, e.g. `publicAsset('logo.png')`. */
export function publicAsset(path: string): string {
  // Vite guarantees BASE_URL ends in '/'. It's undefined when Playwright specs import this outside Vite.
  return `${import.meta.env?.BASE_URL ?? '/'}${path}`;
}
