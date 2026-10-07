// ====================================================================
// DQBH INDUSTRIAL PLATFORM - SPARE PARTS & INVENTORY ROUTER
// ====================================================================

import { Router, Request, Response } from 'express';
import { MemoryStore } from '../db/memoryStore';

export const inventoryRouter = Router();
const store = MemoryStore.getInstance();

// GET all spare parts
inventoryRouter.get('/', (req: Request, res: Response) => {
  const { siteId, category, lowStock } = req.query;
  let parts = Array.from(store.spareParts.values());

  if (siteId) parts = parts.filter(p => p.siteId === siteId);
  if (category) parts = parts.filter(p => p.category === category);
  if (lowStock === 'true') parts = parts.filter(p => (p.stockQuantity - p.reservedQuantity) <= p.minimumThreshold);

  res.json({ success: true, count: parts.length, data: parts });
});

// GET active parts reservations
inventoryRouter.get('/reservations', (req: Request, res: Response) => {
  const reservations = Array.from(store.partReservations.values());
  res.json({ success: true, count: reservations.length, data: reservations });
});
