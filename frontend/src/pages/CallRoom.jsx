import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CallInterface from '../components/CallInterface';
import { getSession } from '../services/api';

function CallRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const token = localStorage.getItem('token'); // Your existing auth token
      const response = await getSession(sessionId, token);
      setSession(response.session);
    } catch (err) {
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    navigate('/dashboard'); // Redirect to your dashboard
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">{error || 'Session not found'}</div>
      </div>
    );
  }

  return (
    <CallInterface
      sessionId={sessionId}
      roomId={session.roomId}
      token={localStorage.getItem('token')} // Your existing auth token
      onLeave={handleLeave}
    />
  );
}

export default CallRoom;