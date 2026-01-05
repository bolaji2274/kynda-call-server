# ============================================================================
# FILE 5: backend/src/services/metrics.service.js (FOR PROMETHEUS METRICS)
# ============================================================================

# Copy this JavaScript code to: backend/src/services/metrics.service.js

const promClient = require('prom-client');

class MetricsService {
  constructor() {
    this.register = new promClient.Registry();
    
    // Set default labels
    this.register.setDefaultLabels({
      app: 'kynda-call-server',
    });

    // Collect default metrics (CPU, memory, etc.)
    promClient.collectDefaultMetrics({ register: this.register });

    // Custom metrics
    this.initCustomMetrics();
  }

  initCustomMetrics() {
    // Active sessions gauge
    this.activeSessions = new promClient.Gauge({
      name: 'kynda_active_sessions',
      help: 'Number of active call sessions',
      registers: [this.register],
    });

    // Bandwidth histogram
    this.bandwidth = new promClient.Histogram({
      name: 'kynda_bandwidth_bytes',
      help: 'Bandwidth usage in bytes',
      buckets: [1000, 5000, 10000, 50000, 100000, 500000, 1000000],
      registers: [this.register],
    });

    // Connection quality gauge
    this.qualityScore = new promClient.Gauge({
      name: 'kynda_quality_score',
      help: 'Connection quality score (0-100)',
      labelNames: ['room_id'],
      registers: [this.register],
    });

    // Packet loss gauge
    this.packetLoss = new promClient.Gauge({
      name: 'kynda_packet_loss',
      help: 'Packet loss percentage',
      labelNames: ['room_id'],
      registers: [this.register],
    });

    // Call duration histogram
    this.callDuration = new promClient.Histogram({
      name: 'kynda_call_duration_seconds',
      help: 'Duration of calls in seconds',
      buckets: [60, 300, 600, 1800, 3600, 7200],
      registers: [this.register],
    });

    // API request counter
    this.httpRequests = new promClient.Counter({
      name: 'kynda_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
    });

    // WebSocket connections gauge
    this.wsConnections = new promClient.Gauge({
      name: 'kynda_websocket_connections',
      help: 'Number of active WebSocket connections',
      registers: [this.register],
    });
  }

  // Update methods
  setActiveSessions(count) {
    this.activeSessions.set(count);
  }

  recordBandwidth(bytes) {
    this.bandwidth.observe(bytes);
  }

  setQualityScore(roomId, score) {
    this.qualityScore.set({ room_id: roomId }, score);
  }

  setPacketLoss(roomId, loss) {
    this.packetLoss.set({ room_id: roomId }, loss);
  }

  recordCallDuration(seconds) {
    this.callDuration.observe(seconds);
  }

  incrementHttpRequests(method, route, status) {
    this.httpRequests.inc({ method, route, status });
  }

  setWsConnections(count) {
    this.wsConnections.set(count);
  }

  // Get metrics for Prometheus
  async getMetrics() {
    return await this.register.metrics();
  }

  // Get content type
  getContentType() {
    return this.register.contentType;
  }
}

module.exports = new MetricsService();