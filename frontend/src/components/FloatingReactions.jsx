// components/FloatingReactions.jsx
import React, { useState, useEffect } from 'react';

function FloatingReactions({ socket }) {
  const [reactions, setReactions] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleReaction = (data) => {
      const id = `${data.userId}-${data.timestamp}`;
      
      setReactions(prev => [...prev, { ...data, id }]);

      // Remove after animation (3 seconds)
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    };

    socket.on('reaction', handleReaction);

    return () => {
      socket.off('reaction', handleReaction);
    };
  }, [socket]);

  return (
    <div className="fixed bottom-32 right-8 pointer-events-none">
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="text-6xl animate-float-up"
          style={{
            animation: 'floatUp 3s ease-out forwards',
          }}
        >
          {reaction.emoji}
        </div>
      ))}
      
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          20% {
            transform: translateY(-20px) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-200px) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default FloatingReactions;