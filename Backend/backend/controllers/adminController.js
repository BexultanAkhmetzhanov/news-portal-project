const db = require('../db');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');
const util = require('util');
const sharp = require('sharp');
const pump = util.promisify(pipeline);

// --- ЛОГИКА РЕДАКТОРА (EDITOR + ADMIN) ---

const getAllNews = async (request, reply) => {
  const stmt = db.prepare(`
    SELECT news.id, news.title, news.is_featured, news.status, news.view_count, categories.name as categoryName
    FROM news
    LEFT JOIN categories ON news.category_id = categories.id
    ORDER BY news.createdAt DESC
  `);
  return stmt.all();
};

const featureNews = async (request, reply) => {
  const { id } = request.params;
  
  const featureTx = db.transaction(() => {
    db.prepare('UPDATE news SET is_featured = 0 WHERE is_featured = 1').run();
    const info = db.prepare('UPDATE news SET is_featured = 1 WHERE id = ?').run(id);
    return info;
  });

  try {
    const info = featureTx();
    if (info.changes === 0) return reply.code(404).send({ error: 'Новость не найдена' });
    return { message: 'Новость сделана главной' };
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
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
        // Важно: путь ../uploads, так как мы в папке controllers
        const savePath = path.join(__dirname, '..', 'uploads', filename);
        
        const transform = sharp()
          .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 80 });

        await pump(part.file, transform, fs.createWriteStream(savePath));
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
  if (!title || !content) return reply.code(400).send({ error: 'Заголовок и контент обязательны' });

  const finalImageUrl = uploadedFilePath || imageUrl || null;
  const status = request.user.role === 'admin' ? 'approved' : 'pending';
  
  try {
    if (is_featured === '1') {
      db.prepare('UPDATE news SET is_featured = 0 WHERE is_featured = 1').run();
    }
    
    const stmt = db.prepare('INSERT INTO news (title, content, imageUrl, category_id, is_featured, status) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(title, content, finalImageUrl, category_id || null, is_featured === '1' ? 1 : 0, status);
    
    return reply.code(201).send({ message: 'Новость создана', id: info.lastInsertRowid });
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: 'Ошибка БД' });
  }
};

const getNewsById = async (request, reply) => {
  const { id } = request.params;
  const stmt = db.prepare(`
    SELECT news.*, categories.name as categoryName, categories.slug as categorySlug
    FROM news LEFT JOIN categories ON news.category_id = categories.id WHERE news.id = ?
  `);
  const article = stmt.get(id);
  if (!article) return reply.code(404).send({ error: 'Новость не найдена' });
  return article;
};

const updateNews = async (request, reply) => {
  const { id } = request.params;
  let uploadedFilePath = null;
  const data = {};

  try {
    const parts = request.parts();
    for await (const part of parts) {
      if (part.file) {
        const filename = Date.now() + '-' + part.filename.replace(/[^a-zA-Z0-9.-]/g, '').replace(/\.[^/.]+$/, "") + '.webp';
        const savePath = path.join(__dirname, '..', 'uploads', filename);
        
        await pump(
          part.file, 
          sharp().resize({ width: 1200, height: 1200, fit: 'inside' }).webp({ quality: 80 }), 
          fs.createWriteStream(savePath)
        );
        uploadedFilePath = `/uploads/${filename}`; 
      } else {
        data[part.fieldname] = part.value;
      }
    }
  } catch (err) {
    return reply.code(500).send({ error: 'Ошибка загрузки' });
  }

  const { title, content, imageUrl, category_id, is_featured } = data;
  const currentArticle = db.prepare('SELECT * FROM news WHERE id = ?').get(id);
  if (!currentArticle) return reply.code(404).send({ error: 'Новость не найдена' });

  const finalTitle = title !== undefined ? title : currentArticle.title;
  const finalContent = content !== undefined ? content : currentArticle.content;
  const finalIsFeatured = (is_featured === '1' || is_featured === 'true') ? 1 : 0;
  const finalCategoryId = category_id ? parseInt(category_id) : (category_id === '' ? null : currentArticle.category_id);
  
  let finalImageUrl = currentArticle.imageUrl;
  if (uploadedFilePath) finalImageUrl = uploadedFilePath;
  else if (imageUrl === 'null') finalImageUrl = null;
  else if (imageUrl) finalImageUrl = imageUrl;

  if (finalIsFeatured === 1) {
    db.prepare('UPDATE news SET is_featured = 0 WHERE is_featured = 1 AND id != ?').run(id);
  }

  db.prepare(`
    UPDATE news SET title = ?, content = ?, imageUrl = ?, category_id = ?, is_featured = ? WHERE id = ?
  `).run(finalTitle, finalContent, finalImageUrl, finalCategoryId, finalIsFeatured, id);

  return { message: 'Новость обновлена' };
};

const deleteNews = async (request, reply) => {
  const { id } = request.params;
  const info = db.prepare('DELETE FROM news WHERE id = ?').run(id);
  if (info.changes === 0) return reply.code(404).send({ error: 'Новость не найдена' });
  return { message: 'Новость удалена' };
};

// --- ЛОГИКА АДМИНА (ADMIN ONLY) ---

const getUsers = async (request, reply) => {
  return db.prepare('SELECT id, username, role, fullname FROM users WHERE id != ?').all(request.user.userId);
};

const updateUserRole = async (request, reply) => {
  const { id } = request.params;
  const { role } = request.body;
  // Проверка role убрана, её делает схема
  
  const info = db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  if (info.changes === 0) return reply.code(404).send({ error: 'Пользователь не найден' });
  return { message: `Роль обновлена на ${role}` };
};

const getPendingNews = async (request, reply) => {
  return db.prepare(`
    SELECT news.*, categories.name as categoryName 
    FROM news LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.status = 'pending' ORDER BY news.createdAt DESC
  `).all();
};

const approveNews = async (request, reply) => {
  const { id } = request.params;
  const info = db.prepare("UPDATE news SET status = 'approved' WHERE id = ?").run(id);
  if (info.changes === 0) return reply.code(404).send({ error: 'Новость не найдена' });
  return { message: 'Новость опубликована' };
};

const createCategory = async (request, reply) => {
  const { name, slug } = request.body;
  try {
    const info = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug);
    return reply.code(201).send({ id: info.lastInsertRowid, name, slug });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return reply.code(409).send({ error: 'Slug занят' });
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

const updateCategory = async (request, reply) => {
  const { id } = request.params;
  const { name, slug } = request.body;
  try {
    const info = db.prepare('UPDATE categories SET name = ?, slug = ? WHERE id = ?').run(name, slug, id);
    if (info.changes === 0) return reply.code(404).send({ error: 'Категория не найдена' });
    return { message: 'Категория обновлена' };
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') return reply.code(409).send({ error: 'Slug занят' });
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

const deleteCategory = async (request, reply) => {
  const { id } = request.params;
  try {
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    if (info.changes === 0) return reply.code(404).send({ error: 'Категория не найдена' });
    return { message: 'Категория удалена' };
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') return reply.code(409).send({ error: 'В категории есть новости' });
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
};

module.exports = {
  getAllNews, featureNews, createNews, getNewsById, updateNews, deleteNews,
  getUsers, updateUserRole, getPendingNews, approveNews, createCategory, updateCategory, deleteCategory
};