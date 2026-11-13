/** Static hosts add trailing slashes to directory routes; app route identity stays the same. */
export function normalizePathname(pathname: string): string {
  return pathname.replace(/\/+$/, '') || '/';
}
