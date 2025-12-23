const newsController = require('../controllers/newsController');

const commentSchema = {
  body: {
    type: 'object',
    required: ['content'], // author берем из токена или можно оставить, но лучше брать из user
    properties: {
      content: { type: 'string', minLength: 1 }
    }
  }
};

async function newsRoutes(fastify, options) {
  
  // Общие ресурсы
  fastify.get('/categories', newsController.getCategories);
  fastify.get('/ads', newsController.getAds);
  fastify.get('/search', newsController.searchNews);

  // Новости (специальные роуты СНАЧАЛА)
  fastify.get('/news', newsController.getNewsList);
  fastify.get('/news/popular', newsController.getPopularNews);
  fastify.get('/news/featured', newsController.getFeaturedNews);
  
  // Новости по категориям
  fastify.get('/news/category/:slug', newsController.getNewsByCategory);

  // Новости (роуты с параметрами В КОНЦЕ)
  fastify.get('/news/:id', newsController.getNewsById);
  
  // Комментарии
  fastify.get('/news/:id/comments', newsController.getComments);
  
  // ИЗМЕНЕНИЕ: Добавили preHandler для защиты (только авторизованные)
  fastify.post('/news/:id/comments', {
    schema: commentSchema,
    preHandler: fastify.checkPermission('user') 
  }, newsController.createComment);
}

module.exports = newsRoutes;