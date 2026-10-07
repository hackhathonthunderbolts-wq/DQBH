import { Router, Request, Response } from 'express';
import { requireRole } from '../middleware/auth';
import { MemoryStore } from '../db/memoryStore';
import { ExtensibleEventPipeline } from '../services/eventPipeline';
import { ExceptionEngine } from '../services/exceptionEngine';
import { LifecycleStateMachine } from '../domain/stateMachine';
import { getTechnicianForUser, skillMatch, availabilityToStatus, activeAssignments, taskFor, serializeTask } from '../services/technicianService';

export const technicianRouter=Router();
const store=MemoryStore.getInstance();
const pipeline=ExtensibleEventPipeline.getInstance();
const technicianOnly=requireRole(['FIELD_TECHNICIAN']);

const actor=(req:Request)=>getTechnicianForUser(req.user?.id,req.user?.name);
const forbidden=(res:Response)=>res.status(403).json({success:false,error:'FORBIDDEN',message:'Technician ownership check failed.'});

technicianRouter.use(technicianOnly);

technicianRouter.get('/me/profile',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const skills=Array.from(store.technicianSkills.values()).filter(s=>s.technicianId===tech.id);
  const certifications=Array.from(store.certifications.values()).filter(c=>c.technicianId===tech.id);
  return res.json({success:true,data:{technician:tech,skills,certifications,shift:store.shifts.get(`shift-${tech.id}`),availability:tech.currentStatus}});
});

technicianRouter.patch('/me/availability',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const availability=req.body?.availability;
  if(!['AVAILABLE','BUSY','OFF_DUTY'].includes(availability))return res.status(400).json({success:false,message:'availability must be AVAILABLE, BUSY or OFF_DUTY.'});
  const previous=tech.currentStatus; tech.currentStatus=availabilityToStatus(availability);
  store.recordAudit('TECHNICIAN',tech.id,'AVAILABILITY_CHANGED',req.user!.id,req.user!.role,{status:previous},{status:tech.currentStatus});
  pipeline.emit('technician:availability_changed',{technicianId:tech.id,availability});
  return res.json({success:true,data:{availability}});
});

technicianRouter.get('/me/dashboard',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const period=String(req.query.period||'today'); const now=Date.now();
  const start=period==='month'?now-30*86400000:period==='week'?now-7*86400000:now-86400000;
  const assignments=Array.from(store.assignments.values()).filter(a=>a.technicianId===tech.id);
  const relevant=assignments.filter(a=>new Date(a.assignedAt).getTime()>=start);
  const counts={assigned:relevant.length,accepted:relevant.filter(a=>a.status==='ACCEPTED').length,inProgress:relevant.filter(a=>store.serviceRequests.get(a.serviceRequestId)?.state==='IN_PROGRESS').length,completed:relevant.filter(a=>a.status==='COMPLETED').length,verified:relevant.filter(a=>store.serviceRequests.get(a.serviceRequestId)?.state==='COMPLETED').length,declinedDropped:relevant.filter(a=>['DECLINED','DROPOUT'].includes(a.status)).length};
  const completed=relevant.filter(a=>a.status==='COMPLETED'); const completion=counts.assigned?Math.round(counts.completed/counts.assigned*100):0;
  const onTime=completed.filter(a=>{const r=store.serviceRequests.get(a.serviceRequestId);return r&&r.workCompletedAt&&new Date(r.workCompletedAt).getTime()<=new Date(r.slaDueAt).getTime();}).length;
  const avg=completed.length?Math.round(completed.reduce((sum,a)=>{const r=store.serviceRequests.get(a.serviceRequestId)!;return sum+(r.workStartedAt&&r.workCompletedAt?new Date(r.workCompletedAt).getTime()-new Date(r.workStartedAt).getTime():0)},0)/completed.length/60000):0;
  const workload=activeAssignments(tech.id).length;
  return res.json({success:true,data:{period,counts,completionPercentage:completion,avgCompletionMinutes:avg,onTimePercentage:completed.length?Math.round(onTime/completed.length*100):100,series:Array.from({length:7},(_,i)=>({date:new Date(now-(6-i)*86400000).toISOString().slice(0,10),completed: i===6?counts.completed:0})),workload,maxDailyJobs:store.shifts.get(`shift-${tech.id}`)?.maxDailyJobs||4,rating:tech.serviceRating,jobsCompletedThisMonth:tech.totalCompletedJobs,firstTimeFixRate:94,badges:Array.from(store.technicianBadges.values()).filter(b=>b.technicianId===tech.id).map(b=>store.badges.get(b.badgeId)).filter(Boolean)}});
});

technicianRouter.get('/me/tasks',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  let rows=Array.from(store.assignments.values()).filter(a=>a.technicianId===tech.id);
  if(req.query.status) rows=rows.filter(a=>a.status===String(req.query.status)|| (String(req.query.status)==='PROPOSED'&&a.status==='PENDING'));
  const data=rows.map(a=>store.serviceRequests.get(a.serviceRequestId)).filter(Boolean).map(r=>{const a=rows.find(x=>x.serviceRequestId===r!.id)!;return serializeTask(tech.id,r!,a);});
  if(req.query.priority)data.splice(0,data.length,...data.filter((r:any)=>r.priority===String(req.query.priority)));
  data.sort((a:any,b:any)=>({EMERGENCY:0,HIGH:1,MEDIUM:2,LOW:3}[a.priority]-({EMERGENCY:0,HIGH:1,MEDIUM:2,LOW:3}[b.priority])||a.slaRemainingMs-b.slaRemainingMs));
  return res.json({success:true,count:data.length,data});
});

technicianRouter.get('/me/tasks/:id',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const {assignment,request}=taskFor(tech.id,req.params.id); if(!assignment||!request)return forbidden(res);
  const machine=store.machines.get(request.machineId),site=store.sites.get(request.siteId);
  const history=Array.from(store.serviceRequests.values()).filter(r=>r.machineId===request.machineId&&r.id!==request.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
  const parts=Array.from(store.partReservations.values()).filter(p=>p.serviceRequestId===request.id).map(p=>({...p,part:store.spareParts.get(p.sparePartId)}));
  return res.json({success:true,data:{...serializeTask(tech.id,request,assignment),machine,site,history,parts,logs:Array.from(store.taskLogs.values()).filter(l=>l.serviceRequestId===request.id),documents:Array.from(store.documents.values()).filter(d=>d.serviceRequestId===request.id),checklist:Array.from(store.checklists.values()).filter(c=>c.requestId===request.id)}});
});

technicianRouter.post('/assignments/:id/accept',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const a=store.assignments.get(req.params.id); if(!a||a.technicianId!==tech.id)return forbidden(res);
  if(a.status!=='PENDING')return res.status(400).json({success:false,message:'Only proposed assignments can be accepted.'});
  a.status='ACCEPTED'; a.acknowledgedAt=new Date().toISOString();
  store.recordAudit('ASSIGNMENT',a.id,'ACCEPTED',tech.id,req.user!.role,{status:'PENDING'},{status:a.status}); pipeline.emit('technician:assignment_accepted',{assignment:a});
  return res.json({success:true,data:a});
});

technicianRouter.post('/assignments/:id/decline',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const a=store.assignments.get(req.params.id); if(!a||a.technicianId!==tech.id)return forbidden(res);
  const reason=String(req.body?.reason||''); if(!reason)return res.status(400).json({success:false,message:'Decline reason is required.'});
  a.status='DECLINED'; (a as any).declineReason=reason; (a as any).declineNote=req.body?.note||undefined;
  store.recordAudit('ASSIGNMENT',a.id,'DECLINED',tech.id,req.user!.role,undefined,{status:a.status,reason}); pipeline.emit('technician:assignment_declined',{assignment:a});
  return res.json({success:true,data:a});
});

technicianRouter.post('/assignments/:id/dropout',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const a=store.assignments.get(req.params.id); if(!a||a.technicianId!==tech.id)return forbidden(res);
  const reason=String(req.body?.reason||''); if(!reason)return res.status(400).json({success:false,message:'Dropout reason is required.'});
  const result=new ExceptionEngine().handleTechnicianDropout(a.serviceRequestId,tech.id,reason); a.status='DROPOUT';
  store.recordAudit('ASSIGNMENT',a.id,'DROPOUT',tech.id,req.user!.role,{status:'ACCEPTED'},{status:a.status,reason}); pipeline.emit('technician:dropout',{assignment:a,exception:result.exception});
  return res.json({success:result.success,data:{assignment:a,exception:result.exception,message:result.message}});
});

technicianRouter.post('/requests/:id/start',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const {assignment,request}=taskFor(tech.id,req.params.id); if(!assignment||!request)return forbidden(res);
  const check=LifecycleStateMachine.canTransition(request.state,'IN_PROGRESS','FIELD_TECHNICIAN'); if(!check.allowed)return res.status(400).json({success:false,message:check.reason});
  request.state='IN_PROGRESS'; request.workStartedAt=new Date().toISOString(); assignment.startedAt=request.workStartedAt; tech.currentStatus='ON_JOB';
  store.recordAudit('SERVICE_REQUEST',request.id,'TECHNICIAN_STARTED',tech.id,req.user!.role,{state:'ASSIGNED'},{state:request.state}); pipeline.emit('technician:task_started',{request,assignment});
  return res.json({success:true,data:request});
});

technicianRouter.post('/requests/:id/logs',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const {assignment,request}=taskFor(tech.id,req.params.id); if(!assignment||!request)return forbidden(res);
  const type=req.body?.type,note=String(req.body?.note||'');
  if(!['WORK_NOTE','STATUS_UPDATE','ISSUE'].includes(type)||!note)return res.status(400).json({success:false,message:'Valid type and note are required.'});
  const log={id:`log-${Date.now()}`,serviceRequestId:request.id,assignmentId:assignment.id,technicianId:tech.id,type,note,createdAt:new Date().toISOString()};
  store.taskLogs.set(log.id,log); store.recordAudit('SERVICE_REQUEST',request.id,'TECHNICIAN_LOG_ADDED',tech.id,req.user!.role,undefined,log); pipeline.emit('technician:task_log',{log});
  return res.status(201).json({success:true,data:log});
});

technicianRouter.post('/requests/:id/documents',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const {assignment,request}=taskFor(tech.id,req.params.id); if(!assignment||!request)return forbidden(res);
  const type=req.body?.type,mimeType=String(req.body?.mimeType||''),sizeBytes=Number(req.body?.sizeBytes||0),url=String(req.body?.url||'');
  if(!['BEFORE_PHOTO','AFTER_PHOTO','SERVICE_REPORT'].includes(type)||!url||sizeBytes>10*1024*1024)return res.status(400).json({success:false,message:'Valid document type, URL and max 10MB size are required.'});
  const doc={id:`doc-${Date.now()}`,serviceRequestId:request.id,technicianId:tech.id,type,mimeType,sizeBytes,url,createdAt:new Date().toISOString()};
  store.documents.set(doc.id,doc); store.recordAudit('SERVICE_REQUEST',request.id,'DOCUMENT_UPLOADED',tech.id,req.user!.role,undefined,{documentId:doc.id,type}); pipeline.emit('technician:document_uploaded',{document:doc});
  return res.status(201).json({success:true,data:doc});
});

technicianRouter.post('/requests/:id/complete',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const {assignment,request}=taskFor(tech.id,req.params.id); if(!assignment||!request)return forbidden(res);
  const checklist=Array.isArray(req.body?.checklist)?req.body.checklist:[];
  const after=Array.from(store.documents.values()).some(d=>d.serviceRequestId===request.id&&d.technicianId===tech.id&&d.type==='AFTER_PHOTO');
  if(!after)return res.status(400).json({success:false,message:'Completion blocked: at least one AFTER photo is required.'});
  if(!checklist.length||checklist.some((x:any)=>!x.isDone))return res.status(400).json({success:false,message:'Completion blocked: all checklist items must be completed.'});
  const check=LifecycleStateMachine.canTransition(request.state,'VERIFICATION_PENDING','FIELD_TECHNICIAN'); if(!check.allowed)return res.status(400).json({success:false,message:check.reason});
  request.state='VERIFICATION_PENDING'; request.workCompletedAt=new Date().toISOString(); assignment.endedAt=request.workCompletedAt;
  checklist.forEach((x:any,i:number)=>store.checklists.set(x.id||`check-${request.id}-${i}`,{id:x.id||`check-${request.id}-${i}`,checklistItemId:x.checklistItemId||x.id||`item-${i}`,requestId:request.id,isDone:true}));
  store.recordAudit('SERVICE_REQUEST',request.id,'TECHNICIAN_COMPLETED',tech.id,req.user!.role,{state:'IN_PROGRESS'},{state:request.state}); pipeline.emit('technician:task_completed',{request,assignment});
  return res.json({success:true,data:{request,status:'AWAITING_VERIFICATION'}});
});

technicianRouter.post('/requests/:id/problem',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const {assignment,request}=taskFor(tech.id,req.params.id); if(!assignment||!request)return forbidden(res);
  const type=String(req.body?.type||''); if(!['PART_MISSING','MACHINE_INACCESSIBLE','NEED_EXTRA_HELP','SAFETY_ISSUE'].includes(type))return res.status(400).json({success:false,message:'Invalid problem type.'});
  const reason=String(req.body?.note||type); const exceptionId=`exc-${Date.now()}`;
  store.exceptionLogs.set(exceptionId,{id:exceptionId,serviceRequestId:request.id,assignmentId:assignment.id,exceptionType:type==='PART_MISSING'?'PARTS_STOCKOUT':type==='MACHINE_INACCESSIBLE'?'EQUIPMENT_UNREACHABLE':'HAZARD_SAFETY_HOLD',severity:'CRITICAL',reason,autoRerouted:false,isResolved:false,createdAt:new Date().toISOString()});
  const log={id:`log-${Date.now()}`,serviceRequestId:request.id,assignmentId:assignment.id,technicianId:tech.id,type:'ISSUE' as const,note:reason,createdAt:new Date().toISOString()}; store.taskLogs.set(log.id,log);
  request.exceptionFlagged=true; request.activeExceptionCount+=1; store.recordAudit('SERVICE_REQUEST',request.id,'PROBLEM_REPORTED',tech.id,req.user!.role,undefined,{type,reason}); pipeline.emit('technician:problem',{request,exceptionId,type});
  return res.status(201).json({success:true,data:{exceptionId,log}});
});

technicianRouter.get('/me/notifications',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const data=Array.from(store.notifications.values()).filter(n=>n.technicianId===tech.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return res.json({success:true,data});
});

technicianRouter.patch('/notifications/:id/read',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const n=store.notifications.get(req.params.id); if(!n||n.technicianId!==tech.id)return forbidden(res);
  n.readAt=new Date().toISOString(); store.recordAudit('NOTIFICATION',n.id,'MARKED_READ',tech.id,req.user!.role);
  return res.json({success:true,data:n});
});

technicianRouter.post('/requests/:id/checkin',(req,res)=>{
  const tech=actor(req); if(!tech)return res.status(404).json({success:false,message:'Technician profile not found.'});
  const {assignment,request}=taskFor(tech.id,req.params.id); if(!assignment||!request)return forbidden(res);
  const machine=store.machines.get(request.machineId); const {machineCode,lat,lng}=req.body||{};
  if(!machine||machineCode!==machine.assetTag||typeof lat!=='number'||typeof lng!=='number')return res.status(400).json({success:false,message:'Machine code or geolocation is invalid.'});
  const checkIn={id:`checkin-${Date.now()}`,requestId:request.id,technicianId:tech.id,machineCode,lat,lng,at:new Date().toISOString()}; store.checkInRecords.set(checkIn.id,checkIn);
  store.recordAudit('SERVICE_REQUEST',request.id,'ARRIVED_ON_SITE',tech.id,req.user!.role,undefined,checkIn); pipeline.emit('technician:checkin',{checkIn});
  return res.status(201).json({success:true,data:checkIn});
});
