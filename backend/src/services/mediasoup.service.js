// src/services/mediasoup.service.js

const os = require('os');
const mediasoup = require('mediasoup');

class MediasoupService {
  constructor() {
    this.workers = [];
    this.nextWorkerIdx = 0;
    this.config = this.getOptimalConfig();
  }

  getOptimalConfig() {
    const numCores = os.cpus().length;
    
    return {
      worker: {
        // RTC ports for media
        rtcMinPort: 40000,
        rtcMaxPort: 40000 + (numCores * 1000) - 1, // 1000 ports per worker
        
        // Logging
        logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
        logTags: [
          'info',
          'ice',      // ICE connection logs
          'dtls',     // DTLS handshake logs
          'rtp',      // RTP packet logs
          'srtp',     // SRTP logs
          'rtcp',     // RTCP feedback logs
          'rtx',      // Retransmission logs
          'bwe',      // Bandwidth estimation
          'score',    // Quality score
          'simulcast',// Simulcast logs
          'svc',      // SVC logs
          'sctp',     // Data channel logs
        ],
        
        // Resource limits
        dtlsCertificateFile: undefined, // Auto-generate
        dtlsPrivateKeyFile: undefined,  // Auto-generate
      },
      
      // Router codecs
      router: {
        mediaCodecs: this.getOptimalCodecs(),
      },
      
      // WebRTC transport settings
      webRtcTransport: this.getOptimalTransportConfig(),
    };
  }

  async initialize() {
    const numWorkers = os.cpus().length;
    console.log(`Creating ${numWorkers} mediasoup workers...`);

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: this.config.worker.logLevel,
        logTags: this.config.worker.logTags,
        rtcMinPort: this.config.worker.rtcMinPort + (i * 1000),
        rtcMaxPort: this.config.worker.rtcMinPort + (i * 1000) + 999,
      });

      // Handle worker death
      worker.on('died', () => {
        console.error(`Mediasoup worker died [pid:${worker.pid}]`);
        
        // Graceful shutdown
        setTimeout(() => {
          console.error('Exiting process due to worker death');
          process.exit(1);
        }, 2000);
      });

      // Monitor worker resource usage
      setInterval(async () => {
        const usage = await worker.getResourceUsage();
        
        if (usage.ru_maxrss > 2000000) { // 2GB RSS
          console.warn(`Worker ${i} high memory: ${usage.ru_maxrss / 1000}MB`);
        }
      }, 30000);

      this.workers.push(worker);
      console.log(`Worker ${i + 1} created [pid:${worker.pid}]`);
    }

    console.log('✓ All mediasoup workers initialized');
  }

  // Load balancing: Round-robin worker selection
  getWorker() {
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }
}

module.exports = new MediasoupService();