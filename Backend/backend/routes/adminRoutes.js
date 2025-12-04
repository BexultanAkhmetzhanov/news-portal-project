const adminController = require('../controllers/adminController');

// Схема для смены роли (Enum)
const roleSchema = {
  body: {
    type: 'object',
    required: ['role'],
    properties: {
      role: { type: 'string', enum: ['admin', 'editor', 'user'] } // Только эти значения!
    }
  }
};

// Схема для категории
const categorySchema = {
  body: {
    type: 'object',
    required: ['name', 'slug'],
    properties: {
      name: { type: 'string', minLength: 2 },
      slug: { type: 'string', minLength: 2, pattern: '^[a-z0-9-]+$' } // Только латиница и дефисы
    }
  }
};

async function adminRoutes(fastify, options) {
  
  // 1. РЕДАКТОРЫ
  fastify.register(async (editorRoutes) => {
    editorRoutes.addHook('preHandler', fastify.checkPermission('editor'));

    editorRoutes.get('/news/all', adminController.getAllNews);
    editorRoutes.get('/news/:id', adminController.getNewsById);
    
    // Для новостей с файлами (multipart) схему JSON применять сложно, оставляем как есть
    editorRoutes.post('/news', adminController.createNews);
    editorRoutes.put('/news/:id', adminController.updateNews);
    
    editorRoutes.delete('/news/:id', adminController.deleteNews);
    editorRoutes.put('/news/:id/feature', adminController.featureNews);
  });

  // 2. АДМИНЫ
  fastify.register(async (superAdminRoutes) => {
    superAdminRoutes.addHook('preHandler', fastify.checkPermission('admin'));

    superAdminRoutes.get('/users', adminController.getUsers);
    
    // ✅ Валидация роли
    superAdminRoutes.put('/users/:id/role', { schema: roleSchema }, adminController.updateUserRole);

    superAdminRoutes.get('/news/pending', adminController.getPendingNews);
    superAdminRoutes.put('/news/:id/approve', adminController.approveNews);

    // ✅ Валидация категорий
    superAdminRoutes.post('/categories', { schema: categorySchema }, adminController.createCategory);
    superAdminRoutes.put('/categories/:id', { schema: categorySchema }, adminController.updateCategory);
    
    superAdminRoutes.delete('/categories/:id', adminController.deleteCategory);
  });
}

module.exports = adminRoutes;