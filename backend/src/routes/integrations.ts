// ====================================================================
// DQBH INDUSTRIAL PLATFORM - INTEGRATIONS & ANALYTICS ROUTER
// IoT Ingestion, AI Predictive Dispatch, Audit Trail & Operational KPIs
// ====================================================================

import { Router, Request, Response } from 'express';
import { MemoryStore } from '../db/memoryStore';
import { ExtensibleEventPipeline } from '../services/eventPipeline';
import { requireScope } from '../middleware/auth';

export const integrationsRouter = Router();
const store = MemoryStore.getInstance();
const eventPipeline = ExtensibleEventPipeline.getInstance();

// POST ingest IoT Telemetry
integrationsRouter.post('/iot/telemetry', requireScope('iot:telemetry:write'), async (req: Request, res: Response) => {
  const { machineSerialNumber, sensorData, timestamp } = req.body;

  if (!machineSerialNumber || !sensorData) {
    return res.status(400).json({
      success: false,
      message: 'Payload must contain machineSerialNumber and sensorData object.'
    });
  }

  const payload = {
    machineSerialNumber,
    timestamp: timestamp || new Date().toISOString(),
    sensorData: {
      vibrationMmPerSec: Number(sensorData.vibrationMmPerSec) || 0,
      temperatureCelsius: Number(sensorData.temperatureCelsius) || 0,
      oilPressurePsi: Number(sensorData.oilPressurePsi) || 0,
      acousticRpm: Number(sensorData.acousticRpm) || 0,
      powerKw: Number(sensorData.powerKw) || 0
    }
  };

  const results = await eventPipeline.ingestTelemetry(payload);

  res.json({
    success: true,
    message: 'IoT telemetry ingested and evaluated through pipeline.',
    results
  });
});

// POST AI/ML Predictive Dispatch Simulator
integrationsRouter.post('/ai/predictive-dispatch', (req: Request, res: Response) => {
  const requests = Array.from(store.serviceRequests.values()).filter(r => ['SUBMITTED', 'VALIDATED'].includes(r.state));
  const technicians = Array.from(store.technicians.values()).filter(t => t.currentStatus === 'AVAILABLE');

  // Simulated AI Optimization Matrix
  const recommendations = requests.map(req => {
    const candidate = technicians[Math.floor(Math.random() * technicians.length)];
    return {
      serviceRequestId: req.id,
      ticketNumber: req.ticketNumber,
      recommendedTechnician: candidate ? {
        id: candidate.id,
        name: candidate.fullName,
        confidenceScore: 0.94,
        predictedJobDurationMinutes: 85,
        travelTimeSavingsPct: 32
      } : null
    };
  });

  res.json({
    success: true,
    model: 'DQBH-FleetOptimizer-v4-Ensemble',
    recommendations
  });
});

// GET Immutable Audit Trail
integrationsRouter.get('/audit/trail', (req: Request, res: Response) => {
  const { entityId, limit } = req.query;
  let trail = [...store.auditTrail];

  if (entityId) {
    trail = trail.filter(b => b.entityId === entityId);
  }

  // Reverse chronological
  trail.reverse();

  if (limit) {
    trail = trail.slice(0, Number(limit));
  }

  res.json({
    success: true,
    blockCount: trail.length,
    latestBlockHash: trail[0]?.blockHash || null,
    chain: trail
  });
});

// GET Operational Analytics & KPIs
integrationsRouter.get('/analytics/kpi', (req: Request, res: Response) => {
  const allRequests = Array.from(store.serviceRequests.values());
  const completed = allRequests.filter(r => r.state === 'COMPLETED');
  const active = allRequests.filter(r => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(r.state));
  const breached = allRequests.filter(r => r.slaBreached);
  const exceptions = Array.from(store.exceptionLogs.values());

  const totalTechnicians = store.technicians.size;
  const activeTechs = Array.from(store.technicians.values()).filter(t => t.activeJobCount > 0).length;

  const slaCompliancePct = allRequests.length > 0 
    ? Number(((1 - breached.length / allRequests.length) * 100).toFixed(1))
    : 100.0;

  res.json({
    success: true,
    kpis: {
      totalRequests: allRequests.length,
      activeJobs: active.length,
      completedJobs: completed.length,
      slaComplianceRatePct: slaCompliancePct,
      meanTimeToRepairMinutes: 114, // Simulated average
      technicianUtilizationPct: totalTechnicians > 0 ? Number(((activeTechs / totalTechnicians) * 100).toFixed(1)) : 0,
      totalExceptionsRaised: exceptions.length,
      autoReroutedExceptions: exceptions.filter(e => e.autoRerouted).length
    }
  });
});
