const db = require('../db');

// --- НОВОСТИ ---

const getNewsList = async (request, reply) => {
  const { page = 1, limit = 20 } = request.query;
  const offset = (page - 1) * limit;

  const countStmt = db.prepare("SELECT COUNT(*) as total FROM news WHERE status = 'approved' AND is_featured = 0");
  const { total } = countStmt.get();
  
  const stmt = db.prepare(`
    SELECT 
      news.*, 
      categories.name as categoryName, 
      categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.status = 'approved' AND news.is_featured = 0
    ORDER BY news.createdAt DESC
    LIMIT ? OFFSET ?
  `);
  
  const news = stmt.all(limit, offset);

  return {
    data: news,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

const getNewsById = async (request, reply) => {
  const { id } = request.params;
  try {
    db.prepare('UPDATE news SET view_count = view_count + 1 WHERE id = ?').run(id);
  } catch (e) { /* ignore */ }

  const stmt = db.prepare(`
    SELECT 
      news.*, 
      categories.name as categoryName, 
      categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.id = ? AND news.status = 'approved'
  `);
  const article = stmt.get(id);
  if (!article) return reply.code(404).send({ error: 'Новость не найдена' });
  return article;
};

const getPopularNews = async (request, reply) => {
  const stmt = db.prepare(`
    SELECT news.id, news.title, news.view_count, news.imageUrl, news.createdAt,
      categories.name as categoryName, categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.status = 'approved'
    ORDER BY news.view_count DESC 
    LIMIT 5
  `);
  return stmt.all();
};

const getFeaturedNews = async (request, reply) => {
  const stmt = db.prepare(`
    SELECT news.*, categories.name as categoryName, categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.is_featured = 1 AND news.status = 'approved'
    ORDER BY news.createdAt DESC 
    LIMIT 1
  `);
  const featured = stmt.get();
  return featured || null;
};

const getNewsByCategory = async (request, reply) => {
  const { slug } = request.params;
  const { page = 1, limit = 20 } = request.query;
  const offset = (page - 1) * limit;

  const catStmt = db.prepare('SELECT id, name FROM categories WHERE slug = ?');
  const category = catStmt.get(slug);
  
  if (!category) return reply.code(404).send({ error: 'Категория не найдена' });

  const countStmt = db.prepare("SELECT COUNT(*) as total FROM news WHERE category_id = ? AND status = 'approved'");
  const { total } = countStmt.get(category.id);

  const stmt = db.prepare(`
    SELECT news.*, categories.name as categoryName, categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.category_id = ? AND news.status = 'approved'
    ORDER BY news.createdAt DESC
    LIMIT ? OFFSET ?
  `);
  
  const news = stmt.all(category.id, limit, offset);

  return {
    data: news,
    categoryName: category.name,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

const searchNews = async (request, reply) => {
  const { q } = request.query;
  if (!q || q.trim() === '') return [];
  
  const searchQuery = `%${q}%`;
  const stmt = db.prepare(`
    SELECT news.*, categories.name as categoryName, categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE (news.title LIKE ? OR news.content LIKE ?) AND news.status = 'approved'
    ORDER BY news.createdAt DESC
  `);
  return stmt.all(searchQuery, searchQuery);
};

// --- ВСПОМОГАТЕЛЬНЫЕ ---

const getCategories = async (request, reply) => {
  return db.prepare('SELECT * FROM categories').all();
};

const getAds = async (request, reply) => {
  return db.prepare('SELECT * FROM ads').all();
};

// --- КОММЕНТАРИИ ---

const getComments = async (request, reply) => {
  const { id } = request.params;
  return db.prepare('SELECT * FROM comments WHERE news_id = ? ORDER BY createdAt ASC').all(id);
};

const createComment = async (request, reply) => {
  const { id } = request.params;
  const { author, content } = request.body;

  try {
    const stmt = db.prepare('INSERT INTO comments (news_id, author, content) VALUES (?, ?, ?)');
    const info = stmt.run(Number(id), author, content); 
    const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(info.lastInsertRowid);
    return reply.code(201).send(newComment);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

module.exports = {
  getNewsList,
  getNewsById,
  getPopularNews,
  getFeaturedNews,
  getNewsByCategory,
  searchNews,
  getCategories,
  getAds,
  getComments,
  createComment
};