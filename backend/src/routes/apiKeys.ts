// ====================================================================
// DQBH INDUSTRIAL PLATFORM - API KEY MANAGEMENT ROUTER
// Self-service creation, scope assignment, and revocation of API keys
// ====================================================================

import { Router, Request, Response } from 'express';
import { ApiKeyService } from '../services/apiKeyService';

export const apiKeysRouter = Router();
const apiKeyService = new ApiKeyService();

// GET all active API keys (safe metadata only)
apiKeysRouter.get('/', (req: Request, res: Response) => {
  const keys = apiKeyService.listApiKeys();
  res.json({ success: true, count: keys.length, data: keys });
});

// POST generate a new API key
apiKeysRouter.post('/', (req: Request, res: Response) => {
  const { name, role, scopes, rateLimitRpm, expiresInDays } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'API key name / application label is required.' });
  }

  const newKey = apiKeyService.generateApiKey(
    name,
    role || 'SITE_SUPERVISOR',
    scopes || ['requests:read', 'requests:write', 'iot:telemetry:write'],
    rateLimitRpm || 120,
    expiresInDays,
    req.user?.name || 'Administrator'
  );

  res.status(201).json({
    success: true,
    message: 'API Key generated successfully. Copy the plaintext key now; it will not be displayed again.',
    data: newKey
  });
});

// DELETE revoke an API key
apiKeysRouter.delete('/:id', (req: Request, res: Response) => {
  const success = apiKeyService.revokeApiKey(req.params.id, req.user?.name || 'Administrator');
  if (!success) {
    return res.status(404).json({ success: false, message: 'API key not found.' });
  }

  res.json({ success: true, message: `API Key ${req.params.id} has been revoked successfully.` });
});
