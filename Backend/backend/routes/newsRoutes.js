const newsController = require('../controllers/newsController');

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
  
  fastify.get('/categories', newsController.getCategories);
  fastify.get('/ads', newsController.getAds);
  fastify.get('/search', newsController.searchNews);

  fastify.get('/news', newsController.getNewsList);
  fastify.get('/news/popular', newsController.getPopularNews);
  fastify.get('/news/featured', newsController.getFeaturedNews);
  fastify.get('/news/category/:slug', newsController.getNewsByCategory);
  fastify.get('/news/:id', newsController.getNewsById);
  
  
  // Комментарии
  fastify.get('/news/:id/comments', newsController.getComments);
  
  fastify.post('/news/:id/comments', {
    schema: commentSchema,
    preHandler: fastify.checkPermission('user') 
  }, newsController.createComment);

  // Голосование за комментарии (НОВОЕ)
  fastify.post('/comments/:id/vote', {
    preHandler: fastify.checkPermission('user')
  }, newsController.voteComment);

  // Голосование за новости
  fastify.post('/news/:id/vote', {
    preHandler: fastify.checkPermission('user')
  }, newsController.voteNews);

  fastify.get('/news/:id/vote-status', {
    preHandler: fastify.checkPermission('user')
  }, newsController.getUserVote);

  // ИСПРАВЛЕНИЕ ЗДЕСЬ: Добавили проверку токена (authenticate)
  fastify.delete('/comments/:id', {
    preHandler: [fastify.authenticate] 
  }, newsController.deleteComment);
}

module.exports = newsRoutes;