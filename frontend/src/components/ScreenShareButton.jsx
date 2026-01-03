// components/ScreenShareButton.jsx
import React from 'react';
import { Monitor, MonitorOff } from 'lucide-react';
import { useScreenShare } from '../hooks/useScreenShare';

function ScreenShareButton({ socket, sendTransport, producersRef }) {
  const { isSharing, startScreenShare, stopScreenShare } = useScreenShare(
    socket,
    sendTransport,
    producersRef
  );

  const handleToggle = async () => {
    if (isSharing) {
      stopScreenShare();
    } else {
      const result = await startScreenShare();
      if (result.error) {
        alert(`Screen share failed: ${result.error}`);
      }
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-4 rounded-full ${
        isSharing
          ? 'bg-blue-600 hover:bg-blue-700 text-white'
          : 'bg-gray-700 hover:bg-gray-600 text-white'
      }`}
      title={isSharing ? 'Stop sharing' : 'Share screen'}
    >
      {isSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
    </button>
  );
}

export default ScreenShareButton;