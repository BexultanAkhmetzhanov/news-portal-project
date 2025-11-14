const fastify = require('fastify')({ logger: true });
const db = require('./db.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { pipeline } = require('stream');
const pump = util.promisify(pipeline);
try {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
} catch (e) {
  // Папка уже есть, все в порядке
}

fastify.register(require('@fastify/cors'), {
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
});
fastify.register(require('@fastify/cookie'));

fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 МБ
  }
});


fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'uploads'),
  prefix: '/uploads/',  
});

const JWT_SECRET = 'your_super_secret_key_12345';
const SALT_ROUNDS = 10;

fastify.post('/register', async (request, reply) => {
  const { username, password } = request.body;
  if (!username || !password) {
    return reply.code(400).send({ error: 'Нужны имя пользователя и пароль' });
  }
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    // Проверяем, есть ли уже пользователи в базе
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    const { count } = countStmt.get();

    // Первый пользователь (count === 0) получает роль 'admin', остальные - 'editor'
    const role = (count === 0) ? 'admin' : 'user';

    const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const info = stmt.run(username, hashedPassword, role);
    
    console.log(`Создан новый пользователь: ${username}, Роль: ${role}`);
    
    return reply.code(201).send({ message: 'Пользователь создан', userId: info.lastInsertRowid });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return reply.code(409).send({ error: 'Имя пользователя занято' });
    }
    fastify.log.error(err);
    return reply.code(500).send({ error: 'Ошибка сервера' });
  }
});

fastify.post('/login', async (request, reply) => {
  const { username, password } = request.body;
  
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);
  if (!user) {
    return reply.code(401).send({ error: 'Неверные имя пользователя или пароль' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return reply.code(401).send({ error: 'Неверные имя пользователя или пароль' });
  }

  const accessToken = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' } 
  );

  reply.setCookie('accessToken', accessToken, {
    path: '/',
    httpOnly: true,
    secure: false,
    maxAge: 8 * 60 * 60,
  });

  return { 
    user: { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      fullname: user.fullname,
      avatarUrl: user.avatarUrl
    } 
  };
});

fastify.post('/logout', async (request, reply) => {
  reply.clearCookie('accessToken', { path: '/' });
  return { message: 'Выход выполнен' };
});



function checkPermission(requiredRole) {
  const rolesHierarchy = {
    'admin': ['admin', 'editor', 'user'],
    'editor': ['editor', 'user'],
    'user': ['user']
  };

  return async (request, reply) => {
    try {
      const accessToken = request.cookies.accessToken;
      if (!accessToken) {
        return reply.code(401).send({ error: 'Access token отсутствует' });
      }
      
      const decoded = jwt.verify(accessToken, JWT_SECRET);
      request.user = decoded; 
      
      const userRoles = rolesHierarchy[request.user.role];
      if (!userRoles || !userRoles.includes(requiredRole)) {
        return reply.code(403).send({ error: 'Доступ запрещен' });
      }
    } catch (err) {
      fastify.log.warn('Auth failed (invalid/expired access token)');
      reply.clearCookie('accessToken', { path: '/' });
      return reply.code(401).send({ error: 'Требуется авторизация' });
    }
  };
}

fastify.register(async (apiRoutes) => {
  // Требует любую роль (user, editor, или admin)
  apiRoutes.addHook('preHandler', checkPermission('user'));

  //
  // ВСТАВЬТЕ ВЫРЕЗАННЫЕ МАРШРУТЫ СЮДА
  //
  apiRoutes.get('/profile', async (request, reply) => {
    const stmt = db.prepare('SELECT id, username, role, fullname, avatarUrl FROM users WHERE id = ?');
    const profile = stmt.get(request.user.userId);
    
    if (!profile) {
      return reply.code(404).send({ error: 'Профиль не найден' });
    }
    return profile;
  });

  apiRoutes.put('/profile', async (request, reply) => {
    const { fullname, avatarUrl } = request.body;
    
    try {
      const stmt = db.prepare('UPDATE users SET fullname = ?, avatarUrl = ? WHERE id = ?');
      stmt.run(fullname, avatarUrl, request.user.userId);
      
      return { 
        message: 'Профиль обновлен', 
        user: {
          id: request.user.userId,
          username: request.user.username,
          role: request.user.role,
          fullname,
          avatarUrl
        }
      };
    } catch (err) {
      fastify.log.error('Ошибка обновления профиля:', err);
      return reply.code(500).send({ error: 'Ошибка сервера при обновлении профиля' });
    }
  });

}, { prefix: '/api' }); // <-- ВАЖНО: новый префикс /api

fastify.get('/news', async (request, reply) => {
  const stmt = db.prepare(`
    SELECT 
      news.*, 
      categories.name as categoryName, 
      categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.status = 'approved' 
    ORDER BY news.createdAt DESC
  `);
  const news = stmt.all();
  return news;
});

fastify.get('/news/:id', async (request, reply) => {
  const { id } = request.params;
  try {
    const updateStmt = db.prepare('UPDATE news SET view_count = view_count + 1 WHERE id = ?');
    updateStmt.run(id);
  } catch (updateErr) {
    fastify.log.warn(`Не удалось обновить счетчик для новости ${id}: ${updateErr.message}`);
  }
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
  if (article) {
    return article;
  } else {
    return reply.code(404).send({ error: 'Новость не найдена' });
  }
});

fastify.get('/news/category/:slug', async (request, reply) => {
  const { slug } = request.params;
  const catStmt = db.prepare('SELECT id FROM categories WHERE slug = ?');
  const category = catStmt.get(slug);
  if (!category) {
    return reply.code(404).send({ error: 'Категория не найдена' });
  }
  const newsStmt = db.prepare(`
    SELECT 
      news.*, 
      categories.name as categoryName, 
      categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.category_id = ? AND news.status = 'approved'
    ORDER BY news.createdAt DESC
  `);
  const news = newsStmt.all(category.id);
  return news;
});

fastify.get('/categories', async (request, reply) => {
  const stmt = db.prepare('SELECT * FROM categories');
  const categories = stmt.all();
  return categories;
});

fastify.get('/ads', async (request, reply) => {
  const stmt = db.prepare('SELECT * FROM ads');
  const ads = stmt.all();
  return ads;
});

fastify.get('/search', async (request, reply) => {
  const { q } = request.query;
  if (!q || q.trim() === '') {
    return [];
  }
  const searchQuery = `%${q}%`;
  try {
    const stmt = db.prepare(`
      SELECT 
        news.*, 
        categories.name as categoryName, 
        categories.slug as categorySlug,
        (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
      FROM news 
      LEFT JOIN categories ON news.category_id = categories.id 
      WHERE (news.title LIKE ? OR news.content LIKE ?) AND news.status = 'approved'
      ORDER BY news.createdAt DESC
    `);
    const results = stmt.all(searchQuery, searchQuery);
    return results;
  } catch (err) {
    fastify.log.error(`Ошибка поиска по '${q}':`, err);
    return reply.code(500).send({ error: 'Ошибка сервера во время поиска' });
  }
});

fastify.get('/news/:id/comments', async (request, reply) => {
  const { id } = request.params;
  const stmt = db.prepare('SELECT * FROM comments WHERE news_id = ? ORDER BY createdAt ASC');
  const comments = stmt.all(id);
  return comments;
});

fastify.post('/news/:id/comments', async (request, reply) => {
  try {
    const { id } = request.params;
    const { author, content } = request.body;

    if (!author || !content || author.trim() === '' || content.trim() === '') {
      return reply.code(400).send({ error: 'Имя и комментарий не могут быть пустыми' });
    }

    const stmt = db.prepare('INSERT INTO comments (news_id, author, content) VALUES (?, ?, ?)');
    // 'id' из params - это строка, лучше преобразовать в число
    const info = stmt.run(Number(id), author, content); 

    const newCommentStmt = db.prepare('SELECT * FROM comments WHERE id = ?');
    const newComment = newCommentStmt.get(info.lastInsertRowid);

    return reply.code(201).send(newComment);

  } catch (err) {
    // Ловим ошибку и отправляем 500, не "падая"
    fastify.log.error(`Ошибка сохранения комментария: ${err.message}`);
    return reply.code(500).send({ error: 'Ошибка сервера при сохранении комментария' });
  }
});

fastify.get('/news/popular', async (request, reply) => {
  const stmt = db.prepare(`
    SELECT 
      news.id, 
      news.title, 
      news.view_count, 
      categories.name as categoryName, 
      categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count,
      
      news.imageUrl,  
      news.createdAt  
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.status = 'approved'
    ORDER BY news.view_count DESC 
    LIMIT 5
  `);
  const popularNews = stmt.all();
  return popularNews;
});

fastify.get('/news/featured', async (request, reply) => {
  const stmt = db.prepare(`
    SELECT 
      news.*, 
      categories.name as categoryName, 
      categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
    WHERE news.is_featured = 1 AND news.status = 'approved'
    ORDER BY news.createdAt DESC 
    LIMIT 1
  `);
  const featuredArticle = stmt.get();
  return featuredArticle || null;
});

fastify.register(async (adminRoutes) => {
  adminRoutes.addHook('preHandler', checkPermission('editor'));


  adminRoutes.register(async (editorRoutes) => {
    editorRoutes.addHook('preHandler', checkPermission('editor'));
    
    editorRoutes.get('/news/all', async (request, reply) => {
      const stmt = db.prepare(`
        SELECT news.id, news.title, news.is_featured, news.status, news.view_count, categories.name as categoryName
        FROM news
        LEFT JOIN categories ON news.category_id = categories.id
        ORDER BY news.createdAt DESC
      `);
      const news = stmt.all();
      return news;
    });

    editorRoutes.put('/news/:id/feature', async (request, reply) => {
      const { id } = request.params;

      // Используем транзакцию, чтобы обе операции выполнились успешно
      const featureTx = db.transaction(() => {
        // 1. Сначала снимаем флаг со всех
        db.prepare('UPDATE news SET is_featured = 0 WHERE is_featured = 1').run();
        // 2. Ставим флаг на одну
        const info = db.prepare('UPDATE news SET is_featured = 1 WHERE id = ?').run(id);
        return info;
      });

      try {
        const info = featureTx();
        if (info.changes === 0) {
          return reply.code(404).send({ error: 'Новость не найдена' });
        }
        return { message: 'Новость сделана главной' };
      } catch (err) {
        fastify.log.error('Ошибка при установке главной новости:', err);
        return reply.code(500).send({ error: 'Ошибка сервера' });
      }
    });

    editorRoutes.post('/news', async (request, reply) => {
      let uploadedFilePath = null; // Путь к загруженному файлу
      const data = {}; // Здесь будут текстовые поля (title, content...)
      
      try {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.file) {
            // Это ФАЙЛ
            if (part.file.truncated) {
              return reply.code(413).send({ error: 'Файл слишком большой' });
            }
            // Генерируем уникальное имя
            const filename = Date.now() + '-' + part.filename.replace(/[^a-zA-Z0-9.-]/g, '');
            const savePath = path.join(__dirname, 'uploads', filename);
            
            // Сохраняем файл на диск
            await pump(part.file, fs.createWriteStream(savePath));
            uploadedFilePath = `/uploads/${filename}`; // Этот путь пойдет в БД
            
          } else {
            // Это текстовое ПОЛЕ
            data[part.fieldname] = part.value;
          }
        }
      } catch (err) {
        fastify.log.error(err, 'ОШИБКА (A) ПРИ ЗАГРУЗКЕ ФАЙЛА (POST):');
        // Возвращаем 413, если файл слишком большой
        if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
          return reply.code(413).send({ error: 'Файл слишком большой. Лимит 10 МБ.' });
        }
        return reply.code(500).send({ error: 'Ошибка обработки файла' });
      
      }

      const { 
        title = '', 
        content = '', 
        imageUrl, 
        category_id = '', 
        is_featured = '0' 
      } = data;
      if (!title || !content) {
        return reply.code(400).send({ error: 'Заголовок и контент обязательны' });
      }

      // ЛОГИКА "ИЛИ/ИЛИ":
      // 1. Приоритет у загруженного файла.
      // 2. Если файла нет, берем URL из текстового поля.
      const finalImageUrl = uploadedFilePath || imageUrl || null;
      
      const status = request.user.role === 'admin' ? 'approved' : 'pending';
      let info;
      try {
        if (is_featured === '1') { // FormData присылает '1'/'0'
          db.prepare('UPDATE news SET is_featured = 0 WHERE is_featured = 1').run();
        }
        
        const stmt = db.prepare('INSERT INTO news (title, content, imageUrl, category_id, is_featured, status) VALUES (?, ?, ?, ?, ?, ?)');
        info = stmt.run(
          title, 
          content, 
          finalImageUrl, 
          category_id || null, 
          is_featured === '1' ? 1 : 0, 
          status
        );
      } catch (err) {
        fastify.log.error('Ошибка при создании новости:', err);
        return reply.code(500).send({ error: 'Ошибка сервера' });
      }

      if (status === 'pending') {
        return reply.code(201).send({ message: 'Новость создана и отправлена на модерацию', id: info.lastInsertRowid });
      }
      return reply.code(201).send({ message: 'Новость создана и опубликована', id: info.lastInsertRowid });
    });

    editorRoutes.get('/news/:id', async (request, reply) => {
      const { id } = request.params;
      const stmt = db.prepare(`
        SELECT 
          news.*, 
          categories.name as categoryName, 
          categories.slug as categorySlug
        FROM news 
        LEFT JOIN categories ON news.category_id = categories.id 
        WHERE news.id = ?
      `);
      const article = stmt.get(id);

      if (!article) {
        return reply.code(404).send({ error: 'Новость не найдена' });
      }
      return article;
    });

   editorRoutes.put('/news/:id', async (request, reply) => {
      const { id } = request.params;
      let uploadedFilePath = null;
      const data = {};

      try {
        const parts = request.parts();
        for await (const part of parts) {
          if (part.file) {
            const filename = Date.now() + '-' + part.filename.replace(/[^a-zA-Z0-9.-]/g, '');
            const savePath = path.join(__dirname, 'uploads', filename);
            await pump(part.file, fs.createWriteStream(savePath));
            uploadedFilePath = `/uploads/${filename}`;
          } else {
            data[part.fieldname] = part.value;
          }
        }
      } catch (err) {
        fastify.log.error(err, 'ОШИБКА (A) ПРИ ЗАГРУЗКЕ ФАЙЛА (PUT):');
        // Возвращаем 413, если файл слишком большой
        if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
          return reply.code(413).send({ error: 'Файл слишком большой. Лимит 10 МБ.' });
        }
        return reply.code(500).send({ error: 'Ошибка обработки файла' });
      }

      // --- !! НАДЕЖНОЕ ИСПРАВЛЕНИЕ !! ---
      // Мы получаем все поля из 'data' и ставим значения по умолчанию
      // Это предотвратит 'undefined' при отправке файла
      const { 
        title = undefined, 
        content = undefined, 
        imageUrl, 
        category_id = undefined, 
        is_featured = undefined
      } = data;
      
      let finalImageUrl;
      if (uploadedFilePath) {
        finalImageUrl = uploadedFilePath; 
      } else if (imageUrl === 'null') {
        finalImageUrl = null; 
      } else if (imageUrl) {
        finalImageUrl = imageUrl;
      }

      try {
        // Получаем текущие данные из БД, чтобы не перезаписать title/content на undefined
        const currentStmt = db.prepare('SELECT * FROM news WHERE id = ?');
        const currentArticle = currentStmt.get(id);
        if (!currentArticle) {
          return reply.code(404).send({ error: 'Новость не найдена' });
        }

        // Собираем итоговые данные
        const finalTitle = title !== undefined ? title : currentArticle.title;
        const finalContent = content !== undefined ? content : currentArticle.content;
        
        // (is_featured может быть 'true'/'false' из FormData или undefined)
        const finalIsFeatured = (is_featured === '1' || is_featured === 'true' || is_featured === true) ? 1 : 0;
        
        const finalCategoryId = (category_id && category_id !== '') 
          ? parseInt(category_id) 
          : (category_id === '') ? null : currentArticle.category_id;


        if (finalIsFeatured === 1) {
          db.prepare('UPDATE news SET is_featured = 0 WHERE is_featured = 1 AND id != ?').run(id);
        }

        let stmt;
        if (finalImageUrl !== undefined) {
          // Обновляем картинку
          stmt = db.prepare(`
            UPDATE news 
            SET title = ?, content = ?, imageUrl = ?, category_id = ?, is_featured = ? 
            WHERE id = ?
          `);
          stmt.run(
            finalTitle, 
            finalContent, 
            finalImageUrl, 
            finalCategoryId,
            finalIsFeatured, 
            id
          );
        } else {
          // НЕ трогаем картинку
          stmt = db.prepare(`
            UPDATE news 
            SET title = ?, content = ?, category_id = ?, is_featured = ? 
            WHERE id = ?
          `);
          stmt.run(
            finalTitle, 
            finalContent, 
            finalCategoryId,
            finalIsFeatured, 
            id
          );
        }

        return { message: `Новость ${id} обновлена` };
        
      } catch (err) {
        // --- !! ВАЖНАЯ ЧАСТЬ ДЛЯ ДИАГНОСТИКИ !! ---
        fastify.log.error('ОШИБКА (B) ПРИ ОБНОВЛЕНИИ БД (PUT):', err); 
        return reply.code(500).send({ error: 'Ошибка сервера при записи в БД' });
      }
    });

    editorRoutes.delete('/news/:id', async (request, reply) => {
      const { id } = request.params;
      const stmt = db.prepare('DELETE FROM news WHERE id = ?');
      const info = stmt.run(id);
      if (info.changes === 0) {
          return reply.code(404).send({ error: 'Новость для удаления не найдена' });
      }
      return { message: `Новость ${id} удалена` };
    });
  });

  adminRoutes.register(async (superAdminRoutes) => {
    // Этот хук проверяет, что у пользователя роль 'admin'
    superAdminRoutes.addHook('preHandler', checkPermission('admin'));

    // --- УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ---

    // Получить список всех пользователей
    superAdminRoutes.get('/users', async (request, reply) => {
      const stmt = db.prepare('SELECT id, username, role, fullname FROM users WHERE id != ?');
      const users = stmt.all(request.user.userId);
      return users;
    });

    // Изменить роль пользователя
    superAdminRoutes.put('/users/:id/role', async (request, reply) => {
      const { id } = request.params;
      const { role } = request.body;

      if (role !== 'admin' && role !== 'editor' && role !== 'user') {
        return reply.code(400).send({ error: 'Неверная роль' });
      }

      const stmt = db.prepare('UPDATE users SET role = ? WHERE id = ?');
      const info = stmt.run(role, id);

      if (info.changes === 0) {
        return reply.code(404).send({ error: 'Пользователь не найден' });
      }
      return { message: `Роль пользователя ${id} обновлена на ${role}` };
    });

    // --- МОДЕРАЦИЯ НОВОСТЕЙ ---
    
    // Получить все новости "на рассмотрении" (pending)
    superAdminRoutes.get('/news/pending', async (request, reply) => {
      const stmt = db.prepare(`
        SELECT news.*, categories.name as categoryName 
        FROM news 
        LEFT JOIN categories ON news.category_id = categories.id 
        WHERE news.status = 'pending'
        ORDER BY news.createdAt DESC
      `);
      const pendingNews = stmt.all();
      return pendingNews;
    });

    // Одобрить новость
    superAdminRoutes.put('/news/:id/approve', async (request, reply) => {
      const { id } = request.params;
      
      const stmt = db.prepare("UPDATE news SET status = 'approved' WHERE id = ?");
      const info = stmt.run(id);

      if (info.changes === 0) {
        return reply.code(404).send({ error: 'Новость не найдена' });
      }
      return { message: 'Новость одобрена и опубликована' };
    });

    superAdminRoutes.post('/categories', async (request, reply) => {
      const { name, slug } = request.body;
      if (!name || !slug) {
        return reply.code(400).send({ error: 'Имя и Slug обязательны' });
      }
      try {
        const stmt = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
        const info = stmt.run(name, slug);
        const newCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid);
        return reply.code(201).send(newCategory);
      } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return reply.code(409).send({ error: 'Slug категории должен быть уникальным' });
        }
        fastify.log.error('Ошибка создания категории:', err);
        return reply.code(500).send({ error: 'Ошибка сервера' });
      }
    });

    // Обновить категорию
    superAdminRoutes.put('/categories/:id', async (request, reply) => {
      const { id } = request.params;
      const { name, slug } = request.body;
      if (!name || !slug) {
        return reply.code(400).send({ error: 'Имя и Slug обязательны' });
      }
      try {
        const stmt = db.prepare('UPDATE categories SET name = ?, slug = ? WHERE id = ?');
        const info = stmt.run(name, slug, id);
        if (info.changes === 0) {
          return reply.code(404).send({ error: 'Категория не найдена' });
        }
        return { message: 'Категория обновлена' };
      } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return reply.code(409).send({ error: 'Этот Slug уже занят' });
        }
        fastify.log.error('Ошибка обновления категории:', err);
        return reply.code(500).send({ error: 'Ошибка сервера' });
      }
    });

    // Удалить категорию
    superAdminRoutes.delete('/categories/:id', async (request, reply) => {
      const { id } = request.params;
      try {
        const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
        const info = stmt.run(id);
        if (info.changes === 0) {
          return reply.code(404).send({ error: 'Категория не найдена' });
        }
        return { message: 'Категория удалена' };
      } catch (err) {
        // Проверяем, используется ли категория
        if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
          return reply.code(409).send({ error: 'Нельзя удалить категорию, в которой есть новости' });
        }
        fastify.log.error('Ошибка удаления категории:', err);
        return reply.code(500).send({ error: 'Ошибка сервера' });
      }
    });
  });
  
}, { prefix: '/admin' });

const start = async () => {
  try {
    await fastify.listen({ port: 3001 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();