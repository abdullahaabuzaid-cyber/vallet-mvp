import { env } from './config/env.ts';
import { migrate } from './db/schema.ts';
import { seed } from './db/seed/index.ts';
import { seedExpansion } from './db/seed/expansion.ts';
import { sms } from './modules/sms/sms.service.ts';
import { createApp } from './app.ts';

/** Boot: migrate schema, seed demo data on an empty DB, then listen. */
async function main() {
  await migrate();
  const seeded = await seed(false);
  if (seeded) console.log('[db] seeded demo data');
  await seedExpansion();
  createApp().listen(env.port, '0.0.0.0', () => console.log(`[vallet] listening on :${env.port} (sms=${sms.name})`));
}

main().catch((e) => {
  console.error('fatal', e);
  process.exit(1);
});
