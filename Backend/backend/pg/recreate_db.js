require('dotenv').config();
const db = require('./db');

const recreateDb = async () => {
  console.log('🧨 Начинаем полный сброс базы данных...');
  
  try {
    // Удаляем таблицы в правильном порядке (из-за связей)
    await db.query('DROP TABLE IF EXISTS news_tags CASCADE');
    await db.query('DROP TABLE IF EXISTS comments CASCADE');
    await db.query('DROP TABLE IF EXISTS ads CASCADE');
    await db.query('DROP TABLE IF EXISTS news CASCADE');
    await db.query('DROP TABLE IF EXISTS categories CASCADE');
    await db.query('DROP TABLE IF EXISTS tags CASCADE');
    await db.query('DROP TABLE IF EXISTS users CASCADE');
    
    console.log('✅ Все старые таблицы удалены.');
    console.log('🚀 Теперь запустите "node server.js", чтобы создать их заново правильно.');
  } catch (err) {
    console.error('Ошибка при сбросе:', err);
  } finally {
    process.exit();
  }
};

recreateDb();