// ============================================================================
// MISSING FILE 1: frontend/src/utils/audioProcessor.js
// ============================================================================

/**
 * Audio Processor for Noise Suppression
 */
export class AudioProcessor {
  constructor() {
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.enabled = false;
  }

  async initialize(stream) {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create audio nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      
      // Configure analyser
      this.analyserNode.fftSize = 2048;
      this.analyserNode.smoothingTimeConstant = 0.8;
      
      // Create destination
      const destination = this.audioContext.createMediaStreamDestination();
      
      // Connect nodes: source -> gain -> analyser -> destination
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(destination);
      
      // Start noise gate
      this.startNoiseGate();
      
      return destination.stream;
    } catch (error) {
      console.error('Failed to initialize audio processor:', error);
      return stream; // Return original stream on failure
    }
  }

  startNoiseGate() {
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const NOISE_THRESHOLD = 20;
    const GATE_CLOSE_TIME = 100; // ms
    
    let silentTime = 0;
    let lastCheckTime = Date.now();
    
    const checkNoise = () => {
      if (!this.enabled) {
        requestAnimationFrame(checkNoise);
        return;
      }
      
      const now = Date.now();
      const deltaTime = now - lastCheckTime;
      lastCheckTime = now;
      
      this.analyserNode.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      
      if (average < NOISE_THRESHOLD) {
        silentTime += deltaTime;
        
        if (silentTime > GATE_CLOSE_TIME) {
          this.gainNode.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.01);
        }
      } else {
        silentTime = 0;
        this.gainNode.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.01);
      }
      
      requestAnimationFrame(checkNoise);
    };
    
    checkNoise();
  }

  enable() {
    this.enabled = true;
    console.log('Audio processor enabled');
  }

  disable() {
    this.enabled = false;
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.01);
    }
    console.log('Audio processor disabled');
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
