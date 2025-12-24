// Загружаем переменные окружения, если они не загружены в db.js
require('dotenv').config(); 
const db = require('./db');

const migrate = async () => {
  try {
    console.log('Начало миграции для Google Auth...');

    // 1. Добавляем колонку googleId
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "googleId" VARCHAR(255) UNIQUE;
    `);
    console.log('✅ Колонка googleId добавлена/проверена');

    // 2. Добавляем authProvider
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "authProvider" VARCHAR(50) DEFAULT 'local';
    `);
    console.log('✅ Колонка authProvider добавлена/проверена');

    // 3. Делаем password необязательным (для входа через соцсети)
    await db.query(`
      ALTER TABLE users 
      ALTER COLUMN password DROP NOT NULL;
    `);
    console.log('✅ Поле password теперь необязательно');
    
    // 4. Добавляем avatarUrl
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
    `);
    console.log('✅ Колонка avatarUrl добавлена/проверена');
    
    // 5. Добавляем fullname
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS "fullname" VARCHAR(255);
    `);
    console.log('✅ Колонка fullname добавлена/проверена');

    console.log('🎉 Миграция успешно завершена!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка миграции:', err);
    process.exit(1);
  }
};

migrate();