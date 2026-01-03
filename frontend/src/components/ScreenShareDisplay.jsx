// components/ScreenShareDisplay.jsx
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

function ScreenShareDisplay({ stream, userName, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Screen share video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
      
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
        <div className="bg-black bg-opacity-60 px-4 py-2 rounded-lg text-white">
          {userName} is sharing their screen
        </div>
        
        <button
          onClick={onClose}
          className="bg-red-600 hover:bg-red-700 p-2 rounded-full text-white"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
}

export default ScreenShareDisplay;