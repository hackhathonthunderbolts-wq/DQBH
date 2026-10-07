// ====================================================================
// DQBH INDUSTRIAL PLATFORM - SERVICE REQUEST STATE MACHINE
// ====================================================================

import { ServiceRequestState } from './types';

export interface TransitionRule {
  from: ServiceRequestState;
  to: ServiceRequestState;
  allowedRoles: string[];
  requiredConditions?: string[];
  description: string;
}

export const VALID_TRANSITIONS: TransitionRule[] = [
  {
    from: 'DRAFT',
    to: 'SUBMITTED',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SITE_SUPERVISOR', 'CLIENT_AUDITOR'],
    description: 'Submit draft service ticket for automated validation and triage.'
  },
  {
    from: 'SUBMITTED',
    to: 'VALIDATED',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SITE_SUPERVISOR'],
    requiredConditions: ['MACHINE_ELIGIBLE', 'PARTS_RESERVED_OR_AVAILABLE'],
    description: 'System or manager confirms machine eligibility and resource readiness.'
  },
  {
    from: 'SUBMITTED',
    to: 'REJECTED',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SITE_SUPERVISOR'],
    description: 'Reject ticket due to warranty breach, duplicate request, or invalid scope.'
  },
  {
    from: 'VALIDATED',
    to: 'ASSIGNED',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER'],
    requiredConditions: ['QUALIFIED_TECHNICIAN_MATCHED'],
    description: 'Technician dispatched and assigned with reserved toolsets and parts.'
  },
  {
    from: 'ASSIGNED',
    to: 'ASSIGNED',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER'],
    description: 'Automated or manual re-routing following technician dropout or SLA escalation.'
  },
  {
    from: 'ASSIGNED',
    to: 'IN_PROGRESS',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'FIELD_TECHNICIAN'],
    description: 'Field technician arrives on-site and initiates diagnostic / repair sequence.'
  },
  {
    from: 'IN_PROGRESS',
    to: 'VERIFICATION_PENDING',
    allowedRoles: ['SYSTEM_ADMIN', 'FIELD_TECHNICIAN'],
    requiredConditions: ['WORK_LOG_ATTACHED', 'PHOTO_EVIDENCE_ATTACHED'],
    description: 'Technician completes on-site tasks, uploads photo proofs and submits for signoff.'
  },
  {
    from: 'VERIFICATION_PENDING',
    to: 'COMPLETED',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SITE_SUPERVISOR'],
    requiredConditions: ['EVIDENCE_VERIFIED', 'AUDIT_SEALED'],
    description: 'Operations manager audits proof, signs completion certificate and seals blockchain audit record.'
  },
  {
    from: 'VERIFICATION_PENDING',
    to: 'IN_PROGRESS',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SITE_SUPERVISOR'],
    description: 'Manager requests additional work, diagnostic re-test, or clearer photo evidence.'
  },
  {
    from: 'DRAFT',
    to: 'CANCELLED',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SITE_SUPERVISOR'],
    description: 'Cancel ticket before submission.'
  },
  {
    from: 'SUBMITTED',
    to: 'CANCELLED',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER', 'SITE_SUPERVISOR'],
    description: 'Cancel submitted ticket.'
  },
  {
    from: 'VALIDATED',
    to: 'CANCELLED',
    allowedRoles: ['SYSTEM_ADMIN', 'OPERATIONS_MANAGER'],
    description: 'Cancel validated ticket before dispatch.'
  }
];

export class LifecycleStateMachine {
  public static canTransition(from: ServiceRequestState, to: ServiceRequestState, userRole?: string): { allowed: boolean; reason?: string } {
    const rule = VALID_TRANSITIONS.find(t => t.from === from && t.to === to);
    
    if (!rule) {
      return {
        allowed: false,
        reason: `Invalid state transition from [${from}] to [${to}]. Permitted targets are: ${this.getAllowedTransitions(from).join(', ') || 'None (Terminal state)'}`
      };
    }

    if (userRole && !rule.allowedRoles.includes(userRole) && userRole !== 'SYSTEM_ADMIN') {
      return {
        allowed: false,
        reason: `Role '${userRole}' is not authorized to transition request from [${from}] to [${to}]. Required: ${rule.allowedRoles.join(', ')}`
      };
    }

    return { allowed: true };
  }

  public static getAllowedTransitions(from: ServiceRequestState): ServiceRequestState[] {
    return VALID_TRANSITIONS.filter(t => t.from === from).map(t => t.to);
  }
}
