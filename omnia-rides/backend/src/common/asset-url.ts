/**
 * Car photos are served by this backend from `public/cars`. The seed stores
 * them as absolute URLs (historically `http://localhost:3003/cars/...`), so on
 * a deployed host the stored origin is wrong and the images 404 in the browser.
 *
 * `resolveAssetUrl` rewrites the origin of any `/cars/...` asset to PUBLIC_BASE_URL
 * (the public origin this backend is reachable at) at response time — no re-seed
 * of the live database required. External URLs (e.g. Unsplash) are left untouched.
 *
 * Set PUBLIC_BASE_URL in production, e.g.
 *   PUBLIC_BASE_URL=https://ilyashunter55-omnia-rides-api.hf.space
 * Locally it defaults to the dev port so nothing changes in development.
 */
const ASSET_BASE = (process.env.PUBLIC_BASE_URL || 'http://localhost:3003').replace(/\/+$/, '');

export function resolveAssetUrl(stored: string | null | undefined): string {
  if (!stored) return stored ?? '';
  const idx = stored.indexOf('/cars/');
  if (idx === -1) return stored; // external/already-correct URL — leave as-is
  return `${ASSET_BASE}${stored.slice(idx)}`;
}
