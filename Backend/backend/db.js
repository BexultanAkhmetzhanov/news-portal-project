const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const initDb = async () => {
  try {
    // 1. Создаем таблицы
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        refresh_token TEXT,
        fullname TEXT,
        "avatarUrl" TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        "imageUrl" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        category_id INTEGER REFERENCES categories(id),
        is_featured INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        status TEXT DEFAULT 'approved' NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        placement TEXT NOT NULL,
        "adCode" TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Настраиваем Умный Поиск (С принудительным lower() для русских букв)
    // 👇 ЗДЕСЬ ИЗМЕНЕНИЕ: используем lower()
    await pool.query(`
      ALTER TABLE news ADD COLUMN IF NOT EXISTS search_vector tsvector 
      GENERATED ALWAYS AS (to_tsvector('russian', lower(title) || ' ' || lower(content))) STORED;
    `).catch(() => {});

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_news_search ON news USING GIN(search_vector);
    `);

    // 3. Данные по умолчанию
    const catCheck = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      await pool.query("INSERT INTO categories (name, slug) VALUES ($1, $2), ($3, $4), ($5, $6)", 
        ['Политика', 'politics', 'Спорт', 'sport', 'Технологии', 'tech']);
      console.log('Базовые категории добавлены.');
    }

    console.log('Успешное подключение к PostgreSQL и инициализация.');
  } catch (err) {
    console.error('Ошибка инициализации БД:', err);
  }
};

initDb();

module.exports = pool;