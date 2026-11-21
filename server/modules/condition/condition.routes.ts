import { Router } from 'express';
import fs from 'node:fs';
import { requireRole } from '../../middleware/auth.ts';
import { upload } from '../../middleware/upload.ts';
import { str } from '../../utils/http.ts';
import { assessVisit } from '../ai/damage.service.ts';
import { photos, savePhoto, photoFile, review } from './condition.service.ts';
export const conditionRouter=Router();
conditionRouter.get('/visits/:id/condition',requireRole('driver','staff','operator','gov'),async(req,res)=>res.json(await photos(String(req.params.id),req.user!)));
conditionRouter.post('/visits/:id/condition',requireRole('staff','operator'),upload.single('file'),async(req,res)=>{
  const r=await savePhoto(String(req.params.id),req.user!,str(req.body?.stage,20),str(req.body?.angle,20),req.file);
  if(str(req.body?.stage,20)==='handoff') await assessVisit(String(req.params.id)).catch(()=>null);
  res.json(r);
});
conditionRouter.get('/condition-photos/:id/file',requireRole('driver','staff','operator','gov'),async(req,res)=>{
  const f=await photoFile(Number(req.params.id),req.user!);
  res.setHeader('Cache-Control','private, no-store');res.type(f.mime);fs.createReadStream(f.path).pipe(res);
});
conditionRouter.post('/visits/:id/condition-review',requireRole('driver'),async(req,res)=>res.json(await review(String(req.params.id),req.user!,req.body)));
