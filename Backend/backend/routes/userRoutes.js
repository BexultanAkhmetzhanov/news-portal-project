const userController = require('../controllers/userController');

async function userRoutes(fastify, options) {
  // Хук защиты: требуется авторизация для любых действий с юзерами
  fastify.addHook('preHandler', fastify.checkPermission('user'));

  // Получить профиль (GET /users/profile)
  fastify.get('/profile', userController.getProfile);

  // Обновить профиль по ID (PUT /users/:id)
  fastify.put('/:id', userController.updateProfile);

  // Сменить пароль (PUT /users/:id/password)
  fastify.put('/:id/password', userController.changePassword);
}

module.exports = userRoutes;