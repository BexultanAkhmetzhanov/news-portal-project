const db = require('./db');

const migrate = async () => {
  try {
    console.log('Создание таблиц для тегов...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS news_tags (
        news_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (news_id, tag_id),
        FOREIGN KEY(news_id) REFERENCES news(id) ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    console.log('Таблицы тегов успешно созданы!');
  } catch (err) {
    console.error(err);
  }
};

migrate();