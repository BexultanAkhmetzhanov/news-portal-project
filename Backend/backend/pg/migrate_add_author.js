const db = require('./db');

const migrate = async () => {
  try {
    console.log('🔄 Начало миграции: добавление author_id...');

    // 1. Добавляем колонку
    await db.query(`
      ALTER TABLE news 
      ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);
    console.log('✅ Колонка author_id добавлена.');

    // 2. Назначаем всем старым новостям первого попавшегося админа (обычно id=1)
    // Это нужно, чтобы старые новости не остались "сиротами"
    await db.query(`
      UPDATE news 
      SET author_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1) 
      WHERE author_id IS NULL;
    `);
    console.log('✅ Старым новостям назначен автор (Администратор).');

  } catch (err) {
    console.error('❌ Ошибка миграции:', err.message);
  } finally {
    process.exit();
  }
};

migrate();