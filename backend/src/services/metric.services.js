const promClient = require('prom-client');

const register = new promClient.Registry();

const activeSessions = new promClient.Gauge({
  name: 'kynda_active_sessions',
  help: 'Number of active call sessions',
  registers: [register],
});

const bandwidth = new promClient.Histogram({
  name: 'kynda_bandwidth_bytes',
  help: 'Bandwidth usage in bytes',
  buckets: [1000, 5000, 10000, 50000, 100000],
  registers: [register],
});

module.exports = { register, activeSessions, bandwidth };