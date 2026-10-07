// ====================================================================
// DQBH INDUSTRIAL PLATFORM - CONFIGURATION MODULE
// ====================================================================

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dqbh_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'dqbh_industrial_secret_key_2026_super_secure',
  apiPrefix: '/api/v1'
};
