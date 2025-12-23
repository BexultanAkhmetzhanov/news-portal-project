// backend/resetAdsTable.js
const db = require('./db'); 

const resetAdsTable = async () => {
  try {
    console.log('🗑 Удаляем старую таблицу ads...');
    await db.query('DROP TABLE IF EXISTS ads');
    
    console.log('✨ Создаем новую таблицу ads с колонкой placement...');
    const sql = `
      CREATE TABLE ads (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255),
          placement VARCHAR(50),       -- Вот эта важная колонка
          "imageUrl" VARCHAR(255),
          link VARCHAR(255),
          views INT DEFAULT 0,
          clicks INT DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(sql);
    console.log('✅ Готово! Таблица пересоздана.');
  } catch (err) {
    console.error('❌ Ошибка:', err);
  } finally {
    process.exit();
  }
};

resetAdsTable();