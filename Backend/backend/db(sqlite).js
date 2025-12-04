const Database = require('better-sqlite3');
const db = new Database('news.db', { verbose: console.log });

// Создаем таблицы при первом запуске
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
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
try {
  // Добавляем колонку 'status' для модерации
  db.exec(`
    ALTER TABLE news ADD COLUMN status TEXT DEFAULT 'approved' NOT NULL;
  `);
  // Сразу делаем все старые новости 'approved' (одобренными)
  db.exec(`
    UPDATE news SET status = 'approved' WHERE status IS NULL;
  `);
  console.log('Таблица "news" успешно обновлена (status).');
} catch (err) {
  if (!err.message.includes('duplicate column name')) {
    console.error('Ошибка при обновлении таблицы news (status):', err);
  }
}

try {
  // Пытаемся добавить новые колонки в таблицу users
  // 'IF NOT EXISTS' поддерживается в ALTER TABLE в SQLite
  db.exec(`
    ALTER TABLE users ADD COLUMN fullname TEXT;
    ALTER TABLE users ADD COLUMN avatarUrl TEXT;
  `);
  console.log('Таблица "users" успешно обновлена (fullname, avatarUrl).');
} catch (err) {
  // Игнорируем ошибку, если колонки уже существуют
  if (!err.message.includes('duplicate column name')) {
    console.error('Ошибка при обновлении таблицы users:', err);
  }
}

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