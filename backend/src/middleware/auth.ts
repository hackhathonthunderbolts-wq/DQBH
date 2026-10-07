// ====================================================================
// DQBH INDUSTRIAL PLATFORM - AUTHENTICATION & RBAC MIDDLEWARE
// Dual authentication support: JWT tokens & x-api-key header security
// ====================================================================

import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/apiKeyService';
import { UserRole } from '../domain/types';

export interface AuthenticatedUser {
  id: string;
  name: string;
  role: UserRole;
  scopes?: string[];
  isApiKey?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const apiKeyService = new ApiKeyService();

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const apiKeyHeader = req.headers['x-api-key'] as string | undefined;
  const authHeader = req.headers.authorization;

  // 1. First priority: API Key authentication
  if (apiKeyHeader) {
    const validation = apiKeyService.validateApiKey(apiKeyHeader);
    if (!validation.valid || !validation.apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: validation.reason || 'Invalid API Key provided.'
      });
    }

    req.user = {
      id: validation.apiKey.id,
      name: validation.apiKey.name,
      role: validation.apiKey.role,
      scopes: validation.apiKey.scopes,
      isApiKey: true
    };
    return next();
  }

  // 2. Second priority: Bearer Token / Role Simulation for UI Sessions
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    
    // In production, verify JWT secret. For development/demo, accept role token or JWT payload
    let parsedRole: UserRole = 'OPERATIONS_MANAGER';
    let userName = 'Operations Dispatcher';
    let userId = 'user-ops-01';

    if (token.includes('admin')) {
      parsedRole = 'SYSTEM_ADMIN';
      userName = 'Lead Systems Engineer';
      userId = 'user-admin-01';
    } else if (token.includes('tech')) {
      parsedRole = 'FIELD_TECHNICIAN';
      userName = 'Sarah Jenkins (Technician)';
      userId = 'tech-sarah-01';
    } else if (token.includes('client')) {
      parsedRole = 'CLIENT_AUDITOR';
      userName = 'Marcus Vance (Apex Energy)';
      userId = 'client-marcus-01';
    }

    req.user = {
      id: userId,
      name: userName,
      role: parsedRole,
      scopes: ['*'],
      isApiKey: false
    };
    return next();
  }

  // 3. Fallback for public demo routes: Default to Operations Manager
  req.user = {
    id: 'user-demo-ops',
    name: 'Demo Operations Manager',
    role: 'OPERATIONS_MANAGER',
    scopes: ['*'],
    isApiKey: false
  };
  return next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'SYSTEM_ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized. Allowed: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

export function requireScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (req.user.scopes && (req.user.scopes.includes('*') || req.user.scopes.includes(requiredScope))) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden. Missing required API key scope: [${requiredScope}].`
    });
  };
}
