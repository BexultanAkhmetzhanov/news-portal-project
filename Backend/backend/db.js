const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log('📦 Проверка структуры БД...');

    // 1. Таблица Пользователей
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        fullname VARCHAR(100),
        "avatarUrl" TEXT
      );
    `);

    // 2. Категории
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        slug VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    // 3. Новости (Обрати внимание на кавычки в "createdAt" и "imageUrl")
    await client.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        "imageUrl" TEXT,
        category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
        is_featured INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'approved',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Полнотекстовый поиск (search_vector)
    // Добавляем колонку, если её нет (чтобы не было ошибок при повторном запуске)
    await client.query(`
      ALTER TABLE news ADD COLUMN IF NOT EXISTS search_vector tsvector 
      GENERATED ALWAYS AS (to_tsvector('russian', lower(title) || ' ' || lower(content))) STORED;
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_news_search ON news USING GIN(search_vector);`);

    // 5. Комментарии
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
        author VARCHAR(100),
        content TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Теги
    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS news_tags (
        news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (news_id, tag_id)
      );
    `);

    // 7. Реклама (если нужна)
    await client.query(`
      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        "imageUrl" TEXT,
        link TEXT
      );
    `);

    console.log('✅ База данных готова и структура верна!');
  } catch (err) {
    console.error('❌ Ошибка инициализации БД:', err);
  } finally {
    client.release();
  }
};

// Запускаем инициализацию при старте
initDb();

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};