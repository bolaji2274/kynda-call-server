// MISSING FILE 6: frontend/src/components/Loading.jsx
// ============================================================================

import React from 'react';

function Loading({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">{message}</p>
      </div>
    </div>
  );
}

export default Loading;
