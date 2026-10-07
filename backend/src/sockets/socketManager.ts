// ====================================================================
// DQBH INDUSTRIAL PLATFORM - WEBSOCKET DISPATCH & EVENT HUB
// Real-time bidirectional feeds for technicians, managers, and alerts
// ====================================================================

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ExtensibleEventPipeline } from '../services/eventPipeline';

export class SocketHub {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private eventPipeline = ExtensibleEventPipeline.getInstance();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      // Send initial welcome & system status
      ws.send(JSON.stringify({
        type: 'SYSTEM_CONNECTED',
        message: 'Connected to DQBH Industrial Activity Management Real-Time Event Hub',
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          }
        } catch (err) {
          // ignore malformed ping
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });

    // Listen to pipeline events and broadcast
    this.eventPipeline.on('iot:alert', (data) => {
      this.broadcast('ALERT_IOT_ANOMALY', data);
    });

    this.eventPipeline.on('blockchain:sealed', (data) => {
      this.broadcast('AUDIT_BLOCK_SEALED', data);
    });
  }

  public broadcast(eventType: string, payload: any) {
    const message = JSON.stringify({
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}
