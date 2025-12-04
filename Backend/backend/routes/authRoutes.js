const authController = require('../controllers/authController');

// Схемы валидации можно оставить здесь или вынести отдельно
const registerSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { 
        type: 'string', 
        minLength: 3, 
        maxLength: 30,
        pattern: '^[a-zA-Z0-9_]+$' 
      }, 
      password: { 
        type: 'string', 
        minLength: 8,
        pattern: '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])' 
      } 
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

async function authRoutes(fastify, options) {
  fastify.post('/register', { schema: registerSchema }, authController.register);
  fastify.post('/login', { schema: loginSchema }, authController.login);
  fastify.post('/logout', authController.logout);
}

module.exports = authRoutes;