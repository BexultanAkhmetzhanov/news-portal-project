require('dotenv').config();
const db = require('./db');

const update = async () => {
  console.log('🔄 Создаем таблицу для лайков комментариев...');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS comment_votes (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
        value INTEGER NOT NULL, -- 1 (лайк) или -1 (дизлайк)
        PRIMARY KEY (user_id, comment_id)
      );
    `);
    console.log('✅ Готово! Таблица comment_votes создана.');
    process.exit();
  } catch (err) {
    console.error('Ошибка:', err);
    process.exit(1);
  }
};

update();