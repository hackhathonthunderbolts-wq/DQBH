// ====================================================================
// DQBH INDUSTRIAL PLATFORM - MACHINES & ASSET TWINS ROUTER
// ====================================================================

import { Router, Request, Response } from 'express';
import { MemoryStore } from '../db/memoryStore';

export const machinesRouter = Router();
const store = MemoryStore.getInstance();

// GET all machines
machinesRouter.get('/', (req: Request, res: Response) => {
  const { siteId, category, status } = req.query;
  let machines = Array.from(store.machines.values());

  if (siteId) machines = machines.filter(m => m.siteId === siteId);
  if (category) machines = machines.filter(m => m.category === category);
  if (status) machines = machines.filter(m => m.status === status);

  res.json({ success: true, count: machines.length, data: machines });
});

// GET single machine with maintenance history
machinesRouter.get('/:id', (req: Request, res: Response) => {
  const machine = store.machines.get(req.params.id);
  if (!machine) {
    return res.status(404).json({ success: false, message: 'Machine asset not found.' });
  }

  const site = store.sites.get(machine.siteId);
  const serviceHistory = Array.from(store.serviceRequests.values())
    .filter(r => r.machineId === machine.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    success: true,
    data: {
      ...machine,
      site,
      serviceHistory
    }
  });
});
