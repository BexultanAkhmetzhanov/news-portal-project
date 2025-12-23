const db = require('../db');

// --- Получение списка новостей ---
const getNewsList = async (request, reply) => {
  const { page = 1, limit = 10, category_id } = request.query;
  const offset = (page - 1) * limit;

  let sql = `
    SELECT n.*, c.name as "categoryName", c.slug as "categorySlug" 
    FROM news n 
    LEFT JOIN categories c ON n.category_id = c.id 
    WHERE n.status = 'approved'
  `;
  let sqlParams = [];

  if (category_id) {
    sql += ` AND n.category_id = $1`;
    sqlParams.push(category_id);
  }

  // === ГЛАВНОЕ ИЗМЕНЕНИЕ ЗДЕСЬ ===
  // Сначала сортируем по is_featured (1 выше, чем 0), потом по дате
  sql += ` ORDER BY n.is_featured DESC, n."createdAt" DESC LIMIT $${sqlParams.length + 1} OFFSET $${sqlParams.length + 2}`;
  
  sqlParams.push(limit, offset);

  try {
    const res = await db.query(sql, sqlParams);
    
    let countSql = `SELECT COUNT(*) as count FROM news WHERE status = 'approved'`;
    let countParams = [];
    if (category_id) {
      countSql += ` AND category_id = $1`;
      countParams.push(category_id);
    }
    const countRes = await db.query(countSql, countParams);

    return {
      data: res.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countRes.rows[0].count)
      }
    };
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера при загрузке новостей' });
  }
};

// --- Получение одной новости ---
const getNewsById = async (request, reply) => {
  const { id } = request.params;

  try {
    await db.query('UPDATE news SET view_count = view_count + 1 WHERE id = $1', [id]);

    const res = await db.query(`
      SELECT n.*, c.name as "categoryName", c.slug as "categorySlug"
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id = $1
    `, [id]);

    if (res.rows.length === 0) {
      return reply.code(404).send({ error: 'Новость не найдена' });
    }

    const newsItem = res.rows[0];

    try {
      const tagsRes = await db.query(`
        SELECT t.id, t.name 
        FROM tags t
        JOIN news_tags nt ON t.id = nt.tag_id
        WHERE nt.news_id = $1
      `, [id]);
      newsItem.tags = tagsRes.rows;
    } catch (e) {
      newsItem.tags = [];
    }

    return newsItem;
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

// --- Поиск ---
const searchNews = async (request, reply) => {
  const { q } = request.query;
  if (!q) return [];
  const term = `%${q}%`;
  try {
    const res = await db.query(`
      SELECT DISTINCT n.*, c.name as "categoryName"
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN news_tags nt ON n.id = nt.news_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE (n.title ILIKE $1 OR n.content ILIKE $1 OR t.name ILIKE $1)
      AND n.status = 'approved'
      ORDER BY n.is_featured DESC, n."createdAt" DESC
      LIMIT 20
    `, [term]);
    return res.rows;
  } catch (err) {
    request.log.error(err);
    return [];
  }
};

// --- Другие функции ---
const getCategories = async (req, reply) => {
  const res = await db.query('SELECT * FROM categories');
  return res.rows;
};

const getAds = async (req, reply) => {
  return [
    { id: 1, placement: 'sidebar', adCode: '<img src="/uploads/ad1.jpg" />' },
    { id: 2, placement: 'header', adCode: '<div>Реклама</div>' }
  ];
};

const getPopularNews = async (req, reply) => {
  const res = await db.query(`SELECT * FROM news WHERE status = 'approved' ORDER BY view_count DESC LIMIT 5`);
  return res.rows;
};

const getFeaturedNews = async (req, reply) => {
  const res = await db.query(`SELECT * FROM news WHERE status = 'approved' AND is_featured = 1 ORDER BY "createdAt" DESC LIMIT 3`);
  return res.rows;
};

const getNewsByCategory = async (req, reply) => {
  const { slug } = req.params;
  const catRes = await db.query('SELECT id, name FROM categories WHERE slug = $1', [slug]);
  
  if (catRes.rows.length === 0) {
    return { 
      data: [], 
      categoryName: '', 
      pagination: { total: 0 } 
    }; 
  }
  
  const category = catRes.rows[0];
  req.query.category_id = category.id;
  const result = await getNewsList(req, reply);
  result.categoryName = category.name; 
  return result;
};

const getComments = async (req, reply) => {
  const { id } = req.params;
  const res = await db.query('SELECT * FROM comments WHERE news_id = $1 ORDER BY "createdAt" DESC', [id]);
  return res.rows;
};

const createComment = async (req, reply) => {
  const { id } = req.params;
  const { content } = req.body;
  const author = req.user ? req.user.username : 'Anonymous'; 
  await db.query('INSERT INTO comments (news_id, author, content) VALUES ($1, $2, $3)', [id, author, content]);
  return { message: 'Комментарий добавлен' };
};

module.exports = {
  getNewsList, getNewsById, getCategories, getAds, getPopularNews,
  getFeaturedNews, getNewsByCategory, searchNews, getComments, createComment
};