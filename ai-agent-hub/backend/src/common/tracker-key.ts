/**
 * Stable rate-limit / usage bucket key for a request: the signed-in Clerk user id
 * (`sub`, decoded WITHOUT verifying so it survives token refreshes) when present,
 * else the client IP. Shared by the throttler guard and the usage endpoint so both
 * count against the exact same bucket.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trackerKey(req: Record<string, any>): string {
  const auth = typeof req.headers?.authorization === 'string' ? req.headers.authorization : '';
  if (auth.startsWith('Bearer ')) {
    const sub = subFromJwt(auth.slice(7));
    if (sub) return `user:${sub}`;
  }
  const ip = Array.isArray(req.ips) && req.ips.length ? req.ips[0] : req.ip;
  return `ip:${ip}`;
}

/** Decode a JWT's `sub` claim without verifying — bucket key only, never trusted. */
function subFromJwt(token: string): string | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { sub?: unknown };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
