require('dotenv').config();
const Database = require('better-sqlite3');
const { Pool } = require('pg');
const fs = require('fs');

// 1. Подключение к старой SQLite
if (!fs.existsSync('news.db')) {
  console.error('❌ Файл news.db не найден! Убедитесь, что он лежит в папке backend.');
  process.exit(1);
}
const sqlite = new Database('news.db');

// 2. Подключение к новой PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Начинаем миграцию данных...');

    // --- Очистка текущих данных в Postgres (чтобы не было дублей) ---
    // Используем CASCADE, чтобы удалить связанные записи
    await client.query('TRUNCATE comments, news, categories, users, ads RESTART IDENTITY CASCADE'); 

    // --- 1. USERS ---
    const users = sqlite.prepare('SELECT * FROM users').all();
    for (const u of users) {
      await client.query(
        `INSERT INTO users (id, username, password, role, fullname, "avatarUrl") 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [u.id, u.username, u.password, u.role, u.fullname, u.avatarUrl]
      );
    }
    console.log(`✅ Пользователи перенесены: ${users.length}`);

    // --- 2. CATEGORIES ---
    const categories = sqlite.prepare('SELECT * FROM categories').all();
    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)`,
        [c.id, c.name, c.slug]
      );
    }
    console.log(`✅ Категории перенесены: ${categories.length}`);

    // --- 3. NEWS ---
    const news = sqlite.prepare('SELECT * FROM news').all();
    for (const n of news) {
      // Конвертируем старые форматы дат, если нужно, или передаем как есть
      await client.query(
        `INSERT INTO news (id, title, content, "imageUrl", "createdAt", category_id, is_featured, view_count, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          n.id, 
          n.title, 
          n.content, 
          n.imageUrl, 
          new Date(n.createdAt), // Postgres любит объекты Date
          n.category_id, 
          n.is_featured, 
          n.view_count, 
          n.status || 'approved'
        ]
      );
    }
    console.log(`✅ Новости перенесены: ${news.length}`);

    // --- 4. COMMENTS ---
    const comments = sqlite.prepare('SELECT * FROM comments').all();
    for (const cm of comments) {
      await client.query(
        `INSERT INTO comments (id, news_id, author, content, "createdAt") 
         VALUES ($1, $2, $3, $4, $5)`,
        [cm.id, cm.news_id, cm.author, cm.content, new Date(cm.createdAt)]
      );
    }
    console.log(`✅ Комментарии перенесены: ${comments.length}`);

    // --- 5. ОБНОВЛЕНИЕ СЧЕТЧИКОВ (SEQUENCES) ---
    // Это критически важно! Иначе при создании новой новости Postgres попытается дать ей ID=1, который уже занят.
    await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
    await client.query(`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories))`);
    await client.query(`SELECT setval('news_id_seq', (SELECT MAX(id) FROM news))`);
    await client.query(`SELECT setval('comments_id_seq', (SELECT MAX(id) FROM comments))`);
    // Для ads таблицы, если она пустая, сбросим
    await client.query(`SELECT setval('ads_id_seq', COALESCE((SELECT MAX(id) FROM ads), 1), false)`);

    console.log('🎉 Миграция успешно завершена!');

  } catch (err) {
    console.error('❌ Ошибка миграции:', err);
  } finally {
    client.release();
    pool.end();
    sqlite.close();
  }
}

migrate();