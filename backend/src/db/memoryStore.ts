// ====================================================================
// DQBH INDUSTRIAL PLATFORM - HIGH-FIDELITY IN-MEMORY DATA STORE
// Enables zero-dependency out-of-the-box runnability with pre-seeded data
// ====================================================================

import crypto from 'crypto';
import { 
  Site, 
  Machine, 
  Technician, 
  SparePart, 
  ServiceRequest, 
  WorkLog, 
  ExceptionLog, 
  AuditBlock, 
  ApiKeyRecord,
  PartReservation,
  TechnicianSkill,
  Certification,
  ShiftSchedule,
  Assignment,
  TechnicianTaskLog,
  TechnicianDocument,
  RequestChecklist,
  CheckIn,
  TechnicianNotification,
  Badge,
  TechnicianBadge
} from '../domain/types';

export class MemoryStore {
  private static instance: MemoryStore;

  public sites: Map<string, Site> = new Map();
  public machines: Map<string, Machine> = new Map();
  public technicians: Map<string, Technician> = new Map();
  public spareParts: Map<string, SparePart> = new Map();
  public serviceRequests: Map<string, ServiceRequest> = new Map();
  public partReservations: Map<string, PartReservation> = new Map();
  public workLogs: Map<string, WorkLog> = new Map();
  public exceptionLogs: Map<string, ExceptionLog> = new Map();
  public auditTrail: AuditBlock[] = [];
  public apiKeys: Map<string, ApiKeyRecord> = new Map();
  public technicianSkills: Map<string, TechnicianSkill> = new Map();
  public certifications: Map<string, Certification> = new Map();
  public shifts: Map<string, ShiftSchedule> = new Map();
  public assignments: Map<string, Assignment> = new Map();
  public taskLogs: Map<string, TechnicianTaskLog> = new Map();
  public documents: Map<string, TechnicianDocument> = new Map();
  public checklists: Map<string, RequestChecklist> = new Map();
  public checkInRecords: Map<string, CheckIn> = new Map();
  public notifications: Map<string, TechnicianNotification> = new Map();
  public badges: Map<string, Badge> = new Map();
  public technicianBadges: Map<string, TechnicianBadge> = new Map();

  private constructor() {
    this.seedInitialData();
  }

  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  private seedInitialData() {
    // 1. Seed Sites
    const siteHouston: Site = {
      id: 'site-houston-01',
      code: 'SITE-HOU-01',
      name: 'Houston Energy Complex A',
      clientName: 'Apex Energy Corp',
      address: '1000 Bayport Blvd',
      city: 'Houston',
      state: 'TX',
      country: 'USA',
      location: { latitude: 29.7604, longitude: -95.3698 },
      contactName: 'Marcus Vance',
      contactPhone: '+1-713-555-0199',
      contactEmail: 'm.vance@apexenergy.com',
      operatingHours: '24/7',
      createdAt: new Date().toISOString()
    };
    const siteDetroit: Site = {
      id: 'site-detroit-02',
      code: 'SITE-DET-02',
      name: 'Detroit Automation Plant 4',
      clientName: 'Vanguard Motors LLC',
      address: '450 Industrial Parkway',
      city: 'Detroit',
      state: 'MI',
      country: 'USA',
      location: { latitude: 42.3314, longitude: -83.0458 },
      contactName: 'Elena Rostova',
      contactPhone: '+1-313-555-0142',
      contactEmail: 'e.rostova@vanguardmotors.com',
      operatingHours: '24/7',
      createdAt: new Date().toISOString()
    };
    const siteSanJose: Site = {
      id: 'site-sanjose-03',
      code: 'SITE-SJC-03',
      name: 'Silicon Valley Fab Beta',
      clientName: 'Aura Semi Systems',
      address: '880 Innovation Way',
      city: 'San Jose',
      state: 'CA',
      country: 'USA',
      location: { latitude: 37.3382, longitude: -121.8863 },
      contactName: 'Dr. Kenji Sato',
      contactPhone: '+1-408-555-0188',
      contactEmail: 'k.sato@aurasemi.com',
      operatingHours: '24/7',
      createdAt: new Date().toISOString()
    };
    this.sites.set(siteHouston.id, siteHouston);
    this.sites.set(siteDetroit.id, siteDetroit);
    this.sites.set(siteSanJose.id, siteSanJose);

    // 2. Seed Machines
    const machTurbine: Machine = {
      id: 'mach-turbine-01',
      siteId: siteHouston.id,
      serialNumber: 'TURB-9HA-90812',
      assetTag: 'EQ-APEX-098',
      modelName: '9HA.02 Heavy-Duty Gas Turbine',
      manufacturer: 'GE Vernova',
      category: 'Gas Turbine',
      criticalityTier: 5,
      installationDate: '2023-01-15',
      warrantyExpirationDate: '2028-01-15',
      slaResponseHoursDefault: 2,
      operatingHoursTotal: 14250.5,
      healthScore: 82,
      telemetryConnected: true,
      lastServiceDate: new Date(Date.now() - 45 * 86400000).toISOString(),
      nextScheduledServiceDate: new Date(Date.now() + 45 * 86400000).toISOString(),
      status: 'OPERATIONAL',
      specifications: { maxRpm: 3600, powerOutputMw: 571, thermalEfficiencyPct: 63.8 }
    };
    const machRobot: Machine = {
      id: 'mach-robot-02',
      siteId: siteDetroit.id,
      serialNumber: 'ROBO-FAN-44120',
      assetTag: 'EQ-VANG-104',
      modelName: 'M-2000iA Heavy Payload Robot',
      manufacturer: 'FANUC Corp',
      category: 'Robotics Press',
      criticalityTier: 4,
      installationDate: '2022-06-10',
      warrantyExpirationDate: '2027-06-10',
      slaResponseHoursDefault: 4,
      operatingHoursTotal: 19800.0,
      healthScore: 68,
      telemetryConnected: true,
      lastServiceDate: new Date(Date.now() - 60 * 86400000).toISOString(),
      nextScheduledServiceDate: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'DEGRADED',
      specifications: { payloadKg: 2300, reachMm: 3734, axisCount: 6 }
    };
    const machEuv: Machine = {
      id: 'mach-euv-03',
      siteId: siteSanJose.id,
      serialNumber: 'SEMI-EUV-00492',
      assetTag: 'EQ-AURA-002',
      modelName: 'High-NA EUV Scanner Subsystem',
      manufacturer: 'ASML Lithography',
      category: 'EUV Lithography',
      criticalityTier: 5,
      installationDate: '2024-03-01',
      warrantyExpirationDate: '2029-03-01',
      slaResponseHoursDefault: 1,
      operatingHoursTotal: 5420.0,
      healthScore: 94,
      telemetryConnected: true,
      lastServiceDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      nextScheduledServiceDate: new Date(Date.now() + 70 * 86400000).toISOString(),
      status: 'OPERATIONAL',
      specifications: { numericalAperture: 0.55, resolutionNm: 8, lightSource: 'CO2 Laser LPP' }
    };
    this.machines.set(machTurbine.id, machTurbine);
    this.machines.set(machRobot.id, machRobot);
    this.machines.set(machEuv.id, machEuv);

    // 3. Seed Technicians
    const techSarah: Technician = {
      id: 'tech-sarah-01',
      employeeCode: 'TECH-TX-09',
      fullName: 'Sarah Jenkins',
      email: 's.jenkins@dqbh-field.io',
      phone: '+1-832-555-8812',
      currentStatus: 'AVAILABLE',
      currentLocation: { latitude: 29.7700, longitude: -95.3800 },
      lastLocationPing: new Date().toISOString(),
      certifications: ['TURBINE_LVL3', 'HIGH_VOLTAGE', 'VIBRATION_ANALYSIS', 'TURBINE_CORE'],
      activeJobCount: 0,
      maxConcurrentJobs: 2,
      serviceRating: 4.95,
      totalCompletedJobs: 142
    };
    const techDavid: Technician = {
      id: 'tech-david-02',
      employeeCode: 'TECH-MI-14',
      fullName: 'David Chen',
      email: 'd.chen@dqbh-field.io',
      phone: '+1-248-555-9321',
      currentStatus: 'AVAILABLE',
      currentLocation: { latitude: 42.3400, longitude: -83.0500 },
      lastLocationPing: new Date().toISOString(),
      certifications: ['ROBOTICS_ADV', 'HYDRAULICS_EXPERT', 'PLC_SIEMENS', 'SERVO_CALIBRATION'],
      activeJobCount: 0,
      maxConcurrentJobs: 2,
      serviceRating: 4.88,
      totalCompletedJobs: 98
    };
    const techPriya: Technician = {
      id: 'tech-priya-03',
      employeeCode: 'TECH-CA-03',
      fullName: 'Dr. Priya Nair',
      email: 'p.nair@dqbh-field.io',
      phone: '+1-650-555-4422',
      currentStatus: 'AVAILABLE',
      currentLocation: { latitude: 37.3400, longitude: -121.8900 },
      lastLocationPing: new Date().toISOString(),
      certifications: ['EUV_VACUUM', 'OPTICS_CALIBRATION', 'CLEANROOM_CLASS1', 'LASER_SYSTEMS'],
      activeJobCount: 0,
      maxConcurrentJobs: 1,
      serviceRating: 4.99,
      totalCompletedJobs: 210
    };
    const techCarlos: Technician = {
      id: 'tech-carlos-04',
      employeeCode: 'TECH-TX-22',
      fullName: 'Carlos Morales',
      email: 'c.morales@dqbh-field.io',
      phone: '+1-832-555-1109',
      currentStatus: 'AVAILABLE',
      currentLocation: { latitude: 29.8000, longitude: -95.4200 },
      lastLocationPing: new Date().toISOString(),
      certifications: ['TURBINE_LVL3', 'MECHANICAL_FITTER', 'PUMP_OVERHAUL'],
      activeJobCount: 0,
      maxConcurrentJobs: 2,
      serviceRating: 4.75,
      totalCompletedJobs: 64
    };
    this.technicians.set(techSarah.id, techSarah);
    this.technicians.set(techDavid.id, techDavid);
    this.technicians.set(techPriya.id, techPriya);
    this.technicians.set(techCarlos.id, techCarlos);

    // 4. Seed Spare Parts
    const partBlade: SparePart = {
      id: 'part-blade-01',
      siteId: siteHouston.id,
      partNumber: 'SP-TURB-BLADE-01',
      name: 'High-Temp Turbine First-Stage Blade',
      category: 'Thermal Core',
      compatibleModels: ['9HA.02 Heavy-Duty Gas Turbine'],
      stockQuantity: 12,
      reservedQuantity: 1,
      minimumThreshold: 4,
      unitCostCents: 1850000,
      binLocation: 'BAY-A1-BIN4'
    };
    const partValve: SparePart = {
      id: 'part-valve-02',
      siteId: siteHouston.id,
      partNumber: 'SP-VALV-SOL-99',
      name: 'High-Pressure Fuel Solenoid Actuator',
      category: 'Valves & Actuators',
      compatibleModels: ['9HA.02 Heavy-Duty Gas Turbine'],
      stockQuantity: 8,
      reservedQuantity: 0,
      minimumThreshold: 2,
      unitCostCents: 420000,
      binLocation: 'BAY-A3-BIN1'
    };
    const partSeal: SparePart = {
      id: 'part-seal-03',
      siteId: siteDetroit.id,
      partNumber: 'SP-ROBO-SEAL-88',
      name: 'Hydraulic Servo Cylinder Seal Kit',
      category: 'Hydraulics',
      compatibleModels: ['M-2000iA Heavy Payload Robot'],
      stockQuantity: 15,
      reservedQuantity: 0,
      minimumThreshold: 3,
      unitCostCents: 125000,
      binLocation: 'BAY-B2-BIN8'
    };
    const partGasket: SparePart = {
      id: 'part-gasket-04',
      siteId: siteSanJose.id,
      partNumber: 'SP-EUV-GASK-09',
      name: 'Ultra-High Vacuum Flange Gasket Set',
      category: 'Vacuum / Optics',
      compatibleModels: ['High-NA EUV Scanner Subsystem'],
      stockQuantity: 24,
      reservedQuantity: 0,
      minimumThreshold: 5,
      unitCostCents: 890000,
      binLocation: 'BAY-C1-BIN2'
    };
    this.spareParts.set(partBlade.id, partBlade);
    this.spareParts.set(partValve.id, partValve);
    this.spareParts.set(partSeal.id, partSeal);
    this.spareParts.set(partGasket.id, partGasket);

    // 5. Seed Initial Service Requests
    const req1: ServiceRequest = {
      id: 'req-srv-1001',
      ticketNumber: 'SR-2026-1001',
      machineId: machTurbine.id,
      siteId: siteHouston.id,
      requesterName: 'Marcus Vance',
      requesterRole: 'Site Operations Manager',
      title: 'High-Vibration Alert on Bearing #3',
      description: 'Vibration frequency analysis indicated harmonic resonance above 8.2 mm/s during peak grid generation.',
      priority: 'EMERGENCY',
      state: 'ASSIGNED',
      requiredSkills: ['TURBINE_LVL3', 'VIBRATION_ANALYSIS'],
      estimatedDurationMinutes: 180,
      slaDueAt: new Date(Date.now() + 2 * 3600000).toISOString(),
      slaBreached: false,
      validationStatus: {
        passed: true,
        machineEligible: true,
        partsAvailable: true,
        skillsSatisfiable: true,
        rulesChecked: ['WARRANTY_ACTIVE', 'PARTS_IN_STOCK', 'SKILL_CERT_MATCH'],
        details: 'Automated eligibility passed. 1x Turbine Blade reserved.'
      },
      assignedTechnicianId: techSarah.id,
      assignedTechnicianName: techSarah.fullName,
      exceptionFlagged: false,
      activeExceptionCount: 0,
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      updatedAt: new Date(Date.now() - 10 * 60000).toISOString()
    };
    this.serviceRequests.set(req1.id, req1);

    // 6. Seed API Keys
    const defaultKey = 'dqbh_live_9988aabb11223344';
    const keyHash = crypto.createHash('sha256').update(defaultKey).digest('hex');
    const apiKeyRec: ApiKeyRecord = {
      id: 'apikey-seed-01',
      name: 'Default Production Edge Gateway Key',
      keyPrefix: 'dqbh_live_9988',
      keyHash: keyHash,
      role: 'OPERATIONS_MANAGER',
      scopes: ['requests:read', 'requests:write', 'iot:telemetry:write', 'dispatch:admin'],
      rateLimitRpm: 300,
      isActive: true,
      createdBy: 'System Architect',
      createdAt: new Date().toISOString()
    };
    this.apiKeys.set(apiKeyRec.id, apiKeyRec);

    // 7. Seed Initial Genesis Audit Block
    this.auditTrail.push({
      id: 'audit-genesis-000',
      entityName: 'SYSTEM',
      entityId: 'ROOT',
      action: 'SYSTEM_INITIALIZATION',
      actorId: 'ARCHITECT_ENGINE',
      actorRole: 'SYSTEM_ADMIN',
      blockHash: 'GENESIS_DQBH_ROOT_BLOCK_00000000000000000000000000000000',
      previousBlockHash: '0000000000000000000000000000000000000000000000000000000000000000',
      timestamp: new Date().toISOString()
    });
  }

  public recordAudit(entityName: string, entityId: string, action: string, actorId: string, actorRole: string, previousState?: any, newState?: any): AuditBlock {
    const lastBlock = this.auditTrail[this.auditTrail.length - 1];
    const prevHash = lastBlock ? lastBlock.blockHash : 'GENESIS_DQBH_ROOT_BLOCK_00000000000000000000000000000000';
    
    const blockPayload = `${entityName}:${entityId}:${action}:${actorId}:${prevHash}:${Date.now()}`;
    const newHash = crypto.createHash('sha256').update(blockPayload).digest('hex');

    const block: AuditBlock = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      entityName,
      entityId,
      action,
      actorId,
      actorRole,
      previousState,
      newState,
      blockHash: newHash,
      previousBlockHash: prevHash,
      timestamp: new Date().toISOString()
    };

    this.auditTrail.push(block);
    return block;
  }
}
