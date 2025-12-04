const userController = require('../controllers/userController');

async function userRoutes(fastify, options) {
  // Этот хук защищает все маршруты внутри этого файла
  // Требуется роль минимум 'user' (то есть любой авторизованный)
  fastify.addHook('preHandler', fastify.checkPermission('user'));

  fastify.get('/profile', userController.getProfile);
  fastify.put('/profile', userController.updateProfile);
}

module.exports = userRoutes;