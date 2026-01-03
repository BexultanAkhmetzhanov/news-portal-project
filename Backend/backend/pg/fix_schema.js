const db = require('./db');

const fixSchema = async () => {
  console.log('Начинаем проверку и исправление схемы БД...');
  
  try {
    const client = await db.connect();
    
    // 1. Проверяем, существует ли колонка "createdAt" (правильная)
    try {
      await client.query('SELECT "createdAt" FROM news LIMIT 1');
      console.log('✅ Колонка "createdAt" уже существует. Исправление не требуется.');
    } catch (e) {
      console.log('❌ Колонка "createdAt" не найдена. Пробуем найти старые варианты...');
      
      // 2. Проверяем created_at (стандартный SQL)
      try {
        await client.query('SELECT created_at FROM news LIMIT 1');
        console.log('⚠️ Найдена колонка created_at. Переименовываем в "createdAt"...');
        await client.query('ALTER TABLE news RENAME COLUMN created_at TO "createdAt"');
        console.log('✅ Успешно переименовано!');
      } catch (e2) {
        // 3. Проверяем createdat (Postgres lowercase default)
        try {
          await client.query('SELECT createdat FROM news LIMIT 1');
          console.log('⚠️ Найдена колонка createdat. Переименовываем в "createdAt"...');
          await client.query('ALTER TABLE news RENAME COLUMN createdat TO "createdAt"');
          console.log('✅ Успешно переименовано!');
        } catch (e3) {
           console.error('❌ Не удалось найти колонку даты (ни "createdAt", ни created_at, ни createdat). Проверьте структуру БД вручную.');
        }
      }
    }
    
    // 4. Дополнительная проверка search_vector (бывает, что его нет)
    try {
      await client.query('SELECT search_vector FROM news LIMIT 1');
    } catch(e) {
      console.log('⚠️ search_vector отсутствует. Добавляем...');
      await client.query(`
        ALTER TABLE news ADD COLUMN IF NOT EXISTS search_vector tsvector 
        GENERATED ALWAYS AS (to_tsvector('russian', lower(title) || ' ' || lower(content))) STORED;
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_news_search ON news USING GIN(search_vector);`);
      console.log('✅ search_vector добавлен.');
    }

    client.release();
  } catch (err) {
    console.error('Критическая ошибка при подключении:', err);
  } finally {
    console.log('Готово. Перезапустите сервер.');
    process.exit();
  }
};

fixSchema();