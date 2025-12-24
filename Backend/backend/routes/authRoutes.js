const authController = require('../controllers/authController');

const registerSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 30 }, 
      password: { type: 'string', minLength: 8 } 
    }
  }
};

const loginSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string' },
      password: { type: 'string' }
    }
  }
};

// Схема для Google теперь простая
const googleAuthSchema = {
  body: {
    type: 'object',
    required: ['token'],
    properties: {
      token: { type: 'string' }
    }
  }
};

async function authRoutes(fastify, options) {
  fastify.post('/register', { schema: registerSchema }, authController.register);
  fastify.post('/login', { schema: loginSchema }, authController.login);
  fastify.post('/google', { schema: googleAuthSchema }, authController.googleAuth);
  fastify.post('/logout', authController.logout);
  
  fastify.get('/me', {
      preHandler: [fastify.authenticate]
  }, authController.getMe);
}

module.exports = authRoutes;