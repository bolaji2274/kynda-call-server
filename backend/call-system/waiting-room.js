// call-system/waiting-room.js
const waitingRooms = new Map(); // roomId -> Set of socketIds

function addToWaitingRoom(roomId, socketId, userData) {
  if (!waitingRooms.has(roomId)) {
    waitingRooms.set(roomId, new Map());
  }
  
  waitingRooms.get(roomId).set(socketId, {
    socketId,
    userId: userData.userId,
    userName: userData.userName,
    joinedAt: Date.now(),
  });
}

function removeFromWaitingRoom(roomId, socketId) {
  if (waitingRooms.has(roomId)) {
    waitingRooms.get(roomId).delete(socketId);
    
    if (waitingRooms.get(roomId).size === 0) {
      waitingRooms.delete(roomId);
    }
  }
}

function getWaitingParticipants(roomId) {
  if (!waitingRooms.has(roomId)) {
    return [];
  }
  
  return Array.from(waitingRooms.get(roomId).values());
}

// Socket handlers
socket.on('request-to-join', async ({ roomId, sessionId }, callback) => {
  try {
    const session = await Session.findById(sessionId);
    
    if (!session) {
      return callback({ error: 'Session not found' });
    }
    
    // If user is the host (tutor), let them in directly
    if (session.tutorId.toString() === socket.userId) {
      return callback({ admitted: true, isHost: true });
    }
    
    // If waiting room is enabled, add to waiting room
    if (session.waitingRoomEnabled) {
      addToWaitingRoom(roomId, socket.id, {
        userId: socket.userId,
        userName: socket.userName,
      });
      
      // Notify host
      const hostSocket = findSocketByUserId(session.tutorId);
      if (hostSocket) {
        io.to(hostSocket.id).emit('participant-waiting', {
          socketId: socket.id,
          userId: socket.userId,
          userName: socket.userName,
        });
      }
      
      callback({ admitted: false, waiting: true });
    } else {
      // No waiting room, admit directly
      callback({ admitted: true });
    }
    
  } catch (error) {
    callback({ error: error.message });
  }
});

socket.on('admit-participant', ({ socketId }, callback) => {
  const roomId = socketToRoom.get(socket.id);
  
  // Verify user is host
  // ...authorization check...
  
  const participant = Array.from(waitingRooms.get(roomId)?.values() || [])
    .find(p => p.socketId === socketId);
  
  if (participant) {
    removeFromWaitingRoom(roomId, socketId);
    
    // Notify participant they're admitted
    io.to(socketId).emit('admitted-to-call', { roomId });
    
    callback({ success: true });
  } else {
    callback({ error: 'Participant not found' });
  }
});

socket.on('deny-participant', ({ socketId }, callback) => {
  const roomId = socketToRoom.get(socket.id);
  
  removeFromWaitingRoom(roomId, socketId);
  
  // Notify participant
  io.to(socketId).emit('denied-entry', {
    message: 'Host denied your request to join',
  });
  
  callback({ success: true });
});