require('dotenv').config();
const db = require('./db');

const updateSchema = async () => {
  console.log('🔄 Обновляем структуру базы...');
  try {
    // 1. Таблица для Лайков/Дизлайков
    // value = 1 (лайк) или -1 (дизлайк)
    // UNIQUE(user_id, news_id) гарантирует, что 1 юзер ставит 1 оценку на новость
    await db.query(`
      CREATE TABLE IF NOT EXISTS votes (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
        value INTEGER NOT NULL, 
        PRIMARY KEY (user_id, news_id)
      );
    `);

    // 2. Добавляем поле parent_id в комментарии (для ответов)
    await db.query(`
      ALTER TABLE comments 
      ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
    `);

    console.log('✅ База данных успешно обновлена!');
    process.exit();
  } catch (err) {
    console.error('Ошибка обновления:', err);
    process.exit(1);
  }
};

updateSchema();