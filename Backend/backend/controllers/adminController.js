const db = require('../db');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');
const util = require('util');
const sharp = require('sharp');
const pump = util.promisify(pipeline);

// --- Вспомогательная функция для сохранения тегов ---
const saveTags = async (newsId, tagsArray) => {
  if (!tagsArray || !Array.isArray(tagsArray)) return;
  await db.query('DELETE FROM news_tags WHERE news_id = $1', [newsId]);
  for (const tagName of tagsArray) {
    const cleanTag = tagName.trim();
    if (!cleanTag) continue;
    await db.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [cleanTag]);
    const tagRes = await db.query('SELECT id FROM tags WHERE name = $1', [cleanTag]);
    if (tagRes.rows.length > 0) {
      const tagId = tagRes.rows[0].id;
      await db.query('INSERT INTO news_tags (news_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newsId, tagId]);
    }
  }
};

const getAllNews = async (request, reply) => {
  const res = await db.query(`
    SELECT news.id, news.title, news.is_featured, news.status, news.view_count, categories.name as "categoryName", news."createdAt"
    FROM news
    LEFT JOIN categories ON news.category_id = categories.id
    ORDER BY news."createdAt" DESC
  `);
  return res.rows;
};

const featureNews = async (request, reply) => {
  const { id } = request.params;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE news SET is_featured = 0 WHERE is_featured = 1');
    const res = await client.query('UPDATE news SET is_featured = 1 WHERE id = $1', [id]);
    await client.query('COMMIT');
    if (res.rowCount === 0) return reply.code(404).send({ error: 'Новость не найдена' });
    return { message: 'Новость сделана главной' };
  } catch (err) {
    await client.query('ROLLBACK');
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  } finally {
    client.release();
  }
};

const createNews = async (request, reply) => {
  let uploadedFilePath = null;
  const data = {};
  
  try {
    const parts = request.parts();
    for await (const part of parts) {
      if (part.file) {
        if (part.file.truncated) return reply.code(413).send({ error: 'Файл слишком большой' });
        const filename = Date.now() + '-' + part.filename.replace(/[^a-zA-Z0-9.-]/g, '').replace(/\.[^/.]+$/, "") + '.webp';
        const savePath = path.join(__dirname, '..', 'uploads', filename);
        await pump(part.file, sharp().resize({ width: 1200, height: 1200, fit: 'inside' }).webp(), fs.createWriteStream(savePath));
        uploadedFilePath = `/uploads/${filename}`; 
      } else {
        data[part.fieldname] = part.value;
      }
    }
  } catch (err) {
    return reply.code(500).send({ error: 'Ошибка обработки файла' });
  }

  const { title, content, imageUrl, category_id, is_featured } = data;
  if (!title || !content) return reply.code(400).send({ error: 'Заголовок и контент' });

  const finalImageUrl = uploadedFilePath || imageUrl || null;
  const status = request.user.role === 'admin' ? 'approved' : 'pending';
  
  try {
    if (is_featured === '1') {
      await db.query('UPDATE news SET is_featured = 0 WHERE is_featured = 1');
    }
    
    const res = await db.query(
      'INSERT INTO news (title, content, "imageUrl", category_id, is_featured, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [title, content, finalImageUrl, category_id || null, is_featured === '1' ? 1 : 0, status]
    );
    
    const newsId = res.rows[0].id;
    let tags = [];
    if (data.tags) {
       try { tags = JSON.parse(data.tags); } catch(e) { tags = [data.tags]; }
    }
    await saveTags(newsId, tags);

    return reply.code(201).send({ message: 'Новость создана', id: newsId });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка БД' });
  }
};

const getNewsById = async (request, reply) => {
  const { id } = request.params;
  const res = await db.query(`
    SELECT news.*, categories.name as "categoryName", categories.slug as "categorySlug"
    FROM news LEFT JOIN categories ON news.category_id = categories.id WHERE news.id = $1
  `, [id]);
  
  if (res.rows.length === 0) return reply.code(404).send({ error: 'Новость не найдена' });
  
  const newsItem = res.rows[0];
  try {
    const tagsRes = await db.query(`
        SELECT t.name FROM tags t 
        JOIN news_tags nt ON t.id = nt.tag_id 
        WHERE nt.news_id = $1
    `, [id]);
    newsItem.tags = tagsRes.rows;
  } catch(e) {
    newsItem.tags = [];
  }
  return newsItem;
};

const updateNews = async (request, reply) => {
  const { id } = request.params;
  let uploadedFilePath = null;
  const data = {};

  try {
    const parts = request.parts();
    for await (const part of parts) {
      if (part.file) {
        if (part.file.truncated) return reply.code(413).send({ error: 'Файл слишком большой' });
        const filename = Date.now() + '-' + part.filename.replace(/[^a-zA-Z0-9.-]/g, '').replace(/\.[^/.]+$/, "") + '.webp';
        const savePath = path.join(__dirname, '..', 'uploads', filename);
        await pump(part.file, sharp().resize({ width: 1200, height: 1200, fit: 'inside' }).webp(), fs.createWriteStream(savePath));
        uploadedFilePath = `/uploads/${filename}`; 
      } else {
        data[part.fieldname] = part.value;
      }
    }
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка обработки файла' });
  }

  const { title, content, imageUrl, category_id, is_featured } = data;
  if (!title || !content) return reply.code(400).send({ error: 'Заголовок' });

  let finalImageUrl = imageUrl;
  if (uploadedFilePath) {
    finalImageUrl = uploadedFilePath;
  } else if (imageUrl === 'null') {
    finalImageUrl = null;
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    if (is_featured === '1') {
      await client.query('UPDATE news SET is_featured = 0 WHERE is_featured = 1 AND id != $1', [id]);
    }

    const res = await client.query(
      `UPDATE news SET 
        title = $1, 
        content = $2, 
        "imageUrl" = $3, 
        category_id = $4, 
        is_featured = $5 
       WHERE id = $6`,
      [title, content, finalImageUrl, category_id || null, is_featured === '1' ? 1 : 0, id]
    );

    let tags = [];
    if (data.tags) {
       try { tags = JSON.parse(data.tags); } catch(e) { tags = [data.tags]; }
    }
    await saveTags(id, tags);

    await client.query('COMMIT');
    if (res.rowCount === 0) return reply.code(404).send({ error: 'Новость не найдена' });
    return { message: 'Новость обновлена' };
  } catch (err) {
    await client.query('ROLLBACK');
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка базы данных' });
  } finally {
    client.release();
  }
};

const deleteNews = async (request, reply) => {
  const { id } = request.params;
  const res = await db.query('DELETE FROM news WHERE id = $1', [id]);
  if (res.rowCount === 0) return reply.code(404).send({ error: 'Новость не найдена' });
  return { message: 'Новость удалена' };
};

const getUsers = async (request, reply) => {
  const res = await db.query('SELECT id, username, role, fullname FROM users WHERE id != $1', [request.user.userId]);
  return res.rows;
};

const updateUserRole = async (request, reply) => {
  const { id } = request.params;
  const { role } = request.body;
  const res = await db.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
  if (res.rowCount === 0) return reply.code(404).send({ error: 'Пользователь не найден' });
  return { message: `Роль обновлена на ${role}` };
};

const getPendingNews = async (request, reply) => {
  const res = await db.query(`
    SELECT news.*, categories.name as "categoryName" 
    FROM news LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.status = 'pending' ORDER BY news."createdAt" DESC
  `);
  return res.rows;
};

const approveNews = async (request, reply) => {
  const { id } = request.params;
  const res = await db.query("UPDATE news SET status = 'approved' WHERE id = $1", [id]);
  if (res.rowCount === 0) return reply.code(404).send({ error: 'Новость не найдена' });
  return { message: 'Новость опубликована' };
};

const createCategory = async (request, reply) => {
  const { name, slug } = request.body;
  try {
    const res = await db.query('INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING *', [name, slug]);
    return reply.code(201).send(res.rows[0]);
  } catch (err) {
    if (err.code === '23505') return reply.code(409).send({ error: 'Slug занят' });
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

const updateCategory = async (request, reply) => {
  const { id } = request.params;
  const { name, slug } = request.body;
  try {
    const res = await db.query('UPDATE categories SET name = $1, slug = $2 WHERE id = $3', [name, slug, id]);
    if (res.rowCount === 0) return reply.code(404).send({ error: 'Категория не найдена' });
    return { message: 'Категория обновлена' };
  } catch (err) {
    if (err.code === '23505') return reply.code(409).send({ error: 'Slug занят' });
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

const deleteCategory = async (request, reply) => {
  const { id } = request.params;
  try {
    const res = await db.query('DELETE FROM categories WHERE id = $1', [id]);
    if (res.rowCount === 0) return reply.code(404).send({ error: 'Категория не найдена' });
    return { message: 'Категория удалена' };
  } catch (err) {
    if (err.code === '23503') return reply.code(409).send({ error: 'В категории есть новости' });
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

// --- РЕКЛАМА (НОВОЕ) ---
const createAd = async (request, reply) => {
  let uploadedFilePath = null;
  const data = {};

  try {
    const parts = request.parts();
    for await (const part of parts) {
      if (part.file) {
        const filename = 'ad-' + Date.now() + '-' + part.filename.replace(/[^a-zA-Z0-9.-]/g, '') + '.webp';
        const savePath = path.join(__dirname, '..', 'uploads', filename);
        await pump(part.file, sharp().resize({ width: 800, fit: 'inside' }).webp(), fs.createWriteStream(savePath));
        uploadedFilePath = `/uploads/${filename}`;
      } else {
        data[part.fieldname] = part.value;
      }
    }
  } catch (err) {
    return reply.code(500).send({ error: 'Ошибка загрузки файла' });
  }

  const { title, placement, link } = data;
  
  try {
    const res = await db.query(
      'INSERT INTO ads (title, placement, "imageUrl", link) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, placement, uploadedFilePath, link]
    );
    return res.rows[0];
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка БД' });
  }
};

const deleteAd = async (request, reply) => {
  const { id } = request.params;
  await db.query('DELETE FROM ads WHERE id = $1', [id]);
  return { message: 'Реклама удалена' };
};

// --- ПОЛНАЯ СТАТИСТИКА (DASHBOARD) ---
const getFullStats = async (request, reply) => {
  try {
    const client = await db.connect();

    try {
      // 1. РЕАЛЬНЫЕ ДАННЫЕ: Всего пользователей
      const usersRes = await client.query('SELECT COUNT(*) FROM users');
      const totalUsers = parseInt(usersRes.rows[0].count);

      // 2. РЕАЛЬНЫЕ ДАННЫЕ: Топ статей по просмотрам
      const popularNewsRes = await client.query(`
        SELECT id, title, view_count, "createdAt"
        FROM news 
        WHERE status = 'approved'
        ORDER BY view_count DESC 
        LIMIT 5
      `);

      // 3. ИМИТАЦИЯ: Кто сейчас онлайн (случайное число от 5 до 15)
      const onlineUsers = Math.floor(Math.random() * (15 - 5 + 1)) + 5;

      // 4. ИМИТАЦИЯ: География (в будущем можно прикрутить GeoIP)
      const geography = [
        { country: 'Казахстан', city: 'Алматы', count: 120, percent: 60 },
        { country: 'Казахстан', city: 'Астана', count: 45, percent: 22 },
        { country: 'Россия', city: 'Москва', count: 15, percent: 8 },
        { country: 'США', city: 'Нью-Йорк', count: 10, percent: 5 },
        { country: 'Другие', city: '-', count: 10, percent: 5 },
      ];

      // 5. ИМИТАЦИЯ: Технологии
      const devices = [
        { type: 'Мобильные', percent: 65 },
        { type: 'ПК (Desktop)', percent: 30 },
        { type: 'Планшеты', percent: 5 },
      ];

      // 6. ИМИТАЦИЯ: Демография
      const demographics = {
        gender: { male: 55, female: 45 },
        age: [
          { range: '18-24', percent: 20 },
          { range: '25-34', percent: 45 },
          { range: '35-44', percent: 25 },
          { range: '45+', percent: 10 },
        ]
      };

      return {
        audience: {
          totalUsers,
          onlineUsers,
        },
        content: {
          popularNews: popularNewsRes.rows
        },
        geo: geography,
        tech: devices,
        demo: demographics
      };

    } finally {
      client.release();
    }
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка получения статистики' });
  }
};

module.exports = {
  getAllNews, featureNews, createNews, getNewsById, updateNews, deleteNews,
  getUsers, updateUserRole, getPendingNews, approveNews, 
  createCategory, updateCategory, deleteCategory,
  createAd, deleteAd, getFullStats
};