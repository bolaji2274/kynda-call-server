// call-system/services/recording.service.js
const ffmpeg = require('fluent-ffmpeg');
const { PassThrough } = require('stream');
const AWS = require('aws-sdk');

class RecordingService {
  constructor() {
    this.activeRecordings = new Map();
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });
  }

  async startRecording(roomId, router) {
    if (this.activeRecordings.has(roomId)) {
      throw new Error('Recording already in progress');
    }

    // Create plain transport for recording
    const transport = await router.createPlainTransport({
      listenIp: { ip: '127.0.0.1', announcedIp: null },
      rtcpMux: false,
      comedia: true,
    });

    // Audio consumer
    const audioProducer = this.findAudioProducer(roomId);
    const audioConsumer = await transport.consume({
      producerId: audioProducer.id,
      rtpCapabilities: router.rtpCapabilities,
      paused: false,
    });

    // FFmpeg process
    const outputStream = new PassThrough();
    const fileName = `recording-${roomId}-${Date.now()}.webm`;
    
    const ffmpegProcess = ffmpeg()
      .input(`rtp://127.0.0.1:${transport.tuple.localPort}`)
      .inputFormat('rtp')
      .audioCodec('libopus')
      .audioBitrate('32k')
      .format('webm')
      .on('start', (cmd) => {
        console.log('FFmpeg started:', cmd);
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
      })
      .on('end', () => {
        console.log('Recording finished');
      })
      .pipe(outputStream, { end: true });

    // Upload to S3
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Key: `recordings/${fileName}`,
      Body: outputStream,
      ContentType: 'audio/webm',
    };

    const upload = this.s3.upload(uploadParams);

    this.activeRecordings.set(roomId, {
      transport,
      consumer: audioConsumer,
      ffmpegProcess,
      upload,
      fileName,
      startTime: Date.now(),
    });

    return { fileName };
  }

  async stopRecording(roomId) {
    const recording = this.activeRecordings.get(roomId);
    if (!recording) {
      throw new Error('No active recording');
    }

    // Stop FFmpeg
    recording.ffmpegProcess.kill('SIGINT');

    // Wait for upload to complete
    const result = await recording.upload.promise();

    // Close consumer and transport
    recording.consumer.close();
    recording.transport.close();

    this.activeRecordings.delete(roomId);

    return {
      url: result.Location,
      duration: (Date.now() - recording.startTime) / 1000,
    };
  }

  findAudioProducer(roomId) {
    // Find first audio producer in room
    // Implementation depends on your producer tracking
    return mediasoupService.producers.values().next().value;
  }
}

module.exports = new RecordingService();