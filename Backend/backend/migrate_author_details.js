const db = require('./db');

const migrate = async () => {
  try {
    console.log('🔄 Добавляем поля для профиля автора...');
    
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS education TEXT,
      ADD COLUMN IF NOT EXISTS awards TEXT,
      ADD COLUMN IF NOT EXISTS "jobTitle" VARCHAR(255);
    `);
    
    console.log('✅ Поля добавлены (bio, education, awards, jobTitle).');
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
  } finally {
    process.exit();
  }
};

migrate();