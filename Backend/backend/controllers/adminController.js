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
    // 1. Создаем тег (Postgres: ON CONFLICT DO NOTHING)
    await db.query('INSERT INTO tags (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [cleanTag]);
    // 2. Получаем ID
    const tagRes = await db.query('SELECT id FROM tags WHERE name = $1', [cleanTag]);
    if (tagRes.rows.length > 0) {
      const tagId = tagRes.rows[0].id;
      // 3. Связываем
      await db.query('INSERT INTO news_tags (news_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newsId, tagId]);
    }
  }
};

const getAllNews = async (request, reply) => {
  // ИСПРАВЛЕНО: "createdAt" в кавычках
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
    
    // ИСПРАВЛЕНО: "imageUrl" в кавычках
    const res = await db.query(
      'INSERT INTO news (title, content, "imageUrl", category_id, is_featured, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [title, content, finalImageUrl, category_id || null, is_featured === '1' ? 1 : 0, status]
    );
    
    const newsId = res.rows[0].id;

    // Сохраняем теги
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
  // Подгружаем теги
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

    // ИСПРАВЛЕНО: "imageUrl" в кавычках
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

    // Сохраняем теги
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
  // ИСПРАВЛЕНО: "createdAt" в кавычках
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

module.exports = {
  getAllNews, featureNews, createNews, getNewsById, updateNews, deleteNews,
  getUsers, updateUserRole, getPendingNews, approveNews, createCategory, updateCategory, deleteCategory
};