import { MemoryStore } from '../db/memoryStore';
import { Assignment, Availability, TechnicianStatus, ServiceRequest } from '../domain/types';

const store = MemoryStore.getInstance();

export function getTechnicianForUser(userId?: string, userName?: string) {
  return Array.from(store.technicians.values()).find(t => t.id === userId || t.userId === userId || t.fullName === userName?.replace(' (Technician)', '')) || null;
}

export function haversineKm(a:{latitude:number;longitude:number}, b:{latitude:number;longitude:number}) {
  const R=6371, toRad=(v:number)=>v*Math.PI/180;
  const dLat=toRad(b.latitude-a.latitude), dLng=toRad(b.longitude-a.longitude);
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

export function skillMatch(techId:string, required:string[]) {
  const skills=Array.from(store.technicianSkills.values()).filter(s=>s.technicianId===techId);
  const certs=store.technicians.get(techId)?.certifications || [];
  const matched=required.filter(skill=>skills.some(s=>s.skill===skill)||certs.includes(skill));
  return { matched, rate: required.length ? Math.round(matched.length/required.length*100) : 100 };
}

export function availabilityToStatus(a:Availability):TechnicianStatus {
  if(a==='AVAILABLE') return 'AVAILABLE';
  if(a==='BUSY') return 'ON_JOB';
  return 'OFFLINE';
}

export function activeAssignments(techId:string) {
  return Array.from(store.assignments.values()).filter(a=>a.technicianId===techId && ['PENDING','ACCEPTED'].includes(a.status));
}

export function taskFor(techId:string, requestId:string) {
  const assignment=Array.from(store.assignments.values()).find(a=>a.technicianId===techId && a.serviceRequestId===requestId);
  const request=store.serviceRequests.get(requestId);
  return {assignment,request};
}

export function serializeTask(techId:string, request:ServiceRequest, assignment?:Assignment) {
  const tech=store.technicians.get(techId)!;
  const site=store.sites.get(request.siteId)!;
  const machine=store.machines.get(request.machineId)!;
  const match=skillMatch(techId,request.requiredSkills);
  return {...request, assignment, site, machine, slaRemainingMs:Math.max(0,new Date(request.slaDueAt).getTime()-Date.now()), distanceKm:haversineKm(tech.currentLocation,site.location), skillMatch:match};
}
