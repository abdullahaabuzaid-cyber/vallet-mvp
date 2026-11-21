// Phased VAL-3 API + browser tests. BASE=... PHASE=1..5 node e2e/expansion.mjs
import { chromium,devices } from 'playwright';
import fs from 'node:fs';
const B=process.env.BASE||'http://localhost:8080',phase=Number(process.env.PHASE||1),prefix=process.env.PREFIX||'val3';
const browser=await chromium.launch(),results=[];
const check=(name,condition)=>{results.push({name,ok:!!condition});console.log(`${condition?'PASS':'FAIL'} ${name}`);if(!condition)throw Error(name);};
const call=async(c,path,data)=>{const r=await c.request[data===undefined?'get':'post'](B+'/api'+path,data===undefined?{}:{data});const j=await r.json();if(!r.ok())throw Error(path+': '+JSON.stringify(j));return j;};
const login=async(name,password)=>{const c=await browser.newContext();await call(c,'/auth/login',{username:name,password});return c;};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
const file={name:'evidence.png',mimeType:'image/png',buffer:png};
let contexts=[];
try {
 const gov=await login('admin','Gov@2026'),op=await login('elite','Operator@2026'),staff=await login('ahmad','Staff@2026'),drv=await browser.newContext(),anon=await browser.newContext();contexts=[gov,op,staff,drv,anon];
 const phone='079'+String(Math.floor(Math.random()*1e7)).padStart(7,'0');
 const otp=await call(drv,'/auth/otp/request',{phone});await call(drv,'/auth/otp/verify',{phone,code:otp.devCode});
 const v=(await call(staff,'/visits/checkin',{plate:'55-'+String(Date.now()).slice(-5),ownerPhone:phone})).visit;
 check('staff created scoped visit',!!v.id);
 const state=await call(drv,'/state');check('driver owns visit',state.visits.some(x=>x.id===v.id));
 const arrival=await call(drv,`/visits/${v.id}/arrival`,{minutes:5});check('arrival ETA persisted',!!arrival.arrival_eta&&!!arrival.return_requested_at);
 const prep=await call(staff,`/visits/${v.id}/prepare`,{});check('staff preparation status',!!prep.preparing_at);
 for(const stage of ['pickup','handoff'])for(const angle of ['front','back','left','right']){
   const r=await staff.request.post(B+`/api/visits/${v.id}/condition`,{multipart:{stage,angle,file}});check(`${stage} ${angle} evidence upload`,r.ok());
 }
 const evidence=await call(drv,`/visits/${v.id}/condition`);check('driver sees all 8 photos',evidence.items.length===8);
 const photo=evidence.items[0].id;
 check('gov photo access',(await gov.request.get(B+`/api/condition-photos/${photo}/file`)).ok());
 check('anonymous photo denied',(await anon.request.get(B+`/api/condition-photos/${photo}/file`)).status()===401);
 const outsider=await login('saffni','Operator@2026');contexts.push(outsider);
 check('other operator evidence denied',(await outsider.request.get(B+`/api/visits/${v.id}/condition`)).status()===403);
 await call(staff,`/visits/${v.id}/ready`,{});
 const review=await call(drv,`/visits/${v.id}/condition-review`,{decision:'disputed',note:'اختبار اعتراض حالة السيارة مع الصور'});check('dispute creates complaint',!!review.complaintId);
 const complaint=(await call(gov,'/complaints?q='+encodeURIComponent('اختبار اعتراض حالة السيارة'))).items.find(c=>c.id===review.complaintId);check('gov receives dispute complaint with visit',complaint?.visitId===v.id);
 const duplicate=await drv.request.post(B+`/api/visits/${v.id}/condition-review`,{data:{decision:'disputed',note:'duplicate'}});check('duplicate dispute rejected',duplicate.status()===400);
 const reportResponse=await anon.request.post(B+'/api/public-reports',{multipart:{note:'اختبار بلاغ موقع فاليه غير مرخص',lat:'31.95',lng:'35.91',file}});const report=await reportResponse.json();check('anonymous report submitted with GPS and photo',reportResponse.ok()&&!!report.id);
 check('public cannot read private reports',(await anon.request.get(B+'/api/public-reports')).status()===401);
 await call(gov,`/public-reports/${report.id}/status`,{status:'assigned',assignedTo:'مفتش اختبار'});
 await call(gov,`/public-reports/${report.id}/status`,{status:'verified',inspectionNote:'تم التحقق ميدانياً — بيانات اختبار'});
 const closed=await call(gov,`/public-reports/${report.id}/status`,{status:'closed',amount:1});check('verified report generates fine and closure order',closed.status==='closed'&&!!closed.invoice_id);
 const list=await call(gov,'/public-reports?status=closed&q='+encodeURIComponent('اختبار بلاغ'));check('public report server filters',list.items.every(x=>x.status==='closed')&&list.total>0);
 const pages=[{c:drv,path:'/driver/status',name:'driver-evidence',mobile:true},{c:staff,path:`/staff/condition?visit=${v.id}`,name:'staff-evidence',mobile:true},{c:op,path:'/operator/requests',name:'operator-queue'},{c:gov,path:'/gov/public-reports',name:'gov-public-reports'}];
 for(const item of pages){const p=await item.c.newPage();if(item.mobile)await p.setViewportSize({width:412,height:915});await p.goto(B+item.path);await p.waitForTimeout(1500);await p.screenshot({path:`shots/${prefix}-${item.name}.png`,fullPage:true});check('browser '+item.name,(await p.locator('#root').innerText()).length>100);await p.close();}
 if(phase>=2){const {phase2}=await import('./phase2.mjs');await phase2({call,check,gov,op,staff,drv,v,B,file,browser,prefix});}
 if(phase>=3){const {phase3}=await import('./phase3.mjs');await phase3({call,check,gov,op,staff,drv,v,B,file,browser,prefix});}
 if(phase>=4){const {phase4}=await import('./phase4.mjs');await phase4({call,check,gov,op,staff,drv,v,B,file,browser,prefix});}
 if(phase>=5){const {phase5}=await import('./phase5.mjs');await phase5({call,check,gov,op,staff,drv,v,B,file,browser,prefix});}
 if(phase>=5){const {phase5}=await import('./phase5.mjs');await phase5({call,check,gov,op,staff,drv,v,B,file,browser,prefix});}
 await call(staff,`/visits/${v.id}/checkout`,{});check('complete eight-angle evidence permits checkout',true);
} catch(e){results.push({name:e.message,ok:false});console.error(e);} finally {
 fs.mkdirSync('shots',{recursive:true});fs.writeFileSync(`shots/${prefix}-phase${phase}.json`,JSON.stringify({base:B,results},null,2));await browser.close();const n=results.filter(r=>r.ok).length;console.log(`${n}/${results.length} passed`);process.exit(n===results.length?0:1);
}
