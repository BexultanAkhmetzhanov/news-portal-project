const govController = require('../controllers/govController');

async function govRoutes(fastify, options) {
  // Публичный доступ (чтобы все видели структуру)
  fastify.get('/', govController.getTree);

  // Админский доступ (управление)
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.checkPermission('admin')] }, govController.addPosition);
  fastify.put('/:id', { preHandler: [fastify.authenticate, fastify.checkPermission('admin')] }, govController.updatePosition);
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.checkPermission('admin')] }, govController.deletePosition);
}

module.exports = govRoutes;