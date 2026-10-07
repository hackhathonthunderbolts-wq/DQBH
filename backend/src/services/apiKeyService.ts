// ====================================================================
// DQBH INDUSTRIAL PLATFORM - API KEY & EXTERNAL SECURITY ENGINE
// Manages cryptographically hashed API keys, scoped permissions & rate limits
// ====================================================================

import crypto from 'crypto';
import { MemoryStore } from '../db/memoryStore';
import { ApiKeyRecord, UserRole } from '../domain/types';

export interface GeneratedApiKeyResponse {
  id: string;
  name: string;
  plaintextKey: string; // ONLY RETURNED ONCE UPON CREATION
  keyPrefix: string;
  role: UserRole;
  scopes: string[];
  rateLimitRpm: number;
  expiresAt?: string;
  createdAt: string;
}

export class ApiKeyService {
  private store = MemoryStore.getInstance();
  private rateLimitWindowMap: Map<string, { count: number; windowStart: number }> = new Map();

  /**
   * Generates a new cryptographically secure API key with role scopes
   */
  public generateApiKey(
    name: string,
    role: UserRole = 'SITE_SUPERVISOR',
    scopes: string[] = ['requests:read', 'requests:write', 'iot:telemetry:write'],
    rateLimitRpm: number = 120,
    expiresInDays?: number,
    createdBy: string = 'Operations Administrator'
  ): GeneratedApiKeyResponse {
    // Generate 32 bytes random entropy
    const randomEntropy = crypto.randomBytes(24).toString('hex');
    const keyPrefix = `dqbh_live_${randomEntropy.substring(0, 4)}`;
    const plaintextKey = `${keyPrefix}_${randomEntropy.substring(4)}`;

    // Hash the key using SHA-256 for secure storage
    const keyHash = crypto.createHash('sha256').update(plaintextKey).digest('hex');

    const id = `apk-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString() 
      : undefined;

    const record: ApiKeyRecord = {
      id,
      name,
      keyPrefix,
      keyHash,
      role,
      scopes,
      rateLimitRpm,
      isActive: true,
      expiresAt,
      createdBy,
      createdAt: new Date().toISOString()
    };

    this.store.apiKeys.set(id, record);

    // Record audit block
    this.store.recordAudit(
      'API_KEY',
      id,
      'API_KEY_CREATED',
      createdBy,
      'SYSTEM_ADMIN',
      undefined,
      { keyPrefix, role, scopes, rateLimitRpm }
    );

    return {
      id,
      name,
      plaintextKey,
      keyPrefix,
      role,
      scopes,
      rateLimitRpm,
      expiresAt,
      createdAt: record.createdAt
    };
  }

  /**
   * Validates an incoming API Key from headers (e.g. `x-api-key: dqbh_live_...`)
   */
  public validateApiKey(plaintextKey: string, requiredScope?: string): { valid: boolean; apiKey?: ApiKeyRecord; reason?: string } {
    if (!plaintextKey || !plaintextKey.startsWith('dqbh_')) {
      return { valid: false, reason: 'Invalid API key format. Expected format: dqbh_live_<token>' };
    }

    const keyHash = crypto.createHash('sha256').update(plaintextKey).digest('hex');
    const matchedKey = Array.from(this.store.apiKeys.values()).find(k => k.keyHash === keyHash);

    if (!matchedKey) {
      return { valid: false, reason: 'API key not recognized or unauthorized.' };
    }

    if (!matchedKey.isActive) {
      return { valid: false, reason: 'API key has been revoked or deactivated.' };
    }

    if (matchedKey.expiresAt && new Date() > new Date(matchedKey.expiresAt)) {
      return { valid: false, reason: 'API key has expired.' };
    }

    // Check scope permissions
    if (requiredScope && !matchedKey.scopes.includes(requiredScope) && !matchedKey.scopes.includes('*')) {
      return {
        valid: false,
        reason: `API key lacks the required permission scope: [${requiredScope}]. Authorized scopes: [${matchedKey.scopes.join(', ')}]`
      };
    }

    // Check Rate Limiting (Sliding 1-minute window)
    const now = Date.now();
    const rateEntry = this.rateLimitWindowMap.get(matchedKey.id) || { count: 0, windowStart: now };
    if (now - rateEntry.windowStart > 60000) {
      rateEntry.count = 1;
      rateEntry.windowStart = now;
    } else {
      rateEntry.count += 1;
    }
    this.rateLimitWindowMap.set(matchedKey.id, rateEntry);

    if (rateEntry.count > matchedKey.rateLimitRpm) {
      return { valid: false, reason: `Rate limit exceeded. Maximum ${matchedKey.rateLimitRpm} requests per minute permitted.` };
    }

    // Update last used timestamp
    matchedKey.lastUsedAt = new Date().toISOString();

    return { valid: true, apiKey: matchedKey };
  }

  /**
   * Revokes an existing API key
   */
  public revokeApiKey(keyId: string, actor: string = 'Administrator'): boolean {
    const key = this.store.apiKeys.get(keyId);
    if (!key) return false;

    key.isActive = false;
    this.store.recordAudit(
      'API_KEY',
      keyId,
      'API_KEY_REVOKED',
      actor,
      'SYSTEM_ADMIN',
      { isActive: true },
      { isActive: false }
    );
    return true;
  }

  /**
   * Lists all registered API keys (safely omitting plaintext secrets)
   */
  public listApiKeys(): Omit<ApiKeyRecord, 'keyHash'>[] {
    return Array.from(this.store.apiKeys.values()).map(({ keyHash, ...safeKey }) => safeKey);
  }
}
