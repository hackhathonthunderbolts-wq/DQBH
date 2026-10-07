// ====================================================================
// DQBH INDUSTRIAL PLATFORM - EXCEPTION & SLA RECOVERY ENGINE
// Handles sudden technician dropouts, stockouts, SLA breaches & auto-reassignment
// ====================================================================

import { MemoryStore } from '../db/memoryStore';
import { ExceptionLog, ExceptionType, ExceptionSeverity, ServiceRequest } from '../domain/types';
import { RoutingEngine } from './routingEngine';

export class ExceptionEngine {
  private store = MemoryStore.getInstance();
  private routingEngine = new RoutingEngine();

  /**
   * Triggers a sudden technician dropout and executes automated re-routing cascade
   */
  public handleTechnicianDropout(
    serviceRequestId: string, 
    technicianId: string, 
    reason: string
  ): { success: boolean; exception: ExceptionLog; newTechnicianName?: string; message: string } {
    const request = this.store.serviceRequests.get(serviceRequestId);
    const tech = this.store.technicians.get(technicianId);

    if (!request) {
      return { 
        success: false, 
        exception: {} as ExceptionLog, 
        message: `Service request ${serviceRequestId} not found.` 
      };
    }

    // 1. Release dropped technician
    if (tech) {
      tech.activeJobCount = Math.max(0, tech.activeJobCount - 1);
      tech.currentStatus = 'AVAILABLE';
    }

    // 2. Clear assigned technician from request
    const prevTechId = request.assignedTechnicianId;
    request.assignedTechnicianId = undefined;
    request.assignedTechnicianName = undefined;
    request.exceptionFlagged = true;
    request.activeExceptionCount += 1;

    // 3. Attempt automated re-routing to next best candidate
    const rankedCandidates = this.routingEngine.matchTechniciansForRequest(request);
    const replacementMatch = rankedCandidates.find(
      c => c.isEligible && c.technician.id !== prevTechId && c.score > 0
    );

    let autoRerouted = false;
    let replacementTechId: string | undefined;
    let replacementTechName: string | undefined;

    if (replacementMatch) {
      const newTech = replacementMatch.technician;
      request.assignedTechnicianId = newTech.id;
      request.assignedTechnicianName = newTech.fullName;
      request.state = 'ASSIGNED';
      newTech.activeJobCount += 1;
      newTech.currentStatus = 'DISPATCHED';
      autoRerouted = true;
      replacementTechId = newTech.id;
      replacementTechName = newTech.fullName;
    }

    // 4. Create and persist exception log
    const exceptionId = `exc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const exceptionLog: ExceptionLog = {
      id: exceptionId,
      serviceRequestId: request.id,
      exceptionType: 'TECHNICIAN_DROPOUT',
      severity: 'CRITICAL',
      reason: reason || 'Technician reported sudden emergency/dropout on-site',
      autoRerouted,
      previousTechnicianId: prevTechId,
      replacementTechnicianId: replacementTechId,
      isResolved: autoRerouted,
      resolvedAt: autoRerouted ? new Date().toISOString() : undefined,
      resolutionNotes: autoRerouted 
        ? `Auto-rerouted to ${replacementTechName} with match score ${replacementMatch?.score}/100.` 
        : 'Pending manual dispatcher intervention.',
      createdAt: new Date().toISOString()
    };

    this.store.exceptionLogs.set(exceptionLog.id, exceptionLog);

    // 5. Immutable Audit Trail Entry
    this.store.recordAudit(
      'SERVICE_REQUEST',
      request.id,
      'EXCEPTION_TECHNICIAN_DROPOUT',
      'EXCEPTION_ENGINE',
      'SYSTEM_ADMIN',
      { previousTechnicianId: prevTechId },
      { autoRerouted, replacementTechnicianId: replacementTechId, reason }
    );

    return {
      success: true,
      exception: exceptionLog,
      newTechnicianName: replacementTechName,
      message: autoRerouted
        ? `Dropout handled: Ticket automatically re-routed to ${replacementTechName}.`
        : `Dropout recorded: No replacement available. Manual dispatcher escalation required.`
    };
  }

  /**
   * Scans all active service requests and flags SLA breaches
   */
  public evaluateSlaBreaches(): ServiceRequest[] {
    const now = new Date();
    const breachedRequests: ServiceRequest[] = [];

    this.store.serviceRequests.forEach((req) => {
      if (['COMPLETED', 'REJECTED', 'CANCELLED'].includes(req.state)) return;

      const dueDate = new Date(req.slaDueAt);
      if (now > dueDate && !req.slaBreached) {
        req.slaBreached = true;
        req.exceptionFlagged = true;
        req.activeExceptionCount += 1;
        breachedRequests.push(req);

        // Record SLA breach exception
        const excId = `sla-${req.id}-${Date.now()}`;
        this.store.exceptionLogs.set(excId, {
          id: excId,
          serviceRequestId: req.id,
          exceptionType: 'SLA_BREACH',
          severity: 'CRITICAL',
          reason: `Target SLA deadline [${req.slaDueAt}] elapsed while in state [${req.state}].`,
          autoRerouted: false,
          isResolved: false,
          createdAt: now.toISOString()
        });

        this.store.recordAudit(
          'SERVICE_REQUEST',
          req.id,
          'SLA_BREACH_DETECTED',
          'SLA_WATCHDOG',
          'SYSTEM_ADMIN',
          { slaDueAt: req.slaDueAt },
          { breachedAt: now.toISOString(), currentState: req.state }
        );
      }
    });

    return breachedRequests;
  }
}
