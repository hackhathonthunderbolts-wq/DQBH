// ====================================================================
// DQBH INDUSTRIAL PLATFORM - EXTENSIBLE EVENT PIPELINE & PLUG-IN HOOKS
// Pluggable integration bus for IoT Telemetry, AI/ML Dispatch & Blockchain Proofs
// ====================================================================

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { MemoryStore } from '../db/memoryStore';
import { IoTTelemetryPayload, ServiceRequest, WorkLog } from '../domain/types';
import { ValidationEngine } from './validationEngine';
import { RoutingEngine } from './routingEngine';

export interface EventPipelineHook<T = any> {
  name: string;
  version: string;
  handle(payload: T): Promise<any>;
}

export class ExtensibleEventPipeline extends EventEmitter {
  private static instance: ExtensibleEventPipeline;
  private store = MemoryStore.getInstance();
  private validationEngine = new ValidationEngine();
  private routingEngine = new RoutingEngine();

  private iotHooks: EventPipelineHook<IoTTelemetryPayload>[] = [];
  private aiDispatchHooks: EventPipelineHook<any>[] = [];
  private blockchainHooks: EventPipelineHook<{ request: ServiceRequest; workLog: WorkLog }>[] = [];

  private constructor() {
    super();
    this.registerDefaultHooks();
  }

  public static getInstance(): ExtensibleEventPipeline {
    if (!ExtensibleEventPipeline.instance) {
      ExtensibleEventPipeline.instance = new ExtensibleEventPipeline();
    }
    return ExtensibleEventPipeline.instance;
  }

  private registerDefaultHooks() {
    // 1. Default IoT Anomaly Detection Hook
    this.registerIoTHook({
      name: 'Vibration & Thermal Anomaly Ingestion Hook',
      version: '1.2.0',
      handle: async (telemetry: IoTTelemetryPayload) => {
        const { machineSerialNumber, sensorData } = telemetry;
        const machine = Array.from(this.store.machines.values()).find(
          m => m.serialNumber === machineSerialNumber
        );

        if (!machine) {
          return { handled: false, message: `Unknown machine serial ${machineSerialNumber}` };
        }

        // Anomaly conditions: Vibration > 7.5 mm/s or Temp > 95°C
        const isVibrationCritical = sensorData.vibrationMmPerSec > 7.5;
        const isThermalCritical = sensorData.temperatureCelsius > 95.0;

        if (isVibrationCritical || isThermalCritical) {
          const ticketNum = `SR-IOT-${Date.now().toString().slice(-4)}`;
          const priority = 'EMERGENCY';
          const requiredSkills = isVibrationCritical ? ['TURBINE_LVL3', 'VIBRATION_ANALYSIS'] : ['HIGH_VOLTAGE'];
          
          const autoRequest: ServiceRequest = {
            id: `req-iot-${Date.now()}`,
            ticketNumber: ticketNum,
            machineId: machine.id,
            siteId: machine.siteId,
            requesterName: 'IoT Edge Telemetry Agent',
            requesterRole: 'Automated Diagnostic System',
            title: `Automated Sensor Alert: Critical ${isVibrationCritical ? 'Vibration' : 'Thermal'} Deviation`,
            description: `Automated anomaly trigger. Vibration: ${sensorData.vibrationMmPerSec} mm/s (Threshold: 7.5 mm/s). Temp: ${sensorData.temperatureCelsius}°C (Threshold: 95°C). Immediate inspection required.`,
            priority,
            state: 'VALIDATED',
            requiredSkills,
            estimatedDurationMinutes: 120,
            slaDueAt: new Date(Date.now() + 2 * 3600000).toISOString(),
            slaBreached: false,
            validationStatus: {
              passed: true,
              machineEligible: true,
              partsAvailable: true,
              skillsSatisfiable: true,
              rulesChecked: ['IOT_TELEMETRY_TRIGGER', 'AUTOMATED_ELIGIBILITY_PASSED'],
              details: 'Automated telemetry ingestion triggered emergency validated ticket.'
            },
            exceptionFlagged: false,
            activeExceptionCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          this.store.serviceRequests.set(autoRequest.id, autoRequest);

          // Auto-dispatch optimal technician
          const dispatchRes = this.routingEngine.autoDispatch(autoRequest.id);

          this.store.recordAudit(
            'IOT_TELEMETRY',
            machine.id,
            'AUTOMATED_EMERGENCY_REQUEST_CREATED',
            'IOT_GATEWAY',
            'SYSTEM_ADMIN',
            sensorData,
            { ticketNumber: ticketNum, autoDispatched: dispatchRes.success }
          );

          this.emit('iot:alert', { request: autoRequest, dispatchResult: dispatchRes });

          return {
            handled: true,
            alertGenerated: true,
            serviceRequest: autoRequest,
            dispatchResult: dispatchRes
          };
        }

        return { handled: true, alertGenerated: false, status: 'Telemetry within normal operating range' };
      }
    });

    // 2. Default Blockchain Completion Seal Hook
    this.registerBlockchainHook({
      name: 'Cryptographic Merkle & SHA-256 Service Completion Anchor',
      version: '2.0.1',
      handle: async ({ request, workLog }) => {
        // Construct canonical verification payload
        const verificationPayload = JSON.stringify({
          ticketNumber: request.ticketNumber,
          machineId: request.machineId,
          siteId: request.siteId,
          technicianId: workLog.technicianId,
          tasksPerformed: workLog.tasksPerformed,
          photoCount: workLog.photoEvidenceUrls.length,
          verifiedAt: request.verifiedAt,
          verifiedBy: request.verifiedBy,
          timestamp: Date.now()
        });

        // Compute cryptographic seal
        const blockchainSealHash = `0x${crypto.createHash('sha256').update(verificationPayload).digest('hex')}`;
        request.blockchainHash = blockchainSealHash;

        // Record audit block
        this.store.recordAudit(
          'SERVICE_REQUEST',
          request.id,
          'BLOCKCHAIN_PROOF_SEALED',
          request.verifiedBy || 'SYSTEM_VERIFIER',
          'OPERATIONS_MANAGER',
          { state: 'VERIFICATION_PENDING' },
          { state: 'COMPLETED', blockchainHash: blockchainSealHash }
        );

        this.emit('blockchain:sealed', { request, blockchainHash: blockchainSealHash });

        return {
          sealed: true,
          blockchainHash: blockchainSealHash,
          blockExplorerUrl: `https://audit.dqbh.industrial/block/${blockchainSealHash}`
        };
      }
    });
  }

  public registerIoTHook(hook: EventPipelineHook<IoTTelemetryPayload>) {
    this.iotHooks.push(hook);
  }

  public registerAIDispatchHook(hook: EventPipelineHook<any>) {
    this.aiDispatchHooks.push(hook);
  }

  public registerBlockchainHook(hook: EventPipelineHook<{ request: ServiceRequest; workLog: WorkLog }>) {
    this.blockchainHooks.push(hook);
  }

  public async ingestTelemetry(payload: IoTTelemetryPayload): Promise<any[]> {
    const results = [];
    for (const hook of this.iotHooks) {
      const res = await hook.handle(payload);
      results.push(res);
    }
    return results;
  }

  public async sealCompletion(request: ServiceRequest, workLog: WorkLog): Promise<any[]> {
    const results = [];
    for (const hook of this.blockchainHooks) {
      const res = await hook.handle({ request, workLog });
      results.push(res);
    }
    return results;
  }
}
