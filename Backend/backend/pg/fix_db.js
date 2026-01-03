require('dotenv').config();
const db = require('./db');

const fixDb = async () => {
  console.log('🔄 Начинаем проверку и исправление базы данных...');
  
  const client = await db.connect();
  
  try {
    // 1. Проверяем и исправляем колонку даты (created_at -> "createdAt")
    try {
      await client.query('SELECT "createdAt" FROM news LIMIT 1');
      console.log('✅ Колонка "createdAt" существует.');
    } catch (e) {
      console.log('⚠️ Колонка "createdAt" не найдена. Ищем старые варианты...');
      try {
        await client.query('ALTER TABLE news RENAME COLUMN created_at TO "createdAt"');
        console.log('🛠 Исправлено: created_at -> "createdAt"');
      } catch (e2) {
        try {
          await client.query('ALTER TABLE news RENAME COLUMN createdat TO "createdAt"');
          console.log('🛠 Исправлено: createdat -> "createdAt"');
        } catch (e3) {
          console.log('❌ Не удалось найти колонку даты. Возможно, она уже верная или таблица пуста.');
        }
      }
    }

    // 2. Проверяем колонку view_count (Просмотры)
    try {
      await client.query('SELECT view_count FROM news LIMIT 1');
      console.log('✅ Колонка view_count существует.');
    } catch (e) {
      console.log('⚠️ Добавляем колонку view_count...');
      await client.query('ALTER TABLE news ADD COLUMN view_count INTEGER DEFAULT 0');
      console.log('🛠 Колонка view_count добавлена.');
    }

    // 3. Проверяем колонку is_featured (Избранное)
    try {
      await client.query('SELECT is_featured FROM news LIMIT 1');
      console.log('✅ Колонка is_featured существует.');
    } catch (e) {
      console.log('⚠️ Добавляем колонку is_featured...');
      await client.query('ALTER TABLE news ADD COLUMN is_featured INTEGER DEFAULT 0');
      console.log('🛠 Колонка is_featured добавлена.');
    }

    // 4. Проверяем колонку status (Статус)
    try {
      await client.query('SELECT status FROM news LIMIT 1');
      console.log('✅ Колонка status существует.');
    } catch (e) {
      console.log('⚠️ Добавляем колонку status...');
      await client.query("ALTER TABLE news ADD COLUMN status TEXT DEFAULT 'approved' NOT NULL");
      console.log('🛠 Колонка status добавлена.');
    }

    // 5. Проверяем search_vector (Поиск)
    try {
      await client.query('SELECT search_vector FROM news LIMIT 1');
      console.log('✅ Колонка search_vector существует.');
    } catch (e) {
      console.log('⚠️ Добавляем search_vector...');
      await client.query(`
        ALTER TABLE news ADD COLUMN IF NOT EXISTS search_vector tsvector 
        GENERATED ALWAYS AS (to_tsvector('russian', lower(title) || ' ' || lower(content))) STORED;
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_news_search ON news USING GIN(search_vector);`);
      console.log('🛠 search_vector добавлен.');
    }

    console.log('🎉 База данных успешно обновлена!');
  } catch (err) {
    console.error('💥 Ошибка при обновлении БД:', err);
  } finally {
    client.release();
    process.exit();
  }
};

fixDb();