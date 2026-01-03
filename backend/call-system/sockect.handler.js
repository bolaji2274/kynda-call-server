// call-system/socket.handlers.js

// Add to your socket handlers
socket.on('start-screen-share', async (data, callback) => {
  try {
    const { transportId, rtpParameters } = data;
    const roomId = socketToRoom.get(socket.id);
    
    // Create producer for screen share
    const { id } = await mediasoupService.produce(
      transportId,
      'video',
      rtpParameters,
      { 
        socketId: socket.id, 
        userId: socket.userId, 
        roomId,
        isScreenShare: true, // Mark as screen share
      }
    );
    
    // Store screen share producer
    screenShareProducers.set(socket.id, id);
    
    // Notify all participants
    socket.to(roomId).emit('screen-share-started', {
      userId: socket.userId,
      producerId: id,
      socketId: socket.id,
    });
    
    callback({ success: true, producerId: id });
    
  } catch (error) {
    console.error('Screen share error:', error);
    callback({ error: error.message });
  }
});

socket.on('stop-screen-share', (data, callback) => {
  const roomId = socketToRoom.get(socket.id);
  const producerId = screenShareProducers.get(socket.id);
  
  if (producerId) {
    mediasoupService.closeProducer(producerId);
    screenShareProducers.delete(socket.id);
    
    socket.to(roomId).emit('screen-share-stopped', {
      userId: socket.userId,
      socketId: socket.id,
    });
  }
  
  callback({ success: true });
});

// call-system/socket.handlers.js

// Chat history per room
const chatHistory = new Map(); // roomId -> messages[]

socket.on('send-chat-message', async (data) => {
  const { message, timestamp } = data;
  const roomId = socketToRoom.get(socket.id);
  
  if (!roomId) return;
  
  const chatMessage = {
    id: Date.now().toString(),
    userId: socket.userId,
    userName: socket.userName, // Add userName during auth
    message,
    timestamp: timestamp || Date.now(),
  };
  
  // Store in history
  if (!chatHistory.has(roomId)) {
    chatHistory.set(roomId, []);
  }
  chatHistory.get(roomId).push(chatMessage);
  
  // Keep only last 100 messages
  const messages = chatHistory.get(roomId);
  if (messages.length > 100) {
    messages.shift();
  }
  
  // Broadcast to room (including sender)
  io.to(roomId).emit('chat-message', chatMessage);
  
  // Optional: Save to database
  await saveChatMessage(roomId, chatMessage);
});

socket.on('get-chat-history', (data, callback) => {
  const roomId = socketToRoom.get(socket.id);
  const messages = chatHistory.get(roomId) || [];
  callback({ messages });
});

// call-system/socket.handlers.js

// Active hand raises per room
const handRaises = new Map(); // roomId -> Set of userIds

socket.on('raise-hand', () => {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;
  
  if (!handRaises.has(roomId)) {
    handRaises.set(roomId, new Set());
  }
  
  handRaises.get(roomId).add(socket.userId);
  
  // Broadcast to room
  io.to(roomId).emit('hand-raised', {
    userId: socket.userId,
    userName: socket.userName,
  });
});

socket.on('lower-hand', () => {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;
  
  if (handRaises.has(roomId)) {
    handRaises.get(roomId).delete(socket.userId);
  }
  
  io.to(roomId).emit('hand-lowered', {
    userId: socket.userId,
  });
});

socket.on('send-reaction', (data) => {
  const { emoji } = data;
  const roomId = socketToRoom.get(socket.id);
  
  if (!roomId) return;
  
  // Broadcast reaction (temporary, doesn't persist)
  socket.to(roomId).emit('reaction', {
    userId: socket.userId,
    userName: socket.userName,
    emoji,
    timestamp: Date.now(),
  });
});

socket.on('start-recording', async (data, callback) => {
  try {
    const roomId = socketToRoom.get(socket.id);
    const router = await mediasoupService.getRouter(roomId);
    
    // Only tutor can start recording
    if (socket.userRole !== 'tutor') {
      return callback({ error: 'Only tutors can start recording' });
    }
    
    const result = await recordingService.startRecording(roomId, router);
    
    // Notify all participants
    io.to(roomId).emit('recording-started', {
      fileName: result.fileName,
    });
    
    callback({ success: true, ...result });
    
  } catch (error) {
    callback({ error: error.message });
  }
});

socket.on('stop-recording', async (data, callback) => {
  try {
    const roomId = socketToRoom.get(socket.id);
    
    const result = await recordingService.stopRecording(roomId);
    
    // Update session with recording URL
    await Session.findOneAndUpdate(
      { roomId },
      { recordingUrl: result.url }
    );
    
    io.to(roomId).emit('recording-stopped', {
      url: result.url,
      duration: result.duration,
    });
    
    callback({ success: true, ...result });
    
  } catch (error) {
    callback({ error: error.message });
  }
});