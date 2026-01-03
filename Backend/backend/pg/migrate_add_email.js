require('dotenv').config();
const db = require('./db');

const migrate = async () => {
  try {
    console.log('🔧 Добавляем колонку email в таблицу users...');

    // Добавляем колонку email, если её нет
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "email" VARCHAR(255) UNIQUE;
    `);
    
    console.log('✅ Колонка email успешно добавлена!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка миграции:', err.message);
    process.exit(1);
  }
};

migrate();