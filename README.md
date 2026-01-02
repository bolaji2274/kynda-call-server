# Kynda Learning Platform - Call System

A scalable, production-ready voice/video call system built for the Kynda learning platform.

## Features

- ✅ Voice-first architecture (low bandwidth)
- ✅ WebRTC-based real-time communication
- ✅ SFU architecture with Mediasoup
- ✅ Horizontal scalability
- ✅ Screen sharing
- ✅ In-call chat
- ✅ Quality monitoring
- ✅ Call recording (optional)

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- Docker (optional)

### Installation

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Edit with your config
   npm run dev
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Start Services**
   ```bash
   # Start MongoDB
   mongod

   # Start Redis
   redis-server

   # Or use Docker
   docker-compose up -d
   ```

### Environment Variables

See `.env` files in `backend/` and `frontend/` directories.

**Important**: 
- Change `JWT_SECRET` to a secure random string
- Set `MEDIASOUP_ANNOUNCED_IP` to your public IP in production
- Configure TURN server for production use

## Project Structure

```
kynda-call-platform/
├── backend/
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── models/       # MongoDB models
│   │   ├── services/     # Business logic
│   │   ├── controllers/  # Route controllers
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── socket/       # Socket.io handlers
│   │   └── app.js        # Main application
│   ├── .env              # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API services
│   │   └── pages/        # Page components
│   ├── .env
│   └── package.json
├── infrastructure/
│   ├── nginx/           # Nginx configs
│   ├── coturn/          # TURN server config
│   ├── k8s/             # Kubernetes manifests
│   └── docker-compose.yml
└── README.md
```

## API Endpoints

### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions` - Get user sessions
- `GET /api/sessions/:id` - Get session details
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Cancel session

### Calls
- `GET /api/calls/stats/:sessionId` - Get call statistics
- `GET /api/calls/quality-report` - Get quality report

## Socket.io Events

### Client → Server
- `join-room` - Join a call room
- `leave-room` - Leave a call room
- `get-router-capabilities` - Get media router capabilities
- `create-transport` - Create WebRTC transport
- `connect-transport` - Connect transport
- `produce` - Start producing media
- `consume` - Start consuming media
- `send-chat-message` - Send chat message
- `raise-hand` - Raise hand
- `start-screen-share` - Start screen sharing

### Server → Client
- `user-joined` - User joined room
- `user-left` - User left room
- `new-producer` - New media producer available
- `producer-closed` - Producer closed
- `chat-message` - Chat message received
- `hand-raised` - User raised hand
- `screen-share-started` - Screen share started

## Deployment

### Docker

```bash
docker-compose up -d
```

### Kubernetes

```bash
kubectl apply -f infrastructure/k8s/
```

### Manual

```bash
# Install PM2
npm install -g pm2

# Start backend
cd backend
pm2 start ecosystem.config.js

# Build frontend
cd frontend
npm run build

# Serve with Nginx
```

## Performance

### Expected Metrics

- **Audio-only**: ~32 kbps per user, ~14 MB/hour
- **With video**: ~300-1500 kbps per user
- **Latency**: 80-150ms typical
- **Concurrent users**: 100+ per server (4 CPU, 8GB RAM)

## Scaling

- **0-100 users**: Single server
- **100-1,000 users**: 2-3 servers + load balancer
- **1,000+ users**: Kubernetes + auto-scaling

## Troubleshooting

### Common Issues

1. **Socket connection fails**
   - Check CORS settings
   - Verify Socket.io configuration

2. **No audio/video**
   - Check browser permissions
   - Verify TURN/STUN configuration
   - Ensure UDP ports are open

3. **High latency**
   - Check server location
   - Verify network quality
   - Consider using TURN server

## License

Proprietary - Kynda Learning Platform

## Support

For issues and questions, contact: support@kynda.com
