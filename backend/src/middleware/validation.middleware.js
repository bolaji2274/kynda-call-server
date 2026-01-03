// src/middleware/validation.middleware.js
const Joi = require('joi');

/**
 * Validation middleware factory
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    
    // Replace body with validated/sanitized value
    req.body = value;
    next();
  };
};

// Session validation schemas
const sessionSchemas = {
  create: Joi.object({
    tutorId: Joi.string().required(),
    studentId: Joi.string().required(),
    scheduledAt: Joi.date().iso().min('now').required(),
    recordingEnabled: Joi.boolean().default(false),
    waitingRoomEnabled: Joi.boolean().default(true),
  }),
  
  update: Joi.object({
    scheduledAt: Joi.date().iso().min('now'),
    status: Joi.string().valid('scheduled', 'active', 'completed', 'cancelled'),
    recordingEnabled: Joi.boolean(),
    waitingRoomEnabled: Joi.boolean(),
  }),
};

// Call validation schemas
const callSchemas = {
  joinRoom: Joi.object({
    roomId: Joi.string().required(),
    sessionId: Joi.string().required(),
  }),
  
  transportCreate: Joi.object({
    roomId: Joi.string().required(),
    direction: Joi.string().valid('send', 'recv').required(),
  }),
  
  transportConnect: Joi.object({
    transportId: Joi.string().required(),
    dtlsParameters: Joi.object().required(),
  }),
  
  produce: Joi.object({
    transportId: Joi.string().required(),
    kind: Joi.string().valid('audio', 'video').required(),
    rtpParameters: Joi.object().required(),
  }),
  
  consume: Joi.object({
    transportId: Joi.string().required(),
    producerId: Joi.string().required(),
    rtpCapabilities: Joi.object().required(),
  }),
};

// Query validation
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        error: 'Query validation failed',
        details: errors,
      });
    }
    
    req.query = value;
    next();
  };
};

// Params validation
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      return res.status(400).json({
        error: 'Parameter validation failed',
        details: errors,
      });
    }
    
    req.params = value;
    next();
  };
};

// Common validation schemas
const commonSchemas = {
  mongoId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
  
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().default('-createdAt'),
  }),
  
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
  }),
};

module.exports = {
  validate,
  validateQuery,
  validateParams,
  sessionSchemas,
  callSchemas,
  commonSchemas,
};