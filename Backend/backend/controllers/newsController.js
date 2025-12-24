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
    return reply.code(500).send({ error: 'Ошибка сервера' });
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

    if (res.rows.length === 0) return reply.code(404).send({ error: 'Новость не найдена' });

    const newsItem = res.rows[0];

    try {
      const tagsRes = await db.query(`
        SELECT t.id, t.name FROM tags t JOIN news_tags nt ON t.id = nt.tag_id WHERE nt.news_id = $1
      `, [id]);
      newsItem.tags = tagsRes.rows;
    } catch (e) { newsItem.tags = []; }

    const votesRes = await db.query(`
      SELECT 
        SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) as likes,
        SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) as dislikes
      FROM votes WHERE news_id = $1
    `, [id]);
    
    newsItem.likes = parseInt(votesRes.rows[0].likes) || 0;
    newsItem.dislikes = parseInt(votesRes.rows[0].dislikes) || 0;

    return newsItem;
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

// --- ГОЛОСОВАНИЕ ЗА НОВОСТЬ ---
const voteNews = async (request, reply) => {
  const { id } = request.params;
  const { value } = request.body; 
  const userId = request.user.userId;

  if (![1, -1].includes(value)) return reply.code(400).send({ error: 'Неверное значение' });

  try {
    const checkRes = await db.query('SELECT value FROM votes WHERE user_id = $1 AND news_id = $2', [userId, id]);

    if (checkRes.rows.length > 0) {
      if (checkRes.rows[0].value === value) {
        await db.query('DELETE FROM votes WHERE user_id = $1 AND news_id = $2', [userId, id]);
        return { message: 'Голос убран', userVote: 0 };
      } else {
        await db.query('UPDATE votes SET value = $1 WHERE user_id = $2 AND news_id = $3', [value, userId, id]);
        return { message: 'Голос обновлен', userVote: value };
      }
    } else {
      await db.query('INSERT INTO votes (user_id, news_id, value) VALUES ($1, $2, $3)', [userId, id, value]);
      return { message: 'Голос принят', userVote: value };
    }
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка БД' });
  }
};

const getUserVote = async (request, reply) => {
  const { id } = request.params;
  const userId = request.user.userId;
  const res = await db.query('SELECT value FROM votes WHERE user_id = $1 AND news_id = $2', [userId, id]);
  return { userVote: res.rows.length > 0 ? res.rows[0].value : 0 };
};

// --- КОММЕНТАРИИ ---
const getComments = async (req, reply) => {
  const { id } = req.params;
  const { page = 1, limit = 5 } = req.query; 
  const offset = (page - 1) * limit;

  let userId = null;
  try {
    const parts = req.headers.authorization ? req.headers.authorization.split(' ') : [];
    if (parts.length === 2) {
       const decoded = req.server.jwt.decode(parts[1]);
       if (decoded) userId = decoded.userId;
    }
  } catch (e) {}

  try {
    const countRes = await db.query(
      'SELECT COUNT(*) FROM comments WHERE news_id = $1 AND parent_id IS NULL', 
      [id]
    );
    const totalRoots = parseInt(countRes.rows[0].count);

    const rootsRes = await db.query(
      `SELECT id FROM comments 
       WHERE news_id = $1 AND parent_id IS NULL 
       ORDER BY "createdAt" DESC 
       LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );
    
    const rootIds = rootsRes.rows.map(r => r.id);

    if (rootIds.length === 0) {
      return { data: [], total: totalRoots };
    }

    const sql = `
      SELECT 
        c.*,
        u."avatarUrl",
        u.fullname,
        COALESCE(SUM(CASE WHEN cv.value = 1 THEN 1 ELSE 0 END), 0)::int as likes,
        COALESCE(SUM(CASE WHEN cv.value = -1 THEN 1 ELSE 0 END), 0)::int as dislikes,
        (SELECT value FROM comment_votes WHERE comment_id = c.id AND user_id = $2) as user_vote
      FROM comments c
      LEFT JOIN users u ON c.author = u.username 
      LEFT JOIN comment_votes cv ON c.id = cv.comment_id
      WHERE (c.id = ANY($3) OR (c.news_id = $1 AND c.parent_id IS NOT NULL))
      GROUP BY c.id, u."avatarUrl", u.fullname
      ORDER BY c."createdAt" DESC
    `;

    const commentsRes = await db.query(sql, [id, userId, rootIds]);
    
    return { 
      data: commentsRes.rows, 
      total: totalRoots 
    };

  } catch (err) {
    req.log.error(err);
    return reply.code(500).send({ error: 'Ошибка загрузки комментариев' });
  }
};

const createComment = async (req, reply) => {
  const { id } = req.params;
  const { content, parent_id } = req.body;
  const author = req.user ? req.user.username : 'Anonymous'; 
  
  const res = await db.query(
    'INSERT INTO comments (news_id, author, content, parent_id) VALUES ($1, $2, $3, $4) RETURNING *', 
    [id, author, content, parent_id || null]
  );
  const newComment = res.rows[0];
  newComment.likes = 0;
  newComment.dislikes = 0;
  newComment.user_vote = 0;
  
  return newComment;
};

const voteComment = async (request, reply) => {
  const { id } = request.params; 
  const { value } = request.body; 
  const userId = request.user.userId;

  if (![1, -1].includes(value)) return reply.code(400).send({ error: 'Неверное значение' });

  try {
    const checkRes = await db.query('SELECT value FROM comment_votes WHERE user_id = $1 AND comment_id = $2', [userId, id]);

    if (checkRes.rows.length > 0) {
      if (checkRes.rows[0].value === value) {
        await db.query('DELETE FROM comment_votes WHERE user_id = $1 AND comment_id = $2', [userId, id]);
        return { message: 'Голос убран', userVote: 0 };
      } else {
        await db.query('UPDATE comment_votes SET value = $1 WHERE user_id = $2 AND comment_id = $3', [value, userId, id]);
        return { message: 'Голос обновлен', userVote: value };
      }
    } else {
      await db.query('INSERT INTO comment_votes (user_id, comment_id, value) VALUES ($1, $2, $3)', [userId, id, value]);
      return { message: 'Голос принят', userVote: value };
    }
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка БД' });
  }
};

const deleteComment = async (req, reply) => {
  const { id } = req.params;
  try {
    const userId = req.user.userId || req.user.id;
    if (!userId) return reply.code(401).send({ error: 'Не удалось определить пользователя' });

    const userRes = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0];

    if (!user || user.role !== 'admin') {
      return reply.code(403).send({ error: 'Только админ может удалять комментарии' });
    }
    await db.query('DELETE FROM comments WHERE id = $1', [id]);
    return { success: true };
  } catch (err) {
    req.log.error(err);
    return reply.code(500).send({ error: 'Ошибка при удалении' });
  }
};

const searchNews = async (request, reply) => {
  const { q } = request.query;
  if (!q) return [];
  const term = `%${q}%`;
  try {
    const res = await db.query(`
      SELECT DISTINCT n.*, c.name as "categoryName" FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN news_tags nt ON n.id = nt.news_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE (n.title ILIKE $1 OR n.content ILIKE $1 OR t.name ILIKE $1) AND n.status = 'approved'
      LIMIT 20
    `, [term]);
    return res.rows;
  } catch (err) { return []; }
};

const getCategories = async (req, reply) => {
  const res = await db.query('SELECT * FROM categories');
  return res.rows;
};

// --- РЕКЛАМА (ИСПРАВЛЕНО: ТЕПЕРЬ ЧИТАЕМ ИЗ БД) ---
const getAds = async (req, reply) => {
  try {
    const res = await db.query('SELECT * FROM ads ORDER BY "createdAt" DESC');
    return res.rows;
  } catch (err) {
    req.log.error(err);
    return [];
  }
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
  if (catRes.rows.length === 0) return { data: [], categoryName: '', pagination: { total: 0 } };
  const category = catRes.rows[0];
  req.query.category_id = category.id;
  const result = await getNewsList(req, reply);
  result.categoryName = category.name; 
  return result;
};

// --- ВАЛЮТА (ОСТАВЛЯЕМ КАК ЕСТЬ) ---
let cachedRates = null;
let lastFetchTime = 0;
const CACHE_TTL = 3600 * 1000; 

const getExchangeRates = async (req, reply) => {
  try {
    const now = Date.now();
    if (cachedRates && (now - lastFetchTime < CACHE_TTL)) {
      return cachedRates;
    }
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await response.json();

    if (data && data.rates) {
      cachedRates = {
        USD: 1,
        EUR: data.rates.EUR,
        RUB: data.rates.RUB,
        KZT: data.rates.KZT,
        CNY: data.rates.CNY,
        updatedAt: now
      };
      lastFetchTime = now;
      return cachedRates;
    } else {
      throw new Error('Не удалось получить данные');
    }
  } catch (err) {
    req.log.error(err);
    if (cachedRates) return cachedRates;
    return reply.code(500).send({ error: 'Ошибка получения курсов валют' });
  }
};

module.exports = {
  getNewsList, getNewsById, getCategories, getAds, getPopularNews,
  getFeaturedNews, getNewsByCategory, searchNews, getComments, createComment,
  voteNews, getUserVote, voteComment, deleteComment, getExchangeRates
};