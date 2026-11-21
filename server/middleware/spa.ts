import express, { type Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.ts';

/** Serve the built web app (dist/) with PWA files and SPA fallback. No-op when dist/ is missing (dev). */
export function serveSpa(app: Express) {
  const DIST = env.distDir;
  if (!fs.existsSync(DIST)) return;
  app.get('/sw.js', (_req, res) => {
    const src = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8').replace('__BUILD__', env.buildId);
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Service-Worker-Allowed', '/');
    res.send(src);
  });
  app.get('/manifest.webmanifest', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'manifest.webmanifest'));
  });
  app.use(
    express.static(DIST, {
      index: false,
      setHeaders: (res, p) => {
        if (p.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );
  app.get(/.*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(DIST, 'index.html'));
  });
}
