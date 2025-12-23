const userController = require('../controllers/userController');

async function userRoutes(fastify, options) {
  // Получить профиль
  fastify.get('/profile', {
    preHandler: fastify.checkPermission('user')
  }, userController.getProfile);

  // Обновить профиль (имя/пароль)
  fastify.put('/profile', {
    preHandler: fastify.checkPermission('user')
  }, userController.updateProfile);

  // НОВЫЙ РОУТ: Загрузка аватара
  fastify.post('/profile/avatar', {
    preHandler: fastify.checkPermission('user')
  }, userController.uploadAvatar);
}

module.exports = userRoutes;