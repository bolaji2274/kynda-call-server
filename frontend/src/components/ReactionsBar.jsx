// components/ReactionsBar.jsx
import React, { useState } from 'react';
import { Hand, ThumbsUp, Heart, Smile, Frown } from 'lucide-react';

function ReactionsBar({ socket, onHandRaise, isHandRaised }) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const reactions = [
    { emoji: '👍', label: 'Thumbs up' },
    { emoji: '❤️', label: 'Heart' },
    { emoji: '😂', label: 'Laugh' },
    { emoji: '😮', label: 'Surprised' },
    { emoji: '👏', label: 'Clap' },
  ];

  const sendReaction = (emoji) => {
    socket.emit('send-reaction', { emoji });
    setShowEmojiPicker(false);
  };

  return (
    <div className="relative">
      {/* Hand raise button */}
      <button
        onClick={onHandRaise}
        className={`p-4 rounded-full ${
          isHandRaised
            ? 'bg-yellow-500 hover:bg-yellow-600'
            : 'bg-gray-700 hover:bg-gray-600'
        } text-white`}
        title={isHandRaised ? 'Lower hand' : 'Raise hand'}
      >
        <Hand size={24} className={isHandRaised ? 'animate-bounce' : ''} />
      </button>

      {/* Emoji reactions */}
      {showEmojiPicker && (
        <div className="absolute bottom-full mb-2 bg-gray-800 rounded-lg p-2 flex gap-2">
          {reactions.map((reaction) => (
            <button
              key={reaction.emoji}
              onClick={() => sendReaction(reaction.emoji)}
              className="text-2xl hover:scale-125 transition-transform"
              title={reaction.label}
            >
              {reaction.emoji}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white ml-2"
        title="Send reaction"
      >
        <Smile size={24} />
      </button>
    </div>
  );
}

export default ReactionsBar;