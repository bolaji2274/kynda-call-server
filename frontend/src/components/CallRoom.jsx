// src/components/CallRoom.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { 
  Mic, MicOff, Video, VideoOff, Phone, PhoneOff,
  Monitor, Settings, Users, MessageSquare
} from 'lucide-react';

const CallRoom = ({ sessionId, roomId, token, onLeave }) => {
  const localVideoRef = useRef(null);
  const [remoteVideoRefs] = useState(new Map());
  const [showSettings, setShowSettings] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);

  const {
    isConnected,
    participants,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    error,
    connectionQuality,
    isReconnecting,
    startLocalMedia,
    toggleAudio,
    toggleVideo,
  } = useWebRTC(sessionId, roomId, token);

  // Start media on component mount
  useEffect(() => {
    if (isConnected && !localStream) {
      startLocalMedia(audioOnly).catch(err => {
        console.error('Failed to start media:', err);
      });
    }
  }, [isConnected, localStream, audioOnly, startLocalMedia]);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle remote streams
  useEffect(() => {
    remoteStreams.forEach((stream, socketId) => {
      let videoElement = remoteVideoRefs.get(socketId);
      
      if (!videoElement) {
        videoElement = document.getElementById(`remote-${socketId}`);
        if (videoElement) {
          remoteVideoRefs.set(socketId, videoElement);
        }
      }

      if (videoElement && videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
    });
  }, [remoteStreams, remoteVideoRefs]);

  const handleEndCall = () => {
    if (window.confirm('Are you sure you want to end the call?')) {
      onLeave();
    }
  };

  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'good': return 'bg-green-500';
      case 'fair': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (error && !isReconnecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Connection Error</div>
          <p className="text-gray-300 mb-4">{error}</p>
          <button
            onClick={onLeave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h2 className="text-white text-lg font-semibold">Kynda Learning Session</h2>
          {isReconnecting && (
            <span className="text-yellow-400 text-sm animate-pulse">
              Reconnecting...
            </span>
          )}
          {!isReconnecting && isConnected && (
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getQualityColor()}`} />
              <span className="text-gray-400 text-sm capitalize">
                {connectionQuality}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            title="Participants"
          >
            <Users size={20} />
            <span className="ml-1 text-sm">{participants.length + 1}</span>
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Remote videos grid */}
        <div className={`grid gap-2 h-full p-4 ${
          remoteStreams.size === 0 ? 'grid-cols-1' :
          remoteStreams.size === 1 ? 'grid-cols-1' :
          remoteStreams.size <= 4 ? 'grid-cols-2' :
          'grid-cols-3'
        }`}>
          {remoteStreams.size === 0 ? (
            <div className="flex items-center justify-center bg-gray-800 rounded-lg">
              <div className="text-center text-gray-400">
                <Users size={48} className="mx-auto mb-2" />
                <p>Waiting for others to join...</p>
              </div>
            </div>
          ) : (
            Array.from(remoteStreams.entries()).map(([socketId, stream]) => {
              const participant = participants.find(p => p.socketId === socketId);
              const hasVideo = stream.getVideoTracks().some(t => t.enabled);
              
              return (
                <div
                  key={socketId}
                  className="relative bg-gray-800 rounded-lg overflow-hidden"
                >
                  {hasVideo ? (
                    <video
                      id={`remote-${socketId}`}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                        {participant?.userId?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 px-3 py-1 rounded-lg">
                    <span className="text-white text-sm">
                      {participant?.userId || 'Anonymous'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Local video (pip) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg border-2 border-gray-700">
          {localStream && !audioOnly && isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                You
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 px-2 py-1 rounded text-xs text-white">
            You
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 py-6 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-center space-x-4">
          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            className={`p-4 rounded-full ${
              isAudioEnabled
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
            title={isAudioEnabled ? 'Mute' : 'Unmute'}
          >
            {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          {/* Video toggle */}
          {!audioOnly && (
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full ${
                isVideoEnabled
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isVideoEnabled ? 'Stop video' : 'Start video'}
            >
              {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          )}

          {/* Screen share */}
          <button
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
            title="Share screen"
          >
            <Monitor size={24} />
          </button>

          {/* Chat */}
          <button
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
            title="Chat"
          >
            <MessageSquare size={24} />
          </button>

          {/* End call */}
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white"
            title="End call"
          >
            <PhoneOff size={24} />
          </button>
        </div>

        {/* Audio only toggle */}
        <div className="flex justify-center mt-4">
          <label className="flex items-center space-x-2 text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={audioOnly}
              onChange={(e) => setAudioOnly(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Audio-only mode (save bandwidth)</span>
          </label>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-4">
          <h3 className="text-white font-semibold mb-4">Settings</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Connection Quality
              </label>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getQualityColor()}`} />
                <span className="text-white capitalize">{connectionQuality}</span>
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Participants
              </label>
              <span className="text-white">{participants.length + 1}</span>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Mirror effect for local video */}
      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
};

export default CallRoom;