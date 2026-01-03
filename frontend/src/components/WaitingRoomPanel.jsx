// components/WaitingRoomPanel.jsx
import React, { useState, useEffect } from "react";
import { UserCheck, UserX, Users } from "lucide-react";

function WaitingRoomPanel({ socket }) {
  const [waitingParticipants, setWaitingParticipants] = useState([]);
  useEffect(() => {
    if (!socket) return;
    socket.on("participant-waiting", (data) => {
      setWaitingParticipants((prev) => [...prev, data]);
    });
    return () => {
      socket.off("participant-waiting");
    };
  }, [socket]);

  const admitParticipant = (participantId) => {
    socket.emit("admit-participant", { socketId }, (response) => {
      if (response.success) {
        setWaitingParticipants((prev) =>
          prev.filter((p) => p.socketId !== socketId)
        );
      }
    });
  };

  const denyParticipant = (socketId) => {
    socket.emit("deny-participant", { socketId }, (response) => {
      if (response.success) {
        setWaitingParticipants((prev) =>
          prev.filter((p) => p.socketId !== socketId)
        );
      }
    });
  };

  if (waitingParticipants.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 bg-gray-800 rounded-lg p-4 shadow-xl max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <Users size={20} className="text-yellow-500" />
        <h3 className="text-white font-semibold">
          Waiting Room ({waitingParticipants.length})
        </h3>
      </div>

      <div className="space-y-2">
        {waitingParticipants.map((participant) => (
          <div
            key={participant.socketId}
            className="flex items-center justify-between bg-gray-700 p-3 rounded-lg"
          >
            <span className="text-white text-sm">{participant.userName}</span>

            <div className="flex gap-2">
              <button
                onClick={() => admitParticipant(participant.socketId)}
                className="p-2 bg-green-600 hover:bg-green-700 rounded text-white"
                title="Admit"
              >
                <UserCheck size={16} />
              </button>

              <button
                onClick={() => denyParticipant(participant.socketId)}
                className="p-2 bg-red-600 hover:bg-red-700 rounded text-white"
                title="Deny"
              >
                <UserX size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WaitingRoomPanel;
