import { test, expect } from '@playwright/test';
import { API } from './_helpers';

/** All four backends must be up + DB-connected before the rest of the suite runs. */
test.describe('backend health', () => {
  for (const [name, base] of Object.entries(API)) {
    test(`${name} backend is healthy`, async ({ request }) => {
      const res = await request.get(`${base}/health`);
      expect(res.ok(), `${name} /health HTTP ${res.status()}`).toBeTruthy();
      const body = await res.json();
      expect(body.status).toBe('ok');
      expect(body.db).toBe('connected');
    });
  }
});
