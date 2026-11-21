import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repository root (server/config → ../..). */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** All environment-driven settings in one place. Read once at boot. */
export const env = {
  port: Number(process.env.PORT || 8080),
  isProd: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL || 'postgres://vallet@localhost:5433/vallet',
  pgSsl: process.env.PGSSL === 'true',
  jwtSecret: process.env.JWT_SECRET || '',
  uploadDir: process.env.UPLOAD_DIR || path.join(ROOT, '.data', 'uploads'),
  distDir: path.join(ROOT, 'dist'),
  buildId: process.env.RAILWAY_DEPLOYMENT_ID || String(Date.now()),
  licenseFeeJod: Number(process.env.LICENSE_FEE_JOD || 500),
  fineDefaultJod: Number(process.env.FINE_DEFAULT_JOD || 1000),
  /** External integrations: unset URL → clearly labelled stub provider. */
  ai: { visionProvider: process.env.AI_VISION_PROVIDER || '', visionKey: process.env.AI_VISION_KEY || '', assistantProvider: process.env.ASSISTANT_PROVIDER || '', assistantKey: process.env.ASSISTANT_LLM_KEY || '' },
  integrations: {
    vehicleUrl: process.env.VEHICLE_REGISTRY_URL || '',
    vehicleToken: process.env.VEHICLE_REGISTRY_TOKEN || '',
    municipalityUrl: process.env.MUNICIPALITY_API_URL || '',
    municipalityToken: process.env.MUNICIPALITY_API_TOKEN || '',
  },
  sms: {
    provider: (process.env.SMS_PROVIDER || '').toLowerCase(),
    twilioSid: process.env.TWILIO_ACCOUNT_SID,
    twilioToken: process.env.TWILIO_AUTH_TOKEN,
    twilioFrom: process.env.TWILIO_FROM,
    webhookUrl: process.env.SMS_WEBHOOK_URL,
    webhookToken: process.env.SMS_WEBHOOK_TOKEN,
  },
};
