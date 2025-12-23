// backend/createAdsTable.js
const db = require('./db'); // Убедись, что путь к db правильный (как в server.js)

const createTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),          -- Название для админа
        placement VARCHAR(50),       -- 'header' или 'sidebar'
        "imageUrl" VARCHAR(255),     -- Ссылка на картинку
        link VARCHAR(255),           -- Куда ведет клик
        views INT DEFAULT 0,         -- Просмотры
        clicks INT DEFAULT 0,        -- Клики
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    console.log('Создаем таблицу ads...');
    await db.query(sql);
    console.log('✅ Таблица "ads" успешно создана!');
  } catch (err) {
    console.error('❌ Ошибка при создании таблицы:', err);
  } finally {
    process.exit();
  }
};

createTable();