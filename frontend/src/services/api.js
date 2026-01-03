const API_URL = process.env.REACT_APP_API_URL;

// Add these functions to your existing API service
export async function createCallSession(tutorId, studentId, scheduledAt, token) {
  const response = await fetch(`${API_URL}/api/calls/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ tutorId, studentId, scheduledAt }),
  });
  return response.json();
}

export async function getSession(sessionId, token) {
  const response = await fetch(`${API_URL}/api/calls/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}

export async function endSession(sessionId, token) {
  const response = await fetch(`${API_URL}/api/calls/${sessionId}/end`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}

export async function getUserSessions(token) {
  const response = await fetch(`${API_URL}/api/sessions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}