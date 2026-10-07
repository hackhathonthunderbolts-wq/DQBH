// ====================================================================
// DQBH INDUSTRIAL PLATFORM - BACKEND APPLICATION BOOTSTRAP
// ====================================================================

import http from 'http';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authenticate } from './middleware/auth';
import { serviceRequestsRouter } from './routes/serviceRequests';
import { techniciansRouter } from './routes/technicians';
import { machinesRouter } from './routes/machines';
import { inventoryRouter } from './routes/inventory';
import { apiKeysRouter } from './routes/apiKeys';
import { integrationsRouter } from './routes/integrations';
import { SocketHub } from './sockets/socketManager';

const app = express();
const server = http.createServer(app);

// Enable CORS and JSON body parser
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply Authentication & API Key middleware globally
app.use(authenticate);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'DQBH Activity Management Platform API',
    version: '2.4.0',
    timestamp: new Date().toISOString()
  });
});

// Register Domain Route Handlers
app.use(`${config.apiPrefix}/service-requests`, serviceRequestsRouter);
app.use(`${config.apiPrefix}/technicians`, techniciansRouter);
app.use(`${config.apiPrefix}/machines`, machinesRouter);
app.use(`${config.apiPrefix}/inventory`, inventoryRouter);
app.use(`${config.apiPrefix}/api-keys`, apiKeysRouter);
app.use(`${config.apiPrefix}/integrations`, integrationsRouter);

// Initialize Real-time WebSocket Hub
const socketHub = new SocketHub(server);

// Start HTTP & WS Server
server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 DQBH Industrial Platform Backend Server is RUNNING`);
  console.log(`📡 HTTP REST API: http://localhost:${config.port}${config.apiPrefix}`);
  console.log(`⚡ WebSocket Hub: ws://localhost:${config.port}/ws`);
  console.log(`🛡️ Auth Mode: Dual (JWT Bearer + x-api-key support)`);
  console.log(`=======================================================`);
});

export { app, server, socketHub };
