import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { env } from '../config/env.ts';

fs.mkdirSync(env.uploadDir, { recursive: true });

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/** Single-file document upload (PDF/images, 10MB) stored under UPLOAD_DIR with a random name. */
export const upload = multer({
  storage: multer.diskStorage({
    destination: env.uploadDir,
    filename: (_req, _file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.includes(file.mimetype)),
});
