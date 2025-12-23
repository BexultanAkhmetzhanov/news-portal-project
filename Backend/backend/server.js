require('dotenv').config();
const path = require('path');
const fs = require('fs');
// Логирование полезно для отладки
const fastify = require('fastify')({ logger: true });
const sanitizeHtml = require('sanitize-html');

// Создаем папку uploads, если нет
const uploadDir = path.join(__dirname, 'uploads');
try { 
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
} catch (e) {
  console.error('Ошибка создания папки uploads:', e);
}

// 1. Стандартные плагины
fastify.register(require('@fastify/cors'), {
  origin: true, // Разрешаем фронтенду подключаться
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
});

fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/multipart'), { limits: { fileSize: 10 * 1024 * 1024 } }); // Лимит 10МБ
fastify.register(require('@fastify/helmet'), { global: true, crossOriginResourcePolicy: false });

// ВАЖНО: Раздача статики (картинок)
// Файлы будут доступны по адресу: http://localhost:3001/uploads/имя.webp
fastify.register(require('@fastify/static'), {
  root: uploadDir,
  prefix: '/uploads/',  
});

// 2. Кастомные плагины (Авторизация)
fastify.register(require('./plugins/auth')); 

// 3. Rate Limit
const requestCounts = new Map();
setInterval(() => { requestCounts.clear(); }, 10 * 60 * 1000);

fastify.addHook('onRequest', async (request, reply) => {
  const ip = request.ip || 'unknown';
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, startTime: Date.now() });
  } else {
    const data = requestCounts.get(ip);
    if (Date.now() - data.startTime > 30000) {
      data.count = 1; data.startTime = Date.now();
    } else {
      data.count++;
      if (data.count > 1000) return reply.code(429).send({ error: 'Too Many Requests' });
    }
  }
});

// 4. Очистка HTML
fastify.addHook('preHandler', async (request, reply) => {
  if (request.body && typeof request.body === 'object') {
    for (const key in request.body) {
      // Не очищаем пароли и URL картинок, остальное чистим
      if (typeof request.body[key] === 'string' && key !== 'password' && key !== 'imageUrl' && key !== 'avatarUrl') {
        request.body[key] = sanitizeHtml(request.body[key], {
          allowedTags: ['h1', 'h2', 'p', 'b', 'i', 'u', 'strong', 'ul', 'ol', 'li', 'a', 'br', 'img'],
          allowedAttributes: { 'a': ['href', 'target'], 'img': ['src', 'alt'] }
        });
      }
    }
  }
});

// 5. Регистрация Роутов
fastify.register(require('./routes/authRoutes'));
fastify.register(require('./routes/newsRoutes')); 
// Префикс /users важен для работы профиля
fastify.register(require('./routes/userRoutes'), { prefix: '/users' });
fastify.register(require('./routes/adminRoutes'), { prefix: '/admin' });

// 6. Запуск сервера
const start = async () => {
  try {
    // ЗАПУСКАЕМ НА 3001
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('Server running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();