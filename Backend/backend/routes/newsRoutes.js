const newsController = require('../controllers/newsController');
// ВАЖНО: Добавили импорт adminController
const adminController = require('../controllers/adminController'); 

const commentSchema = {
  body: {
    type: 'object',
    required: ['content'],
    properties: {
      content: { type: 'string', minLength: 1 },
      parent_id: { type: ['integer', 'null'] }
    }
  }
};

async function newsRoutes(fastify, options) {
  
  // --- Публичные маршруты ---
  
  // КАТЕГОРИИ: Добавляем ВСЕ варианты, чтобы фронтенд не получал 404
  fastify.get('/categories', newsController.getCategories);
  fastify.get('/category/:slug', newsController.getNewsByCategory);
  fastify.get('/categories/:slug', newsController.getNewsByCategory);
  fastify.get('/news/category/:slug', newsController.getNewsByCategory); // Для страховки

  fastify.get('/search', newsController.searchNews);
  fastify.get('/news', newsController.getNewsList);
  
  // Важно: популярные и топ новости выше, чем /news/:id
  fastify.get('/news/popular', newsController.getPopularNews);
  fastify.get('/news/featured', newsController.getFeaturedNews);
  
  fastify.get('/news/:id', newsController.getNewsById);
  
  // Комментарии
  fastify.get('/news/:id/comments', newsController.getComments);
  fastify.post('/news/:id/comments', {
    schema: commentSchema,
    preHandler: fastify.checkPermission('user') 
  }, newsController.createComment);

  // Голосование
  fastify.post('/comments/:id/vote', {
    preHandler: fastify.checkPermission('user')
  }, newsController.voteComment);

  fastify.post('/news/:id/vote', {
    preHandler: fastify.checkPermission('user')
  }, newsController.voteNews);

  fastify.get('/news/:id/vote-status', {
    preHandler: fastify.checkPermission('user')
  }, newsController.getUserVote);

  fastify.delete('/comments/:id', {
    preHandler: [fastify.authenticate] 
  }, newsController.deleteComment);

  // Курсы валют (старая логика)
  fastify.get('/rates', newsController.getExchangeRates);

  // --- РЕКЛАМА ---
  // Получение (публичное)
  fastify.get('/ads', newsController.getAds);
  
  // Админка (защищенные маршруты)
  fastify.post('/ads', {
    preHandler: [fastify.authenticate, fastify.checkPermission('admin')] 
  }, adminController.createAd);

  fastify.delete('/ads/:id', {
    preHandler: [fastify.authenticate, fastify.checkPermission('admin')]
  }, adminController.deleteAd);
}

module.exports = newsRoutes;