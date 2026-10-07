// ====================================================================
// DQBH INDUSTRIAL PLATFORM - SERVICE REQUESTS ROUTER
// End-to-end lifecycle, dispatch, work logging, verification & exceptions
// ====================================================================

import { Router, Request, Response } from 'express';
import { MemoryStore } from '../db/memoryStore';
import { ValidationEngine } from '../services/validationEngine';
import { RoutingEngine } from '../services/routingEngine';
import { ExceptionEngine } from '../services/exceptionEngine';
import { ExtensibleEventPipeline } from '../services/eventPipeline';
import { LifecycleStateMachine } from '../domain/stateMachine';
import { ServiceRequest, ServiceRequestState, WorkLog } from '../domain/types';

export const serviceRequestsRouter = Router();
const store = MemoryStore.getInstance();
const validationEngine = new ValidationEngine();
const routingEngine = new RoutingEngine();
const exceptionEngine = new ExceptionEngine();
const eventPipeline = ExtensibleEventPipeline.getInstance();

// GET all service requests
serviceRequestsRouter.get('/', (req: Request, res: Response) => {
  const { state, priority, siteId, technicianId } = req.query;
  let requests = Array.from(store.serviceRequests.values());

  if (state) requests = requests.filter(r => r.state === state);
  if (priority) requests = requests.filter(r => r.priority === priority);
  if (siteId) requests = requests.filter(r => r.siteId === siteId);
  if (technicianId) requests = requests.filter(r => r.assignedTechnicianId === technicianId);

  // Sort by createdAt descending
  requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ success: true, count: requests.length, data: requests });
});

// GET single request by ID
serviceRequestsRouter.get('/:id', (req: Request, res: Response) => {
  const request = store.serviceRequests.get(req.params.id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Service request not found.' });
  }

  const machine = store.machines.get(request.machineId);
  const site = store.sites.get(request.siteId);
  const technician = request.assignedTechnicianId ? store.technicians.get(request.assignedTechnicianId) : undefined;
  const workLog = Array.from(store.workLogs.values()).find(w => w.serviceRequestId === request.id);
  const exceptions = Array.from(store.exceptionLogs.values()).filter(e => e.serviceRequestId === request.id);
  const candidateScores = routingEngine.matchTechniciansForRequest(request);

  res.json({
    success: true,
    data: {
      ...request,
      machine,
      site,
      technician,
      workLog,
      exceptions,
      rankedCandidates: candidateScores
    }
  });
});

// POST create service request
serviceRequestsRouter.post('/', (req: Request, res: Response) => {
  const { machineId, siteId, title, description, priority, requiredSkills, requestedPartIds } = req.body;

  if (!machineId || !siteId || !title || !description) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters: machineId, siteId, title, and description are mandatory.'
    });
  }

  const reqPriority = priority || 'MEDIUM';
  const skills = Array.isArray(requiredSkills) ? requiredSkills : [];
  
  // Run Validation & Eligibility Engine
  const validationResult = validationEngine.validateRequest(machineId, siteId, reqPriority, skills, requestedPartIds);

  const ticketNumber = `SR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const slaDueAt = new Date(Date.now() + validationResult.calculatedSlaHours * 3600000).toISOString();

  const newRequest: ServiceRequest = {
    id: `req-${Date.now()}`,
    ticketNumber,
    machineId,
    siteId,
    requesterName: req.user?.name || 'Site Operations Manager',
    requesterRole: req.user?.role || 'OPERATIONS_MANAGER',
    title,
    description,
    priority: reqPriority,
    state: validationResult.passed ? 'VALIDATED' : 'SUBMITTED',
    requiredSkills: skills,
    estimatedDurationMinutes: 120,
    slaDueAt,
    slaBreached: false,
    validationStatus: validationResult,
    exceptionFlagged: false,
    activeExceptionCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.serviceRequests.set(newRequest.id, newRequest);

  // Reserve parts if validation passed
  if (validationResult.passed && Array.isArray(requestedPartIds) && requestedPartIds.length > 0) {
    validationEngine.reservePartsForRequest(newRequest.id, requestedPartIds);
  }

  // Record audit block
  store.recordAudit(
    'SERVICE_REQUEST',
    newRequest.id,
    'REQUEST_CREATED',
    req.user?.id || 'SYSTEM',
    req.user?.role || 'OPERATIONS_MANAGER',
    undefined,
    { ticketNumber, state: newRequest.state, validationPassed: validationResult.passed }
  );

  res.status(201).json({ success: true, data: newRequest });
});

// POST dispatch technician
serviceRequestsRouter.post('/:id/dispatch', (req: Request, res: Response) => {
  const result = routingEngine.autoDispatch(req.params.id);
  if (!result.success) {
    return res.status(400).json({ success: false, message: result.message });
  }

  const updatedRequest = store.serviceRequests.get(req.params.id);
  res.json({ success: true, message: result.message, data: updatedRequest, matchScore: result.matchScore });
});

// POST transition lifecycle state
serviceRequestsRouter.post('/:id/transition', (req: Request, res: Response) => {
  const { targetState } = req.body;
  const request = store.serviceRequests.get(req.params.id);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Service request not found.' });
  }

  const check = LifecycleStateMachine.canTransition(request.state, targetState as ServiceRequestState, req.user?.role);
  if (!check.allowed) {
    return res.status(400).json({ success: false, message: check.reason });
  }

  const prevState = request.state;
  request.state = targetState;
  request.updatedAt = new Date().toISOString();

  if (targetState === 'IN_PROGRESS' && !request.workStartedAt) {
    request.workStartedAt = new Date().toISOString();
  }

  store.recordAudit(
    'SERVICE_REQUEST',
    request.id,
    'STATE_TRANSITION',
    req.user?.id || 'SYSTEM',
    req.user?.role || 'OPERATIONS_MANAGER',
    { from: prevState },
    { to: targetState }
  );

  res.json({ success: true, message: `Transitioned from ${prevState} to ${targetState}`, data: request });
});

// POST submit work log and photo evidence
serviceRequestsRouter.post('/:id/work-log', (req: Request, res: Response) => {
  const { tasksPerformed, diagnosticSummary, workDurationMinutes, photoEvidenceUrls, partsReplaced, digitalSignatureData, signerName } = req.body;
  const request = store.serviceRequests.get(req.params.id);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Service request not found.' });
  }

  const workLog: WorkLog = {
    id: `wlog-${Date.now()}`,
    serviceRequestId: request.id,
    technicianId: request.assignedTechnicianId || 'tech-unknown',
    technicianName: request.assignedTechnicianName || 'Field Technician',
    tasksPerformed: Array.isArray(tasksPerformed) ? tasksPerformed : ['Diagnostic check', 'Component inspection'],
    diagnosticSummary: diagnosticSummary || 'Completed on-site maintenance checklist and tested operating parameters.',
    workDurationMinutes: Number(workDurationMinutes) || 90,
    partsReplaced: Array.isArray(partsReplaced) ? partsReplaced : [],
    photoEvidenceUrls: Array.isArray(photoEvidenceUrls) ? photoEvidenceUrls : ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'],
    documentAttachmentUrls: [],
    digitalSignatureData: digitalSignatureData || 'SIG_VALIDATED_SHA256',
    signerName: signerName || request.assignedTechnicianName || 'Field Technician',
    signerRole: 'FIELD_TECHNICIAN',
    createdAt: new Date().toISOString()
  };

  store.workLogs.set(workLog.id, workLog);

  // Transition request to VERIFICATION_PENDING
  request.state = 'VERIFICATION_PENDING';
  request.workCompletedAt = new Date().toISOString();
  request.updatedAt = new Date().toISOString();

  store.recordAudit(
    'SERVICE_REQUEST',
    request.id,
    'WORK_LOG_SUBMITTED',
    req.user?.id || 'FIELD_TECHNICIAN',
    'FIELD_TECHNICIAN',
    { state: 'IN_PROGRESS' },
    { state: 'VERIFICATION_PENDING', workLogId: workLog.id }
  );

  res.status(201).json({ success: true, message: 'Work log submitted. Ready for manager verification.', data: workLog });
});

// POST manager verification & completion seal
serviceRequestsRouter.post('/:id/verify', async (req: Request, res: Response) => {
  const { approved, notes } = req.body;
  const request = store.serviceRequests.get(req.params.id);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Service request not found.' });
  }

  if (request.state !== 'VERIFICATION_PENDING') {
    return res.status(400).json({ success: false, message: 'Only requests in VERIFICATION_PENDING state can be verified.' });
  }

  const workLog = Array.from(store.workLogs.values()).find(w => w.serviceRequestId === request.id);

  if (approved) {
    request.state = 'COMPLETED';
    request.verifiedAt = new Date().toISOString();
    request.verifiedBy = req.user?.name || 'Operations Manager';
    request.updatedAt = new Date().toISOString();

    // Release technician capacity
    if (request.assignedTechnicianId) {
      const tech = store.technicians.get(request.assignedTechnicianId);
      if (tech) {
        tech.activeJobCount = Math.max(0, tech.activeJobCount - 1);
        tech.currentStatus = 'AVAILABLE';
        tech.totalCompletedJobs += 1;
      }
    }

    // Trigger Blockchain Seal Hook
    if (workLog) {
      await eventPipeline.sealCompletion(request, workLog);
    }

    res.json({
      success: true,
      message: 'Service completion verified and cryptographically sealed on immutable audit trail.',
      data: request
    });
  } else {
    request.state = 'IN_PROGRESS';
    request.updatedAt = new Date().toISOString();

    store.recordAudit(
      'SERVICE_REQUEST',
      request.id,
      'VERIFICATION_REJECTED',
      req.user?.id || 'OPERATIONS_MANAGER',
      'OPERATIONS_MANAGER',
      { state: 'VERIFICATION_PENDING' },
      { state: 'IN_PROGRESS', rejectionNotes: notes }
    );

    res.json({ success: true, message: 'Verification rejected. Request sent back for revisions.', data: request });
  }
});

// POST trigger dropout / exception
serviceRequestsRouter.post('/:id/exception', (req: Request, res: Response) => {
  const { technicianId, reason } = req.body;
  const request = store.serviceRequests.get(req.params.id);

  if (!request) {
    return res.status(404).json({ success: false, message: 'Service request not found.' });
  }

  const techId = technicianId || request.assignedTechnicianId;
  if (!techId) {
    return res.status(400).json({ success: false, message: 'No assigned technician to drop out.' });
  }

  const result = exceptionEngine.handleTechnicianDropout(request.id, techId, reason);
  res.json({ success: result.success, message: result.message, exception: result.exception, request: store.serviceRequests.get(req.params.id) });
});
