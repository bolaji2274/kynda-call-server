// ============================================================================
// ROUTES
// ============================================================================

// src/routes/session.routes.js
const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const { validate, sessionSchemas } = require('../middleware/validation.middleware');
const { sessionCreateLimiter } = require('../middleware/rateLimit.middleware');

router.post(
  '/',
  sessionCreateLimiter,
  validate(sessionSchemas.create),
  sessionController.createSession
);

router.get('/', sessionController.getUserSessions);

router.get('/:sessionId', sessionController.getSession);

router.put(
  '/:sessionId',
  validate(sessionSchemas.update),
  sessionController.updateSession
);

router.delete('/:sessionId', sessionController.deleteSession);

module.exports = router;