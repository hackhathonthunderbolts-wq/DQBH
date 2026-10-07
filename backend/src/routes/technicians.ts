// ====================================================================
// DQBH INDUSTRIAL PLATFORM - TECHNICIANS ROUTER
// Technician directory, location tracking, and certification queries
// ====================================================================

import { Router, Request, Response } from 'express';
import { MemoryStore } from '../db/memoryStore';

export const techniciansRouter = Router();
const store = MemoryStore.getInstance();

// GET all technicians
techniciansRouter.get('/', (req: Request, res: Response) => {
  const { status, skill } = req.query;
  let techs = Array.from(store.technicians.values());

  if (status) techs = techs.filter(t => t.currentStatus === status);
  if (skill) techs = techs.filter(t => t.certifications.includes(skill as string));

  res.json({ success: true, count: techs.length, data: techs });
});

// GET single technician
techniciansRouter.get('/:id', (req: Request, res: Response) => {
  const tech = store.technicians.get(req.params.id);
  if (!tech) {
    return res.status(404).json({ success: false, message: 'Technician not found.' });
  }

  const activeJobs = Array.from(store.serviceRequests.values()).filter(r => r.assignedTechnicianId === tech.id);

  res.json({ success: true, data: { ...tech, activeJobs } });
});

// POST update GPS location
techniciansRouter.post('/:id/location', (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;
  const tech = store.technicians.get(req.params.id);

  if (!tech) {
    return res.status(404).json({ success: false, message: 'Technician not found.' });
  }

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).json({ success: false, message: 'Valid latitude and longitude numbers required.' });
  }

  tech.currentLocation = { latitude, longitude };
  tech.lastLocationPing = new Date().toISOString();

  res.json({ success: true, message: 'Location updated successfully.', data: tech });
});
