import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserSessions } from '../services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const token = localStorage.getItem('token');
    const data = await getUserSessions(token);
    setSessions(data.sessions);
  };

  const joinCall = (sessionId) => {
    // Navigate to call room
    navigate(`/call/${sessionId}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Sessions</h1>
      
      <div className="space-y-4">
        {sessions.map(session => (
          <div key={session._id} className="border p-4 rounded-lg">
            <h3 className="font-semibold">
              Session with {session.tutorId === user.id ? 'Student' : 'Tutor'}
            </h3>
            <p className="text-gray-600">
              {new Date(session.scheduledAt).toLocaleString()}
            </p>
            
            {/* Join Call Button */}
            {session.status === 'scheduled' && (
              <button
                onClick={() => joinCall(session._id)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Join Call
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;