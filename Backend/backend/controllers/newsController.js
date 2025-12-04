const db = require('../db');

const getNewsList = async (request, reply) => {
  const { page = 1, limit = 20 } = request.query;
  const offset = (page - 1) * limit;

  const countRes = await db.query("SELECT COUNT(*) FROM news WHERE status = 'approved' AND is_featured = 0");
  const total = parseInt(countRes.rows[0].count);
  
  const res = await db.query(`
    SELECT 
      news.*, 
      categories.name as "categoryName", 
      categories.slug as "categorySlug",
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.status = 'approved' AND news.is_featured = 0
    ORDER BY news."createdAt" DESC
    LIMIT $1 OFFSET $2
  `, [limit, offset]);

  return {
    data: res.rows,
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
    await db.query('UPDATE news SET view_count = view_count + 1 WHERE id = $1', [id]);
  } catch (e) {}

  const res = await db.query(`
    SELECT 
      news.*, 
      categories.name as "categoryName", 
      categories.slug as "categorySlug",
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.id = $1 AND news.status = 'approved'
  `, [id]);

  const article = res.rows[0];
  if (!article) return reply.code(404).send({ error: 'Новость не найдена' });
  return article;
};

const getPopularNews = async (request, reply) => {
  const res = await db.query(`
    SELECT news.id, news.title, news.view_count, news."imageUrl", news."createdAt",
      categories.name as "categoryName", categories.slug as "categorySlug",
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.status = 'approved'
    ORDER BY news.view_count DESC 
    LIMIT 5
  `);
  return res.rows;
};

const getFeaturedNews = async (request, reply) => {
  const res = await db.query(`
    SELECT news.*, categories.name as "categoryName", categories.slug as "categorySlug",
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.is_featured = 1 AND news.status = 'approved'
    ORDER BY news."createdAt" DESC 
    LIMIT 1
  `);
  return res.rows[0] || null;
};

const getNewsByCategory = async (request, reply) => {
  const { slug } = request.params;
  const { page = 1, limit = 20 } = request.query;
  const offset = (page - 1) * limit;

  const catRes = await db.query('SELECT id, name FROM categories WHERE slug = $1', [slug]);
  const category = catRes.rows[0];
  
  if (!category) return reply.code(404).send({ error: 'Категория не найдена' });

  const countRes = await db.query("SELECT COUNT(*) FROM news WHERE category_id = $1 AND status = 'approved'", [category.id]);
  const total = parseInt(countRes.rows[0].count);

  const res = await db.query(`
    SELECT news.*, categories.name as "categoryName", categories.slug as "categorySlug",
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.category_id = $1 AND news.status = 'approved'
    ORDER BY news."createdAt" DESC
    LIMIT $2 OFFSET $3
  `, [category.id, limit, offset]);
  
  return {
    data: res.rows,
    categoryName: category.name,
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
  };
};

const searchNews = async (request, reply) => {
  const { q } = request.query;
  if (!q || q.trim() === '') return [];
  
  // 1. Приводим запрос к нижнему регистру (toLowerCase)
  const cleanQuery = q.toLowerCase().replace(/[^\w\sа-яё0-9-]/g, ' ').trim();
  
  const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return [];

  // 2. Добавляем :* для префиксного поиска
  const tsQueryString = words.map(w => `${w}:*`).join(' & ');

  try {
    const res = await db.query(`
      SELECT 
        news.*, 
        categories.name as "categoryName", 
        categories.slug as "categorySlug",
        (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count,
        ts_headline('russian', content, to_tsquery('russian', $1)) as snippet
      FROM news 
      LEFT JOIN categories ON news.category_id = categories.id 
      WHERE 
        news.status = 'approved' AND 
        (search_vector @@ to_tsquery('russian', $1)) 
      ORDER BY ts_rank(search_vector, to_tsquery('russian', $1)) DESC
    `, [tsQueryString]);

    return res.rows;
  } catch (err) {
    request.log.error(err);
    return [];
  }
};

const getCategories = async (request, reply) => {
  const res = await db.query('SELECT * FROM categories');
  return res.rows;
};

const getAds = async (request, reply) => {
  const res = await db.query('SELECT * FROM ads');
  return res.rows;
};

const getComments = async (request, reply) => {
  const { id } = request.params;
  const res = await db.query('SELECT * FROM comments WHERE news_id = $1 ORDER BY "createdAt" ASC', [id]);
  return res.rows;
};

const createComment = async (request, reply) => {
  const { id } = request.params;
  const { author, content } = request.body;

  try {
    const res = await db.query(
      'INSERT INTO comments (news_id, author, content) VALUES ($1, $2, $3) RETURNING *',
      [id, author, content]
    );
    return reply.code(201).send(res.rows[0]);
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

module.exports = {
  getNewsList, getNewsById, getPopularNews, getFeaturedNews,
  getNewsByCategory, searchNews, getCategories, getAds, getComments, createComment
};