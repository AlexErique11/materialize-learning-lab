import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { labActivityPaths } from '../progress/labProgress';
import { documentTitle, staticRoutes } from './staticRoutes';

describe('staticRoutes', () => {
  const paths = staticRoutes.map((route) => route.path);

  it('lists each path once', () => {
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('covers every lecture and exercise', () => {
    for (const path of labActivityPaths) expect(paths).toContain(path);
  });

  it('gives every route a description', () => {
    for (const route of staticRoutes) expect(route.description).not.toBe('');
  });

  it('points every preview image at a raster file in public/', () => {
    for (const route of staticRoutes) {
      expect(existsSync(`public${route.image}`)).toBe(true);
      expect(route.image).toMatch(/\.(png|jpe?g|webp)$/);
    }
  });

  it('formats titles like usePageTitle', () => {
    expect(documentTitle({ path: '/faq', title: 'FAQ', description: 'x', image: '/x.png' })).toBe('FAQ | Materialize Learning Lab');
    expect(documentTitle({ path: '/', description: 'x', image: '/x.png' })).toBe('Materialize Learning Lab');
  });
});
