import { Router } from 'express';
import fs from 'node:fs';
import { requireRole } from '../../middleware/auth.ts';
import { upload } from '../../middleware/upload.ts';
import { listParams } from '../../utils/listQuery.ts';
import { submitReport,listPublicReports,reportFile,updateReport } from './publicReports.service.ts';
export const publicReportsRouter=Router();
publicReportsRouter.post('/public-reports',upload.single('file'),async(req,res)=>res.json(await submitReport(req.ip||'unknown',req.body,req.file,req.user?.id)));
publicReportsRouter.get('/public-reports',requireRole('gov'),async(req,res)=>res.json(await listPublicReports(listParams(req))));
publicReportsRouter.get('/public-reports/:id/file',requireRole('gov'),async(req,res)=>{
  const f=await reportFile(Number(req.params.id));res.setHeader('Cache-Control','private, no-store');res.type(f.mime);fs.createReadStream(f.path).pipe(res);
});
publicReportsRouter.post('/public-reports/:id/status',requireRole('gov'),async(req,res)=>res.json(await updateReport(Number(req.params.id),req.body)));
