const fastify = require('fastify')({ logger: true });
const db = require('./db.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

fastify.register(require('@fastify/cors'), {
  origin: 'http://localhost:5173',
  credentials: true,
});
fastify.register(require('@fastify/cookie'));

const JWT_SECRET = 'your_super_secret_key_12345';
const SALT_ROUNDS = 10;

fastify.post('/register', async (request, reply) => {
  const { username, password } = request.body;
  if (!username || !password) {
    return reply.code(400).send({ error: 'Нужны имя пользователя и пароль' });
  }
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    const stmt = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const info = stmt.run(username, hashedPassword, 'editor'); 
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
      role: user.role 
    } 
  };
});

fastify.post('/logout', async (request, reply) => {
  reply.clearCookie('accessToken', { path: '/' });
  return { message: 'Выход выполнен' };
});

function checkPermission(requiredRole) {
  const rolesHierarchy = {
    'admin': ['admin', 'editor'],
    'editor': ['editor']
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

fastify.get('/news', async (request, reply) => {
  const stmt = db.prepare(`
    SELECT 
      news.*, 
      categories.name as categoryName, 
      categories.slug as categorySlug,
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
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
    WHERE news.id = ?
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
    WHERE news.category_id = ? 
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
      WHERE news.title LIKE ? OR news.content LIKE ?
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
      (SELECT COUNT(*) FROM comments WHERE comments.news_id = news.id) as comment_count
    FROM news 
    LEFT JOIN categories ON news.category_id = categories.id 
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
    WHERE news.is_featured = 1 
    ORDER BY news.createdAt DESC 
    LIMIT 1
  `);
  const featuredArticle = stmt.get();
  return featuredArticle || null;
});

fastify.register(async (adminRoutes) => {
  adminRoutes.register(async (editorRoutes) => {
    editorRoutes.addHook('preHandler', checkPermission('editor'));
    
    editorRoutes.post('/news', async (request, reply) => {
      const { title, content, imageUrl, category_id, is_featured } = request.body;
      if (!title || !content) {
        return reply.code(400).send({ error: 'Заголовок и контент обязательны' });
      }
      const stmt = db.prepare('INSERT INTO news (title, content, imageUrl, category_id, is_featured) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(title, content, imageUrl || null, category_id || null, is_featured ? 1 : 0);
      return reply.code(201).send({ message: 'Новость создана', id: info.lastInsertRowid });
    });

    editorRoutes.put('/news/:id', async (request, reply) => {
      const { id } = request.params;
      const { title, content, imageUrl, category_id, is_featured } = request.body;
      
      const stmt = db.prepare(`
        UPDATE news 
        SET title = ?, content = ?, imageUrl = ?, category_id = ?, is_featured = ? 
        WHERE id = ?
      `);
      const info = stmt.run(
        title, 
        content, 
        imageUrl || null, 
        category_id || null, 
        is_featured ? 1 : 0, 
        id
      );
      
      if (info.changes === 0) {
          return reply.code(404).send({ error: 'Новость для обновления не найдена' });
      }
      return { message: `Новость ${id} обновлена` };
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
    superAdminRoutes.addHook('preHandler', checkPermission('admin'));
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