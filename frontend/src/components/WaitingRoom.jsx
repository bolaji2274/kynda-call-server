// components/WaitingRoom.jsx
import React, { useState, useEffect } from 'react';
import { Clock, UserCheck, UserX } from 'lucide-react';

function WaitingRoom({ socket, roomId, onAdmitted }) {
  const [status, setStatus] = useState('requesting');

  useEffect(() => {
    // Request to join
    socket.emit('request-to-join', { roomId }, (response) => {
      if (response.admitted) {
        onAdmitted();
      } else if (response.waiting) {
        setStatus('waiting');
      } else if (response.error) {
        setStatus('error');
      }
    });

    // Listen for admission
    socket.on('admitted-to-call', () => {
      setStatus('admitted');
      onAdmitted();
    });

    // Listen for denial
    socket.on('denied-entry', () => {
      setStatus('denied');
    });

    return () => {
      socket.off('admitted-to-call');
      socket.off('denied-entry');
    };
  }, [socket, roomId, onAdmitted]);

  if (status === 'admitted') {
    return null;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-center max-w-md">
        {status === 'requesting' && (
          <>
            <Clock className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-pulse" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Requesting to Join...
            </h2>
            <p className="text-gray-400">
              Please wait while we connect you to the call
            </p>
          </>
        )}

        {status === 'waiting' && (
          <>
            <Clock className="w-16 h-16 mx-auto mb-4 text-yellow-500 animate-pulse" />
            <h2 className="text-2xl font-bold text-white mb-2">
              In Waiting Room
            </h2>
            <p className="text-gray-400">
              The host will admit you shortly
            </p>
          </>
        )}

        {status === 'denied' && (
          <>
            <UserX className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Entry Denied
            </h2>
            <p className="text-gray-400">
              The host has denied your request to join
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Error
            </h2>
            <p className="text-gray-400">
              Something went wrong. Please try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default WaitingRoom;