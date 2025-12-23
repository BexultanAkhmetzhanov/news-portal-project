require('dotenv').config();
const path = require('path');
const fs = require('fs');
const fastify = require('fastify')({ logger: true });
const sanitizeHtml = require('sanitize-html'); // Используется в хуке очистки

// Создаем папку uploads, если нет
try { fs.mkdirSync(path.join(__dirname, 'uploads')); } catch (e) {}

// 1. Стандартные плагины
fastify.register(require('@fastify/cors'), {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
});
fastify.register(require('@fastify/cookie'));
fastify.register(require('@fastify/multipart'), { limits: { fileSize: 10 * 1024 * 1024 } });
fastify.register(require('@fastify/helmet'), { global: true, crossOriginResourcePolicy: false });
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'uploads'),
  prefix: '/uploads/',  
});

// 2. Кастомные плагины (Авторизация)
fastify.register(require('./plugins/auth')); 

// 3. Rate Limit (Простая защита)
const requestCounts = new Map();

setInterval(() => {requestCounts.clear(); }, 10 * 60 * 1000);

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

fastify.addHook('preHandler', async (request, reply) => {
  if (request.body && typeof request.body === 'object') {
    for (const key in request.body) {
      if (typeof request.body[key] === 'string' && key !== 'password' && key !== 'imageUrl') {
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

// Регистрируем newsRoutes в корне
fastify.register(require('./routes/newsRoutes')); 

// ИЗМЕНЕНИЕ ЗДЕСЬ: поменяли prefix с '/api' на '/users'
// Теперь запросы PUT http://localhost:3001/users/1 будут работать
fastify.register(require('./routes/userRoutes'), { prefix: '/users' });

// Админка
fastify.register(require('./routes/adminRoutes'), { prefix: '/admin' });

// Запуск
const start = async () => {
  try {
    await fastify.listen({ port: 3001 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();