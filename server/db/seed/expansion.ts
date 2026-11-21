import bcrypt from 'bcryptjs';
import { q, q1 } from '../pool.ts';
import { DEMO_PASSWORDS } from './demoAccounts.ts';
/** Additive demo rows for VAL-3 features. Idempotent: only fills what is missing, never edits existing data. */
export async function seedExpansion() {
  if (!(await q1(`select 1 from users where username='inspector'`))) {
    await q(`insert into users(role,username,password_hash,name,authority_id) values('inspector','inspector',$1,'سامر حداد','auth-amman') on conflict (username) do nothing`,
      [bcrypt.hashSync(DEMO_PASSWORDS.inspector, 10)]);
  }
  if (!(await q1(`select 1 from pricing_rules limit 1`))) {
    await q(`insert into pricing_rules(operator_id,site_id,name,days,start_hour,end_hour,fee) values
      ('op-1',null,'السعر الأساسي','0123456',0,24,2),
      ('op-1',null,'ذروة نهاية الأسبوع','45',18,24,3.5),
      ('op-5',null,'السعر الأساسي','0123456',0,24,1.5)`);
  }
  if (!(await q1(`select 1 from contracts limit 1`))) {
    await q(`insert into contracts(operator_id,venue,venue_type,site_id,monthly_fee,per_visit_fee) values
      ('op-1','مطعم الشام','restaurant','site-1',250,0.5), ('op-1','فندق رويال','hotel','site-2',600,0)`);
  }
}
