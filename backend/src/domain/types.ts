// ====================================================================
// DQBH INDUSTRIAL PLATFORM - CORE DOMAIN TYPES & INTERFACES
// ====================================================================

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type ServiceRequestState = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'VALIDATED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'VERIFICATION_PENDING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type TechnicianStatus = 'AVAILABLE' | 'DISPATCHED' | 'ON_JOB' | 'RESTING' | 'OFFLINE';

export type AssignmentStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'DROPOUT' | 'COMPLETED';

export type ExceptionType = 
  | 'TECHNICIAN_DROPOUT'
  | 'PARTS_STOCKOUT'
  | 'SLA_BREACH'
  | 'HAZARD_SAFETY_HOLD'
  | 'ACCESS_DENIED'
  | 'EQUIPMENT_UNREACHABLE';

export type ExceptionSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type UserRole = 
  | 'SYSTEM_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'SITE_SUPERVISOR'
  | 'FIELD_TECHNICIAN'
  | 'CLIENT_AUDITOR';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface Site {
  id: string;
  code: string;
  name: string;
  clientName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  location: GeoLocation;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  operatingHours: string;
  createdAt: string;
}

export interface Machine {
  id: string;
  siteId: string;
  serialNumber: string;
  assetTag: string;
  modelName: string;
  manufacturer: string;
  category: string;
  criticalityTier: number; // 1 to 5
  installationDate: string;
  warrantyExpirationDate?: string;
  slaResponseHoursDefault: number;
  operatingHoursTotal: number;
  healthScore: number;
  telemetryConnected: boolean;
  lastServiceDate?: string;
  nextScheduledServiceDate?: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'OUT_OF_SERVICE';
  specifications: Record<string, any>;
}

export interface Technician {
  id: string;
  userId?: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  currentStatus: TechnicianStatus;
  currentLocation: GeoLocation;
  lastLocationPing: string;
  certifications: string[];
  activeJobCount: number;
  maxConcurrentJobs: number;
  serviceRating: number;
  totalCompletedJobs: number;
}

export interface SparePart {
  id: string;
  siteId?: string;
  partNumber: string;
  name: string;
  category: string;
  compatibleModels: string[];
  stockQuantity: number;
  reservedQuantity: number;
  minimumThreshold: number;
  unitCostCents: number;
  binLocation?: string;
}

export interface PartReservation {
  id: string;
  serviceRequestId: string;
  sparePartId: string;
  partName: string;
  quantityRequested: number;
  quantityConsumed: number;
  isReleased: boolean;
}

export interface ServiceRequest {
  id: string;
  ticketNumber: string;
  machineId: string;
  siteId: string;
  requesterName: string;
  requesterRole: string;
  title: string;
  description: string;
  priority: RequestPriority;
  state: ServiceRequestState;
  requiredSkills: string[];
  estimatedDurationMinutes: number;
  slaDueAt: string;
  slaBreached: boolean;
  validationStatus: {
    passed: boolean;
    machineEligible: boolean;
    partsAvailable: boolean;
    skillsSatisfiable: boolean;
    rulesChecked: string[];
    details: string;
  };
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  exceptionFlagged: boolean;
  activeExceptionCount: number;
  workStartedAt?: string;
  workCompletedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  blockchainHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkLog {
  id: string;
  serviceRequestId: string;
  assignmentId?: string;
  technicianId: string;
  technicianName: string;
  tasksPerformed: string[];
  diagnosticSummary: string;
  workDurationMinutes: number;
  partsReplaced: Array<{ partId: string; partNumber: string; quantity: number }>;
  photoEvidenceUrls: string[];
  documentAttachmentUrls: string[];
  digitalSignatureData?: string;
  signerName?: string;
  signerRole?: string;
  createdAt: string;
}

export interface ExceptionLog {
  id: string;
  serviceRequestId: string;
  assignmentId?: string;
  exceptionType: ExceptionType;
  severity: ExceptionSeverity;
  reason: string;
  metadata?: Record<string, any>;
  autoRerouted: boolean;
  previousTechnicianId?: string;
  replacementTechnicianId?: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface AuditBlock {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  actorId: string;
  actorRole: string;
  previousState?: any;
  newState?: any;
  ipAddress?: string;
  blockHash: string;
  previousBlockHash: string;
  timestamp: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  role: UserRole;
  scopes: string[];
  rateLimitRpm: number;
  isActive: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdBy: string;
  createdAt: string;
}

export interface IoTTelemetryPayload {
  machineSerialNumber: string;
  timestamp: string;
  sensorData: {
    vibrationMmPerSec: number;
    temperatureCelsius: number;
    oilPressurePsi: number;
    acousticRpm: number;
    powerKw: number;
  };
  anomalyDetected?: boolean;
  anomalyScore?: number;
  suggestedAction?: string;
}

export interface TechnicianMatchScore {
  technician: Technician;
  score: number;
  distanceKm: number;
  skillMatchRate: number;
  workloadFactor: number;
  ratingFactor: number;
  isEligible: boolean;
  disqualificationReason?: string;
}
