const Database = require('better-sqlite3');
const db = new Database('news.db', { verbose: console.log });

// Создаем таблицы при первом запуске
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'editor',
    refresh_token TEXT 
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    imageUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    category_id INTEGER,
    is_featured INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  );

  CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    placement TEXT NOT NULL,
    adCode TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    news_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (news_id) REFERENCES news (id) ON DELETE CASCADE
  );
`);

/* --- НОВЫЙ КОД (ВСТАВИТЬ ПОСЛЕ db.exec) --- */
// Добавим несколько категорий по умолчанию, если их нет
try {
  const stmt = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)');
  stmt.run('Политика', 'politics');
  stmt.run('Спорт', 'sport');
  stmt.run('Технологии', 'tech');
} catch (err) {
  // Игнорируем ошибку, если они уже существуют (UNIQUE constraint)
  if (!err.code.includes('UNIQUE')) {
    console.error('Ошибка при добавлении категорий:', err);
  }
}
/* --- КОНЕЦ НОВОГО КОДА --- */


module.exports = db;